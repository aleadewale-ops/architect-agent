import type { Plan, PlanNode } from "../src/plan-schema.js";

export function node(id: string, parentId: string | null, over: Partial<PlanNode> = {}): PlanNode {
  return {
    id,
    parentId,
    title: id,
    goal: `do ${id}`,
    kind: "analysis",
    complexity: 3,
    criticality: "medium",
    needsResearch: false,
    knowledgeDomains: ["math"],
    suggestedModel: "sonnet",
    rationale: "",
    dependsOn: [],
    acceptanceCriteria: ["ok"],
    estimatedOutputTokens: 1000,
    suggestedSkills: [],
    ...over,
  };
}

export function plan(nodes: PlanNode[]): Plan {
  return { summary: "s", assumptions: [], nodes, risks: [], followUpTasks: [] };
}
