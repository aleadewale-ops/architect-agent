// Maps routed (model, effort) pairs to Claude Code subagent definitions. In
// subscription mode every node runs as one of these subagents; the definitions
// in .claude/agents/ are generated from this table (npm run gen:claude).

import { MODELS, type Effort, type ModelKey } from "./models.js";
import type { RoutedNode } from "./router.js";

export interface AgentDef {
  name: string;
  model: ModelKey;
  effort: Effort | null;
  role: "planner" | "worker" | "reviewer";
}

export const WORKER_AGENTS: AgentDef[] = [
  { name: "architect-haiku", model: "haiku", effort: null, role: "worker" },
  { name: "architect-sonnet-low", model: "sonnet", effort: "low", role: "worker" },
  { name: "architect-sonnet", model: "sonnet", effort: "medium", role: "worker" },
  { name: "architect-sonnet-high", model: "sonnet", effort: "high", role: "worker" },
  { name: "architect-opus-medium", model: "opus", effort: "medium", role: "worker" },
  { name: "architect-opus", model: "opus", effort: "high", role: "worker" },
  { name: "architect-opus-deep", model: "opus", effort: "xhigh", role: "worker" },
  { name: "architect-fable", model: "fable", effort: "xhigh", role: "worker" },
];

export const PLANNER_AGENT: AgentDef = { name: "architect-planner", model: "opus", effort: "high", role: "planner" };
export const REVIEWER_AGENTS: AgentDef[] = [
  { name: "architect-reviewer", model: "sonnet", effort: "low", role: "reviewer" },
  { name: "architect-reviewer-strict", model: "opus", effort: "medium", role: "reviewer" },
];

const EFFORT_RANK: Record<Effort, number> = { low: 0, medium: 1, high: 2, xhigh: 3, max: 4 };

/** Worker agent for a model at the closest available effort. */
export function agentFor(model: ModelKey, effort: Effort | null): string {
  const candidates = WORKER_AGENTS.filter((a) => a.model === model);
  if (!effort || candidates.length === 1) return candidates[0].name;
  const want = EFFORT_RANK[effort];
  return candidates.reduce((best, a) =>
    Math.abs(EFFORT_RANK[a.effort!] - want) < Math.abs(EFFORT_RANK[best.effort!] - want) ? a : best,
  ).name;
}

/** Stricter (Opus) reviewer for nodes that already run on Opus or above. */
export function reviewerFor(n: RoutedNode): string {
  return MODELS[n.model].tier >= MODELS.opus.tier ? "architect-reviewer-strict" : "architect-reviewer";
}

/** Agent for the single retry after a failed review: one tier up if allowed, else deeper effort. */
export function escalationAgentFor(n: RoutedNode, allowFable: boolean): string {
  switch (n.model) {
    case "haiku":
      return "architect-sonnet";
    case "sonnet":
      return "architect-opus";
    case "opus":
      return allowFable ? "architect-fable" : "architect-opus-deep";
    case "fable":
      return "architect-fable";
  }
}
