// Deterministic guardrails over the planner's proposal. The planner (an LLM)
// proposes structure and models; this module validates the tree, enforces the
// hierarchy and model policy, estimates cost, and fits the plan into the budget.
// No tokens are spent here, so every rule is cheap to apply and easy to test.

import { EFFORTS, MODELS, modelAtTier, type Effort, type ModelKey } from "./models.js";
import type { Plan, PlanNode } from "./plan-schema.js";

export const LIMITS = {
  maxDepth: 2, // root(0) -> subagent(1) -> sub-subagent(2)
  maxChildren: 6,
  maxNodes: 20,
  minOutputTokens: 200,
  maxOutputTokens: 32_000,
};

export type Level = "agent" | "subagent" | "sub-subagent";
const LEVELS: Level[] = ["agent", "subagent", "sub-subagent"];

export interface RoutingOptions {
  allowFable: boolean;
  budgetUsd: number;
}

export interface RoutedNode extends PlanNode {
  depth: number;
  level: Level;
  children: string[];
  model: ModelKey;
  effort: Effort | null;
  estCostUsd: number;
  notes: string[];
}

export interface RoutedPlan {
  plan: Plan;
  nodes: RoutedNode[];
  estTotalUsd: number;
  overBudget: boolean;
  warnings: string[];
}

/** Structural problems the planner must fix. Empty array = valid. */
export function validatePlan(plan: Plan): string[] {
  const errors: string[] = [];
  const byId = new Map<string, PlanNode>();
  for (const n of plan.nodes) {
    if (byId.has(n.id)) errors.push(`duplicate node id "${n.id}"`);
    byId.set(n.id, n);
  }
  const roots = plan.nodes.filter((n) => n.parentId === null);
  if (roots.length !== 1) errors.push(`expected exactly one root node (parentId null), found ${roots.length}`);
  if (plan.nodes.length > LIMITS.maxNodes) errors.push(`too many nodes: ${plan.nodes.length} > ${LIMITS.maxNodes}`);

  const childCount = new Map<string, number>();
  for (const n of plan.nodes) {
    if (n.parentId !== null) {
      if (!byId.has(n.parentId)) errors.push(`node "${n.id}" has unknown parent "${n.parentId}"`);
      childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1);
    }
    for (const d of n.dependsOn) {
      if (!byId.has(d)) errors.push(`node "${n.id}" depends on unknown node "${d}"`);
      if (d === n.id) errors.push(`node "${n.id}" depends on itself`);
    }
  }
  for (const [id, c] of childCount) {
    if (c > LIMITS.maxChildren) errors.push(`node "${id}" has ${c} children > ${LIMITS.maxChildren}`);
  }
  if (errors.length) return errors;

  for (const n of plan.nodes) {
    const d = depthOf(n.id, byId);
    if (d === -1) errors.push(`node "${n.id}" is in a parent cycle`);
    else if (d > LIMITS.maxDepth) errors.push(`node "${n.id}" is at depth ${d}; max depth is ${LIMITS.maxDepth} (agent > subagent > sub-subagent)`);
  }
  if (errors.length) return errors;

  // A node waits for its children and its dependencies; that graph must be acyclic.
  const cycle = findWaitCycle(plan.nodes);
  if (cycle) errors.push(`dependency cycle (would deadlock): ${cycle.join(" -> ")}`);
  return errors;
}

function depthOf(id: string, byId: Map<string, PlanNode>): number {
  let depth = 0;
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && cur.parentId !== null) {
    if (seen.has(cur.id)) return -1;
    seen.add(cur.id);
    cur = byId.get(cur.parentId);
    depth++;
  }
  return depth;
}

export function waitsFor(nodes: PlanNode[]): Map<string, string[]> {
  const waits = new Map<string, string[]>(nodes.map((n) => [n.id, [...n.dependsOn]]));
  for (const n of nodes) if (n.parentId !== null) waits.get(n.parentId)!.push(n.id);
  return waits;
}

function findWaitCycle(nodes: PlanNode[]): string[] | null {
  const waits = waitsFor(nodes);
  const state = new Map<string, 1 | 2>(); // 1 = on stack, 2 = done
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const w of waits.get(id) ?? []) {
      const c = visit(w);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const n of nodes) {
    const c = visit(n.id);
    if (c) return c;
  }
  return null;
}

/** Tier the policy considers right for this node, before the planner's opinion. */
export function policyTier(n: PlanNode, opts: RoutingOptions): number {
  const c = clampInt(n.complexity, 1, 5);
  let tier = c <= 1 ? 0 : c <= 3 ? 1 : 2;
  if (n.kind === "extraction") tier = Math.min(tier, 1);
  if (n.criticality === "high" && c >= 3) tier = Math.max(tier, 2);
  if ((n.kind === "proof" || n.kind === "synthesis") && c >= 4) tier = Math.max(tier, 2);
  if (opts.allowFable && c === 5 && n.criticality === "high") tier = 3;
  return floorTier(n, tier, opts);
}

/** Hard floors/ceilings no one can override. */
function floorTier(n: PlanNode, tier: number, opts: RoutingOptions): number {
  let t = tier;
  if (n.needsResearch) t = Math.max(t, MODELS.sonnet.tier); // web tools need Sonnet 5+
  if (!opts.allowFable) t = Math.min(t, MODELS.opus.tier);
  return t;
}

