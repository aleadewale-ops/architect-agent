import { z } from "zod";

// The planner returns a flat list of nodes linked by parentId; depth decides the
// role (0 = lead agent, 1 = subagent, 2 = sub-subagent). Flat keeps the schema
// non-recursive, which structured outputs handle reliably.

export const NODE_KINDS = [
  "research", // find and read sources
  "proof", // mathematical argument, derivation
  "computation", // calculation, enumeration, checking small cases
  "design", // architectural or system design
  "analysis", // critique, comparison, evaluation
  "writing", // drafting prose
  "extraction", // pull structured facts from given text
  "synthesis", // merge subagent outputs into one result
] as const;

export const KNOWLEDGE_DOMAINS = ["math", "architecture", "general"] as const;

export const PlanNodeSchema = z.object({
  id: z.string().describe("Short unique id, e.g. 'root', 'lit-review', 'proof-lemma2'"),
  parentId: z.string().nullable().describe("Supervisor node id; null only for the single root node"),
  title: z.string(),
  goal: z.string().describe("Self-contained instruction for the agent doing this node"),
  kind: z.enum(NODE_KINDS),
  complexity: z.number().int().describe("1 trivial .. 5 frontier-hard"),
  criticality: z.enum(["low", "medium", "high"]).describe("Cost of an error in this node for the final result"),
  needsResearch: z.boolean().describe("True if the node must search/read external sources"),
  knowledgeDomains: z.array(z.enum(KNOWLEDGE_DOMAINS)),
  suggestedModel: z.enum(["haiku", "sonnet", "opus", "fable"]),
  rationale: z.string().describe("One sentence: why this node exists and why this model"),
  dependsOn: z.array(z.string()).describe("Ids of sibling/other nodes whose output this node needs (not its own children)"),
  acceptanceCriteria: z.array(z.string()).describe("2-4 concrete, checkable criteria"),
  estimatedOutputTokens: z.number().int().describe("Expected length of this node's answer"),
  suggestedSkills: z.array(z.string()).describe("Names from the skills catalog, may be empty"),
});

export const PlanSchema = z.object({
  summary: z.string().describe("Two or three sentences: the strategy"),
  assumptions: z.array(z.string()),
  nodes: z.array(PlanNodeSchema),
  risks: z.array(z.string()).describe("Where errors are most likely and how the plan guards against them"),
  followUpTasks: z.array(z.string()).describe("Valuable next tasks outside this task's scope"),
});

export type PlanNode = z.infer<typeof PlanNodeSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type NodeKind = (typeof NODE_KINDS)[number];
export type KnowledgeDomain = (typeof KNOWLEDGE_DOMAINS)[number];
