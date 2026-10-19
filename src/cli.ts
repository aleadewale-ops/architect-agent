#!/usr/bin/env -S npx tsx
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { executePlan } from "./executor.js";
import { SOURCES } from "./knowledge.js";
import { Ledger } from "./ledger.js";
import { callText } from "./llm.js";
import { EFFORTS, MODELS, TIER_ORDER, type Effort, type ModelKey } from "./models.js";
import { makePlan, type PlannerOptions } from "./planner.js";
import { DISCOVER_SYSTEM } from "./prompts.js";
import { renderLedger, renderPlanTree, renderReport } from "./report.js";
import { matchSkills } from "./skills.js";
import { TaskStore } from "./tasks.js";
import { createWorker, type VerifyMode } from "./worker.js";

const STATE_DIR = ".architect";
const tasks = new TaskStore(join(STATE_DIR, "tasks.json"));

const HELP = `architect - hierarchical orchestrator of Claude agents

Usage:
  architect plan "<task>"          make a plan and a cost estimate (cheap, no execution)
  architect run "<task>"           plan + execution + review + report
  architect tasks                  list open tasks
  architect tasks add "<task>"     add a task
  architect tasks done <id>        mark as done
  architect tasks run <id>         run a task from the list
  architect skills "<query>"       suggest skills/tools (local, 0 tokens)
      --discover                   + find new ones on GitHub (model + web search)
  architect sources                knowledge sources
  architect models                 models and prices

Options:
  --budget <USD>        execution budget (default 3)
  --allow-fable         allow claude-fable-5-1 for the hardest nodes
  --planner <model>     planner model: opus (default) or fable
  --planner-effort <e>  low|medium|high|xhigh|max (default high)
  --verify <mode>       auto (default) | all | none
  --concurrency <n>     parallel nodes (default 3)
  --lang <language>     language of the result (default $ARCHITECT_LANG or English)
  --yes                 do not ask for confirmation before execution
  --force               run even if the estimate exceeds the budget`;

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    budget: { type: "string", default: "3" },
    "allow-fable": { type: "boolean", default: false },
    planner: { type: "string", default: "opus" },
    "planner-effort": { type: "string", default: "high" },
    verify: { type: "string", default: "auto" },
    concurrency: { type: "string", default: "3" },
    lang: { type: "string", default: process.env.ARCHITECT_LANG || "English" },
    yes: { type: "boolean", default: false },
    force: { type: "boolean", default: false },
    discover: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

function oneOf<T extends string>(value: string, allowed: readonly T[], name: string): T {
  if (!(allowed as readonly string[]).includes(value)) throw new Error(`--${name} mora biti ena od: ${allowed.join(", ")}`);
  return value as T;
}

function plannerOptions(): PlannerOptions {
  const budgetUsd = Number(flags.budget);
  if (!(budgetUsd > 0)) throw new Error("--budget must be a positive number");
  return {
    budgetUsd,
    allowFable: flags["allow-fable"],
    plannerModel: oneOf<ModelKey>(flags.planner, ["opus", "fable"], "planner"),
    plannerEffort: oneOf<Effort>(flags["planner-effort"], EFFORTS, "planner-effort"),
    lang: flags.lang,
    backlog: tasks.open().map((t) => t.title),
  };
}

