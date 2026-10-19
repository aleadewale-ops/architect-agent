import type { ExecutionResult } from "./executor.js";
import type { Ledger } from "./ledger.js";
import type { RoutedNode, RoutedPlan } from "./router.js";

function ordered(nodes: RoutedNode[]): RoutedNode[] {
  const out: RoutedNode[] = [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const walk = (n: RoutedNode) => {
    out.push(n);
    for (const c of n.children) walk(byId.get(c)!);
  };
  for (const r of nodes.filter((n) => n.parentId === null)) walk(r);
  return out;
}

export function renderPlanTree(rp: RoutedPlan): string {
  const lines = [`Strategija: ${rp.plan.summary}`, ""];
  for (const n of ordered(rp.nodes)) {
    const indent = "  ".repeat(n.depth);
    const deps = n.dependsOn.length ? ` ⟵ ${n.dependsOn.join(", ")}` : "";
    const research = n.needsResearch ? " 🔎" : "";
    lines.push(`${indent}${n.depth === 0 ? "◆" : "└"} [${n.level}] ${n.id}: ${n.title}${research}${deps}`);
    lines.push(`${indent}    ${n.model}${n.effort ? `/${n.effort}` : ""} · ${n.kind} · c${n.complexity} · ${n.criticality} · ~$${n.estCostUsd.toFixed(3)}`);
    for (const note of n.notes) lines.push(`${indent}    ↳ ${note}`);
    if (n.suggestedSkills.length) lines.push(`${indent}    skills: ${n.suggestedSkills.join(", ")}`);
  }
  lines.push("", `Estimated execution cost: ~$${rp.estTotalUsd.toFixed(2)} (without reviews; rough estimate)`);
  for (const w of rp.warnings) lines.push(`⚠ ${w}`);
  if (rp.plan.risks.length) lines.push("", "Tveganja:", ...rp.plan.risks.map((r) => `- ${r}`));
  return lines.join("\n");
}

export function renderLedger(ledger: Ledger): string {
  const rows = ledger.summary().map((r) => `| ${r.model} | ${r.calls} | ${r.input} | ${r.cacheRead} | ${r.output} | $${r.usd.toFixed(4)} |`);
  return ["| model | klici | vhod | cache read | izhod | USD |", "|---|---|---|---|---|---|", ...rows, `| **skupaj** | | | | | **$${ledger.totalUsd.toFixed(4)}** |`].join("\n");
}

export function renderReport(task: string, rp: RoutedPlan, exec: ExecutionResult, ledger: Ledger): string {
  const root = rp.nodes.find((n) => n.parentId === null)!;
  const final = exec.results.get(root.id);
  const parts = [
    `# Report\n\n**Task:** ${task}`,
    `## Result\n\n${final ? final.output : `_The root task was not completed (${exec.status.get(root.id)})._`}`,
    `## Plan\n\n\`\`\`\n${renderPlanTree(rp)}\n\`\`\``,
    `## Poraba\n\n${renderLedger(ledger)}`,
    "## Nodes",
  ];
  for (const n of ordered(rp.nodes)) {
    const r = exec.results.get(n.id);
    const status = exec.status.get(n.id);
    const review = r?.verified === true ? "✅ preverjeno" : r?.verified === false ? "⚠ ni prestalo pregleda" : "— brez pregleda";
    parts.push(`### ${n.id}: ${n.title}\n\n${status}${r ? ` · ${r.model} · poskusov: ${r.attempts} · ${review}` : ""}`);
    if (r?.issues.length) parts.push(`Opombe pregledovalca:\n${r.issues.map((i) => `- ${i}`).join("\n")}`);
    const err = exec.errors.get(n.id);
    if (err) parts.push(`Napaka: ${err instanceof Error ? err.message : String(err)}`);
    if (r && n.parentId !== null) parts.push(`<details><summary>Izhod</summary>\n\n${r.output}\n\n</details>`);
  }
  if (rp.plan.followUpTasks.length) parts.push(`## Predlagane nadaljnje naloge\n\n${rp.plan.followUpTasks.map((t) => `- ${t}`).join("\n")}`);
  return `${parts.join("\n\n")}\n`;
}
