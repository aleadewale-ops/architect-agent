// Deterministic helpers for subscription mode (the /architect skill). No model
// calls, no API key: they validate and route the planner's plan, and assemble
// the final report from the files the subagents wrote.
//
//   tsx src/run-tools.ts init "<task>" [--file <path>]   -> creates a run dir, prints its path
//   tsx src/run-tools.ts route <runDir> [--allow-fable] [--budget <usd>]
//   tsx src/run-tools.ts report <runDir>

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { agentFor, escalationAgentFor, reviewerFor } from "./agents.js";
import { PlanSchema } from "./plan-schema.js";
import { renderPlanTree } from "./report.js";
import { routePlan, validatePlan, waitsFor, type RoutedNode } from "./router.js";
import { TaskStore } from "./tasks.js";
import { shouldVerify, type VerifyMode } from "./worker.js";

const STATE_DIR = ".architect";

export interface DispatchNode {
  id: string;
  title: string;
  level: RoutedNode["level"];
  agent: string;
  model: string;
  effort: string | null;
  review: boolean;
  reviewer: string;
  escalateTo: string;
  waitsFor: string[];
  output: string;
}

export interface Dispatch {
  task: string;
  waves: string[][];
  nodes: DispatchNode[];
}

/** Groups nodes into waves: each wave only needs outputs from earlier waves. */
export function computeWaves(nodes: RoutedNode[]): string[][] {
  const waits = waitsFor(nodes);
  const done = new Set<string>();
  const waves: string[][] = [];
  while (done.size < nodes.length) {
    const wave = nodes.filter((n) => !done.has(n.id) && waits.get(n.id)!.every((w) => done.has(w))).map((n) => n.id);
    if (!wave.length) throw new Error("dependency cycle");
    wave.forEach((id) => done.add(id));
    waves.push(wave);
  }
  return waves;
}

export function buildDispatch(task: string, runDir: string, nodes: RoutedNode[], opts: { allowFable: boolean; verify: VerifyMode }): Dispatch {
  const waits = waitsFor(nodes);
  return {
    task,
    waves: computeWaves(nodes),
    nodes: nodes.map((n) => ({
      id: n.id,
      title: n.title,
      level: n.level,
      agent: agentFor(n.model, n.effort),
      model: n.model,
      effort: n.effort,
      review: shouldVerify(n, opts.verify),
      reviewer: reviewerFor(n),
      escalateTo: escalationAgentFor(n, opts.allowFable),
      waitsFor: waits.get(n.id)!,
      output: join(runDir, `${n.id}.md`),
    })),
  };
}

function init(task: string, file: string | undefined): void {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  const dir = join(STATE_DIR, "runs", stamp);
  mkdirSync(dir, { recursive: true });
  const fileNote = file ? `\n\n## Attached file\n\n${file}\n` : "";
  writeFileSync(join(dir, "task.md"), `# Naloga\n\n${task}${fileNote}`);
  const backlog = new TaskStore(join(STATE_DIR, "tasks.json")).open();
  if (backlog.length) writeFileSync(join(dir, "backlog.md"), backlog.map((t) => `- ${t.title}`).join("\n") + "\n");
  console.log(dir);
}

function route(runDir: string, allowFable: boolean, budgetUsd: number, verify: VerifyMode): void {
  const raw = JSON.parse(readFileSync(join(runDir, "plan.json"), "utf8"));
  const parsed = PlanSchema.safeParse(raw);
  if (!parsed.success) {
    console.log(`PLAN INVALID\n${parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")}`);
    process.exitCode = 2;
    return;
  }
  const errors = validatePlan(parsed.data);
  if (errors.length) {
    console.log(`PLAN INVALID\n${errors.map((e) => `- ${e}`).join("\n")}`);
    process.exitCode = 2;
    return;
  }
  const rp = routePlan(parsed.data, { allowFable, budgetUsd });
  const task = readFileSync(join(runDir, "task.md"), "utf8");
  const dispatch = buildDispatch(task, runDir, rp.nodes, { allowFable, verify });
  writeFileSync(join(runDir, "routed.json"), `${JSON.stringify(rp, null, 2)}\n`);
  writeFileSync(join(runDir, "dispatch.json"), `${JSON.stringify(dispatch, null, 2)}\n`);

  console.log(renderPlanTree(rp).replace(/Estimated execution cost: ~\$([\d.]+) \(without reviews; rough estimate\)/, "Relative weight (API-price equivalent you do NOT pay - subscription): ~$$$1"));
  console.log("\nExecution in waves:");
  dispatch.waves.forEach((w, i) => console.log(`  wave ${i + 1}: ${w.map((id) => `${id}→${dispatch.nodes.find((n) => n.id === id)!.agent}`).join(", ")}`));
}