async function confirm(question: string): Promise<boolean> {
  if (flags.yes) return true;
  if (!process.stdin.isTTY) throw new Error("ni interaktivnega terminala: dodaj --yes za izvedbo brez potrditve");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [d/N] `);
  rl.close();
  return /^(d|da|y|yes)$/i.test(answer.trim());
}

async function planOnly(task: string): Promise<void> {
  const ledger = new Ledger();
  const rp = await makePlan(task, plannerOptions(), ledger);
  console.log(renderPlanTree(rp));
  console.log(`\nPlaniranje je stalo $${ledger.totalUsd.toFixed(4)}.`);
}

async function run(task: string, taskId?: number): Promise<void> {
  const opts = plannerOptions();
  const ledger = new Ledger();
  console.log("Planiram ...");
  const rp = await makePlan(task, opts, ledger);
  console.log(`${renderPlanTree(rp)}\n\nPlaniranje: $${ledger.totalUsd.toFixed(4)}`);
  if (rp.overBudget && !flags.force) {
    console.log("The estimate exceeds the budget. Raise --budget or add --force.");
    return;
  }
  if (!(await confirm("Izvedem plan?"))) return;

  const worker = createWorker(ledger, {
    mission: task,
    lang: opts.lang,
    verify: oneOf<VerifyMode>(flags.verify, ["auto", "all", "none"], "verify"),
    allowFable: opts.allowFable,
  });
  const exec = await executePlan(rp.nodes, worker, {
    concurrency: Math.max(1, Number(flags.concurrency) || 3),
    onEvent: (e) => {
      const tag = { start: "▶", done: "✓", failed: "✗", skipped: "⏭" }[e.type];
      const extra = e.type === "done" && e.result ? ` (${e.result.model}${e.result.verified === false ? ", ni prestalo pregleda" : ""})` : e.type === "failed" ? `: ${e.error instanceof Error ? e.error.message : String(e.error)}` : "";
      console.log(`${tag} ${e.node.id} [${e.node.level}, ${e.node.model}]${extra}`);
    },
  });

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(STATE_DIR, "runs", runId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "report.md"), renderReport(task, rp, exec, ledger));
  writeFileSync(join(dir, "plan.json"), `${JSON.stringify(rp, null, 2)}\n`);

  for (const t of rp.plan.followUpTasks) tasks.add(t, "planner");
  if (taskId !== undefined) tasks.update(taskId, { lastRun: runId });

  const root = rp.nodes.find((n) => n.parentId === null)!;
  const final = exec.results.get(root.id);
  console.log(`\n${final ? final.output : "No final result (see the report)."}`);
  console.log(`\n${renderLedger(ledger)}`);
  console.log(`\nReport: ${join(dir, "report.md")}`);
  if (rp.plan.followUpTasks.length) console.log(`V seznam nalog dodanih predlogov: ${rp.plan.followUpTasks.length} (architect tasks)`);
}

async function tasksCmd(args: string[]): Promise<void> {
  const [sub = "list", arg] = args;
  if (sub === "list") {
    const open = tasks.open();
    if (!open.length) return console.log("Ni odprtih nalog. Dodaj: architect tasks add \"...\"");
    for (const t of open) console.log(`#${t.id} ${t.title}${t.source === "planner" ? "  (predlog planerja)" : ""}${t.lastRun ? `  [zadnji zagon ${t.lastRun}]` : ""}`);
    return;
  }
  if (sub === "add") {
    if (!arg) throw new Error("manjka besedilo naloge");
    const t = tasks.add(arg, "user");
    const skills = matchSkills(arg, 3);
    console.log(`Dodana naloga #${t.id}.${skills.length ? ` Predlagani skilli: ${skills.map((s) => s.name).join(", ")}` : ""}`);
    return;
  }
  const id = Number(arg);
  if (!Number.isInteger(id)) throw new Error("manjka id naloge");
  if (sub === "done") return void console.log(`Opravljeno: #${tasks.update(id, { status: "done" }).id}`);
  if (sub === "run") return run(tasks.get(id).title, id);
  throw new Error(`neznan ukaz: tasks ${sub}`);
}

async function skillsCmd(query: string): Promise<void> {
  const local = matchSkills(query);
  console.log(local.length ? local.map((s) => `- ${s.name} [${s.kind}] ${s.url}\n  ${s.description}`).join("\n") : "V katalogu ni ujemanj.");
  if (!flags.discover) return;
  const ledger = new Ledger();
  console.log("\nSearching GitHub ...");
  const res = await callText(
    { model: "sonnet", effort: "medium", system: DISCOVER_SYSTEM, user: `Task: ${query}\nAnswer in ${flags.lang}.`, maxTokens: 16_000, research: { hosts: ["github.com"], maxUses: 5 } },
    ledger,
    "discover",
    "discover",
  );
  console.log(`${res.text}\n\n(cost: $${ledger.totalUsd.toFixed(4)})`);
}

async function main(): Promise<void> {
  const [cmd, ...rest] = positionals;
  if (flags.help || !cmd) return console.log(HELP);
  const text = rest.join(" ").trim();
  switch (cmd) {
    case "plan":
      if (!text) throw new Error("manjka naloga");
      return planOnly(text);
    case "run":
      if (!text) throw new Error("manjka naloga");
      return run(text);
    case "tasks":
      return tasksCmd(rest);
    case "skills":
      if (!text) throw new Error("manjka poizvedba");
      return skillsCmd(text);
    case "sources":
      return console.log(SOURCES.map((s) => `- ${s.name} [${s.domains.join("/")}] ${s.url}\n  ${s.use}`).join("\n"));
    case "models":
      return console.log(TIER_ORDER.map((k) => `- ${k}: ${MODELS[k].id} ($${MODELS[k].inputPerMTok}/$${MODELS[k].outputPerMTok} na MTok) - ${MODELS[k].strengths}`).join("\n"));
    default:
      throw new Error(`neznan ukaz "${cmd}" (architect --help)`);
  }
}

main().catch((e: unknown) => {
  if (e instanceof Anthropic.AuthenticationError) console.error("Error: missing or invalid API key. Set ANTHROPIC_API_KEY.");
  else if (e instanceof Anthropic.RateLimitError) console.error("Napaka: omejitev hitrosti API-ja, poskusi kasneje.");
  else if (e instanceof Anthropic.APIError) console.error(`Napaka API ${e.status}: ${e.message}`);
  else console.error(`Napaka: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
});