/** How far below policy a node may go. High-criticality nodes keep the policy model:
 *  an error there costs more than the tokens saved. */
function slackBelow(n: PlanNode): number {
  return n.criticality === "high" ? 0 : 1;
}

export function effortFor(n: PlanNode, model: ModelKey): Effort | null {
  if (!MODELS[model].effort) return null;
  const c = clampInt(n.complexity, 1, 5);
  let idx = c <= 2 ? 0 : c === 3 ? 1 : c === 4 ? 2 : 3;
  if (n.criticality === "high") idx++;
  if (n.criticality === "low") idx--;
  return EFFORTS[clampInt(idx, 0, 3)]; // cap at xhigh; "max" only by explicit override
}

// Rough multiplier for thinking tokens on top of visible output, per effort.
const THINKING_FACTOR: Record<Effort, number> = { low: 1.2, medium: 1.6, high: 2.2, xhigh: 3, max: 4 };
const BASE_INPUT_TOKENS = 1_500;
const RESEARCH_INPUT_TOKENS = 20_000;

export function estimateNodeCost(n: RoutedNode, byId: Map<string, RoutedNode>): number {
  const m = MODELS[n.model];
  const upstream = [...n.dependsOn, ...n.children].reduce((s, id) => s + (byId.get(id)?.estimatedOutputTokens ?? 0), 0);
  const input = BASE_INPUT_TOKENS + Math.ceil(n.goal.length / 4) + upstream + (n.needsResearch ? RESEARCH_INPUT_TOKENS : 0);
  const output = n.estimatedOutputTokens * (n.effort ? THINKING_FACTOR[n.effort] : 1);
  return (input * m.inputPerMTok + output * m.outputPerMTok) / 1_000_000;
}

/** Validate first; routePlan assumes a structurally valid plan. */
export function routePlan(plan: Plan, opts: RoutingOptions): RoutedPlan {
  const warnings: string[] = [];
  const byIdRaw = new Map(plan.nodes.map((n) => [n.id, n]));
  const nodes: RoutedNode[] = plan.nodes.map((n) => {
    const depth = depthOf(n.id, byIdRaw);
    const policy = policyTier(n, opts);
    const suggested = MODELS[n.suggestedModel].tier;
    // Trust the planner within one tier of policy (never below it for high-criticality nodes).
    const tier = floorTier(n, clampInt(suggested, policy - slackBelow(n), policy + 1), opts);
    const notes: string[] = [];
    if (tier !== suggested) notes.push(`planner suggested ${n.suggestedModel}, policy chose ${modelAtTier(tier)}`);
    const est = clampInt(n.estimatedOutputTokens, LIMITS.minOutputTokens, LIMITS.maxOutputTokens);
    return {
      ...n,
      estimatedOutputTokens: est,
      depth,
      level: LEVELS[depth],
      children: plan.nodes.filter((c) => c.parentId === n.id).map((c) => c.id),
      model: modelAtTier(tier),
      effort: null,
      estCostUsd: 0,
      notes,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // A supervisor must be able to judge its workers: tier >= max child tier (capped at Opus,
  // so one Fable leaf does not drag the whole chain up to the most expensive model).
  for (const n of [...nodes].sort((a, b) => b.depth - a.depth)) {
    if (!n.children.length) continue;
    const need = Math.min(MODELS.opus.tier, Math.max(...n.children.map((id) => MODELS[byId.get(id)!.model].tier)));
    if (MODELS[n.model].tier < need) {
      n.notes.push(`raised ${n.model} -> ${modelAtTier(need)} to supervise its subagents`);
      n.model = modelAtTier(need);
    }
  }

  const refresh = () => {
    for (const n of nodes) n.effort = effortFor(n, n.model);
    for (const n of nodes) n.estCostUsd = estimateNodeCost(n, byId);
    return nodes.reduce((s, n) => s + n.estCostUsd, 0);
  };
  let total = refresh();

  // Over budget: downgrade one tier at a time, least critical and most expensive first,
  // never below the hard floor or the policy slack (see slackBelow),
  // never below a supervised child.
  const critRank = { low: 0, medium: 1, high: 2 } as const;
  while (total > opts.budgetUsd) {
    const candidates = nodes
      .filter((n) => {
        const tier = MODELS[n.model].tier;
        const min = Math.max(floorTier(n, 0, opts), policyTier(n, opts) - slackBelow(n));
        const childMax = Math.max(-1, ...n.children.map((id) => MODELS[byId.get(id)!.model].tier));
        return tier - 1 >= min && tier - 1 >= Math.min(childMax, MODELS.opus.tier);
      })
      .sort((a, b) => critRank[a.criticality] - critRank[b.criticality] || b.estCostUsd - a.estCostUsd);
    const pick = candidates[0];
    if (!pick) break;
    const to = modelAtTier(MODELS[pick.model].tier - 1);
    pick.notes.push(`downgraded ${pick.model} -> ${to} to fit budget`);
    pick.model = to;
    total = refresh();
  }
  const overBudget = total > opts.budgetUsd;
  if (overBudget) warnings.push(`estimated $${total.toFixed(2)} exceeds budget $${opts.budgetUsd.toFixed(2)} even after downgrades`);

  return { plan, nodes, estTotalUsd: total, overBudget, warnings };
}

function clampInt(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}
