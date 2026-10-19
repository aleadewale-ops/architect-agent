// The real node runner: executes one node on its assigned model, has it reviewed
// when the node is risky, and escalates to a stronger model once on failure.
// Start cheap, verify where errors matter, pay for more only when needed.

import { z } from "zod";
import type { NodeInputs, NodeResult, NodeRunner } from "./executor.js";
import { allowedHosts, sourcesFor } from "./knowledge.js";
import type { Ledger } from "./ledger.js";
import { callStructured, callText } from "./llm.js";
import { MODELS, modelAtTier, type Effort, type ModelKey } from "./models.js";
import { VERIFIER_SYSTEM, WORKER_SYSTEM } from "./prompts.js";
import type { RoutedNode } from "./router.js";
import { findSkill } from "./skills.js";

export type VerifyMode = "auto" | "all" | "none";

export interface WorkerOptions {
  mission: string;
  lang: string;
  verify: VerifyMode;
  allowFable: boolean;
}

const VerdictSchema = z.object({
  pass: z.boolean(),
  issues: z.array(z.string()),
});

export function shouldVerify(n: RoutedNode, mode: VerifyMode): boolean {
  if (mode === "none") return false;
  if (mode === "all") return true;
  return n.depth === 0 || n.criticality === "high" || n.complexity >= 4;
}

/** Reviewer is Sonnet at low effort, or Opus for nodes that already run on Opus or above. */
export function verifierFor(n: RoutedNode): { model: ModelKey; effort: Effort } {
  return MODELS[n.model].tier >= MODELS.opus.tier ? { model: "opus", effort: "medium" } : { model: "sonnet", effort: "low" };
}

export function escalationTarget(model: ModelKey, allowFable: boolean): ModelKey {
  const top = allowFable ? MODELS.fable.tier : MODELS.opus.tier;
  return modelAtTier(Math.min(top, MODELS[model].tier + 1));
}

export function maxTokensFor(n: RoutedNode): number {
  // max_tokens covers thinking as well as the visible answer.
  return Math.min(64_000, Math.max(8_000, n.estimatedOutputTokens * 6));
}

export function nodeMessage(n: RoutedNode, inputs: NodeInputs, opts: WorkerOptions, feedback?: { previous: string; issues: string[] }): string {
  const parts: string[] = [
    `<mission>\n${opts.mission}\n</mission>`,
    `<your_node id="${n.id}" role="${n.level}" kind="${n.kind}">\n<title>${n.title}</title>\n<goal>\n${n.goal}\n</goal>\n<acceptance_criteria>\n${n.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}\n</acceptance_criteria>\n</your_node>`,
  ];
  for (const d of inputs.dependencies) {
    parts.push(`<input_from_dependency id="${d.node.id}" title="${d.node.title}">\n${d.result.output}\n</input_from_dependency>`);
  }
  for (const c of inputs.children) {
    const flag = c.result.verified === false ? ` reviewer_issues="${c.result.issues.join("; ").replaceAll('"', "'")}"` : "";
    parts.push(`<output_from_subagent id="${c.node.id}" title="${c.node.title}"${flag}>\n${c.result.output}\n</output_from_subagent>`);
  }
  const skills = n.suggestedSkills.map((s) => findSkill(s)).filter((s) => s !== undefined);
  if (skills.length) parts.push(`<recommended_tools>\n${skills.map((s) => `- ${s.name}: ${s.description} (${s.url})`).join("\n")}\n</recommended_tools>`);
  if (n.needsResearch) {
    parts.push(`<preferred_sources>\n${sourcesFor(n.knowledgeDomains).map((s) => `- ${s.name}: ${s.url}`).join("\n")}\n</preferred_sources>`);
  }
  if (n.children.length) parts.push("You supervise the subagents above: check their work, fix or flag errors, and integrate it into your result.");
  if (n.depth === 0) parts.push("Your output is the final deliverable of the whole mission.");
  if (feedback) {
    parts.push(`<previous_attempt>\n${feedback.previous}\n</previous_attempt>\n<reviewer_issues>\n${feedback.issues.map((i) => `- ${i}`).join("\n")}\n</reviewer_issues>\nProduce a corrected, complete answer that resolves every issue.`);
  }
  parts.push(`Target length: about ${n.estimatedOutputTokens} tokens. Language: ${opts.lang}.`);
  return parts.join("\n\n");
}

export function createWorker(ledger: Ledger, opts: WorkerOptions): NodeRunner {
  return async (n: RoutedNode, inputs: NodeInputs): Promise<NodeResult> => {
    let model = n.model;
    let effort = n.effort;
    let feedback: { previous: string; issues: string[] } | undefined;
    let last: NodeResult | undefined;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await callText(
        {
          model,
          effort,
          system: WORKER_SYSTEM,
          user: nodeMessage(n, inputs, opts, feedback),
          maxTokens: maxTokensFor(n),
          research: n.needsResearch ? { hosts: allowedHosts(n.knowledgeDomains), maxUses: 5 } : undefined,
        },
        ledger,
        `${n.id}#${attempt}`,
        "work",
      );
      const issues = res.truncated ? ["output was truncated at the token limit"] : [];
      last = { output: res.text, model: res.servedModel, attempts: attempt, verified: null, issues };

      if (!shouldVerify(n, opts.verify)) return last;
      const v = verifierFor(n);
      const verdict = await callStructured(
        {
          model: v.model,
          effort: v.effort,
          system: VERIFIER_SYSTEM,
          user: `<goal>\n${n.goal}\n</goal>\n<acceptance_criteria>\n${n.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}\n</acceptance_criteria>\n<output>\n${res.text}\n</output>`,
          maxTokens: 8_000,
        },
        VerdictSchema,
        ledger,
        `${n.id}#${attempt}:review`,
        "verify",
      );
      last = { ...last, verified: verdict.pass && !res.truncated, issues: [...issues, ...verdict.issues] };
      if (last.verified) return last;

      // Failed review: one retry with the reviewer's issues, on a stronger model if one is allowed.
      feedback = { previous: res.text, issues: last.issues };
      const next = escalationTarget(model, opts.allowFable);
      if (next !== model) {
        model = next;
        effort = MODELS[next].effort ? (effort ?? "high") : null;
      }
    }
    return last!;
  };
}
