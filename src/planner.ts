import type { Ledger } from "./ledger.js";
import { callStructured } from "./llm.js";
import type { Effort, ModelKey } from "./models.js";
import { PlanSchema } from "./plan-schema.js";
import { PLANNER_SYSTEM } from "./prompts.js";
import { routePlan, validatePlan, type RoutedPlan, type RoutingOptions } from "./router.js";

export interface PlannerOptions extends RoutingOptions {
  plannerModel: ModelKey;
  plannerEffort: Effort;
  lang: string;
  /** Open backlog items, so the planner does not duplicate them as follow-ups. */
  backlog: string[];
}

export async function makePlan(task: string, opts: PlannerOptions, ledger: Ledger): Promise<RoutedPlan> {
  const user = [
    `<task>\n${task}\n</task>`,
    `Budget for execution: $${opts.budgetUsd.toFixed(2)}. Fable allowed: ${opts.allowFable ? "yes" : "no"}.`,
    `Final deliverable language: ${opts.lang}.`,
    opts.backlog.length ? `<existing_backlog>\n${opts.backlog.map((t) => `- ${t}`).join("\n")}\n</existing_backlog>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  const spec = { model: opts.plannerModel, effort: opts.plannerEffort, system: PLANNER_SYSTEM, user, maxTokens: 16_000 };

  let plan = await callStructured(spec, PlanSchema, ledger, "planner", "plan");
  let errors = validatePlan(plan);
  if (errors.length) {
    // One repair round: show the invalid plan and the exact problems.
    const repairUser = `${user}\n\n<previous_plan>\n${JSON.stringify(plan)}\n</previous_plan>\n\nThat plan is structurally invalid. Return the full corrected plan. Problems:\n${errors.map((e) => `- ${e}`).join("\n")}`;
    plan = await callStructured({ ...spec, user: repairUser }, PlanSchema, ledger, "planner-repair", "plan");
    errors = validatePlan(plan);
    if (errors.length) throw new Error(`planner produced an invalid plan twice:\n${errors.join("\n")}`);
  }
  return routePlan(plan, opts);
}