interface ReviewInfo {
  verdict: "PASS" | "FAIL" | null;
  attempt: number;
  issues: string[];
}

export function parseReview(text: string): ReviewInfo {
  const verdict = /VERDICT:\s*(PASS|FAIL)/i.exec(text)?.[1]?.toUpperCase() as ReviewInfo["verdict"] | undefined;
  const attempt = Number(/ATTEMPT:\s*(\d+)/i.exec(text)?.[1] ?? 1);
  const issues = text.split("\n").filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, "").trim());
  return { verdict: verdict ?? null, attempt, issues };
}

function report(runDir: string): void {
  const rp = JSON.parse(readFileSync(join(runDir, "routed.json"), "utf8")) as ReturnType<typeof routePlan>;
  const dispatch = JSON.parse(readFileSync(join(runDir, "dispatch.json"), "utf8")) as Dispatch;
  const read = (p: string) => (existsSync(p) ? readFileSync(p, "utf8").trim() : null);
  const root = rp.nodes.find((n) => n.parentId === null)!;
  const rootOut = read(join(runDir, `${root.id}.md`));

  const rows = dispatch.nodes.map((d) => {
    const out = read(d.output);
    const rev = read(join(runDir, `${d.id}.review.md`));
    const info = rev ? parseReview(rev) : null;
    const status = !out ? "✗ ni izhoda" : info?.verdict === "PASS" ? "✅ preverjeno" : info?.verdict === "FAIL" ? "⚠ ni prestalo pregleda" : "— brez pregleda";
    return { d, out, info, status };
  });

  const parts = [
    read(join(runDir, "task.md")) ?? "# Naloga",
    `## Result\n\n${rootOut ?? "_The root node produced no output._"}`,
    `## Plan\n\n\`\`\`\n${renderPlanTree(rp)}\n\`\`\``,
    `## Nodes\n\n| node | level | agent | attempts | status |\n|---|---|---|---|---|\n${rows.map((r) => `| ${r.d.id} | ${r.d.level} | ${r.d.agent} | ${r.info?.attempt ?? (r.out ? 1 : 0)} | ${r.status} |`).join("\n")}`,
  ];
  for (const r of rows.filter((x) => x.info?.issues.length)) {
    parts.push(`### Opombe pregledovalca: ${r.d.id}\n\n${r.info!.issues.map((i) => `- ${i}`).join("\n")}`);
  }
  if (rp.plan.followUpTasks.length) parts.push(`## Predlagane nadaljnje naloge\n\n${rp.plan.followUpTasks.map((t) => `- ${t}`).join("\n")}`);
  writeFileSync(join(runDir, "report.md"), `${parts.join("\n\n")}\n`);

  const tasks = new TaskStore(join(STATE_DIR, "tasks.json"));
  for (const t of rp.plan.followUpTasks) tasks.add(t, "planner");

  const failed = rows.filter((r) => !r.out).map((r) => r.d.id);
  const unverified = rows.filter((r) => r.info?.verdict === "FAIL").map((r) => r.d.id);
  console.log(`Report: ${join(runDir, "report.md")}`);
  console.log(`Nodes: ${rows.length}, without output: ${failed.length ? failed.join(", ") : "0"}, failed review: ${unverified.length ? unverified.join(", ") : "0"}`);
  console.log(`Predlogi dodani v seznam nalog: ${rp.plan.followUpTasks.length}`);
}

function main(): void {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "allow-fable": { type: "boolean", default: false },
      budget: { type: "string" },
      verify: { type: "string", default: "auto" },
      file: { type: "string" },
    },
  });
  const [cmd, arg] = positionals;
  if (!cmd || !arg) throw new Error("uporaba: run-tools init \"<naloga>\" | route <runDir> | report <runDir>");
  const verify = values.verify as VerifyMode;
  if (!["auto", "all", "none"].includes(verify)) throw new Error("--verify: auto|all|none");
  if (cmd === "init") return init(positionals.slice(1).join(" "), values.file);
  if (cmd === "route") return route(arg, values["allow-fable"], values.budget ? Number(values.budget) : Number.POSITIVE_INFINITY, verify);
  if (cmd === "report") return report(arg);
  throw new Error(`neznan ukaz: ${cmd}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (e) {
    console.error(`Napaka: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
