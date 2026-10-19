import assert from "node:assert/strict";
import { test } from "node:test";
import { effortFor, policyTier, routePlan, validatePlan } from "../src/router.js";
import { node, plan } from "./helpers.js";

const opts = { allowFable: false, budgetUsd: 100 };

test("valid three-level plan passes validation", () => {
  const p = plan([node("root", null), node("a", "root"), node("a1", "a"), node("b", "root", { dependsOn: ["a"] })]);
  assert.deepEqual(validatePlan(p), []);
});

test("rejects missing root, depth > 2, unknown refs", () => {
  assert.match(validatePlan(plan([node("a", "b"), node("b", "a")])).join(), /exactly one root/);
  const deep = plan([node("r", null), node("a", "r"), node("b", "a"), node("c", "b")]);
  assert.match(validatePlan(deep).join(), /depth 3/);
  assert.match(validatePlan(plan([node("r", null, { dependsOn: ["x"] })])).join(), /unknown node "x"/);
});

test("rejects dependency on own ancestor (deadlock)", () => {
  const p = plan([node("r", null), node("a", "r", { dependsOn: ["r"] })]);
  assert.match(validatePlan(p).join(), /cycle/);
});

test("policy: trivial -> haiku, research floor -> sonnet, hard critical -> opus", () => {
  assert.equal(policyTier(node("x", null, { complexity: 1 }), opts), 0);
  assert.equal(policyTier(node("x", null, { complexity: 1, needsResearch: true }), opts), 1);
  assert.equal(policyTier(node("x", null, { complexity: 4, criticality: "high" }), opts), 2);
});

test("fable only when allowed", () => {
  const n = node("x", null, { complexity: 5, criticality: "high", kind: "proof", suggestedModel: "fable" });
  assert.equal(routePlan(plan([n]), opts).nodes[0].model, "opus");
  assert.equal(routePlan(plan([n]), { ...opts, allowFable: true }).nodes[0].model, "fable");
});

test("planner suggestion clamped to within one tier of policy", () => {
  const rp = routePlan(plan([node("r", null, { complexity: 1, suggestedModel: "opus" })]), opts);
  assert.equal(rp.nodes[0].model, "sonnet");
  assert.match(rp.nodes[0].notes.join(), /policy chose sonnet/);
});

test("supervisor raised to at least its strongest child", () => {
  const rp = routePlan(
    plan([node("r", null, { complexity: 1, suggestedModel: "haiku" }), node("p", "r", { complexity: 5, criticality: "high", suggestedModel: "opus" })]),
    opts,
  );
  assert.equal(rp.nodes.find((n) => n.id === "r")!.model, "opus");
});

test("research node never on haiku even if suggested", () => {
  const rp = routePlan(plan([node("r", null, { complexity: 1, needsResearch: true, suggestedModel: "haiku" })]), opts);
  assert.equal(rp.nodes[0].model, "sonnet");
});

test("effort scales with complexity and criticality; haiku has none", () => {
  assert.equal(effortFor(node("x", null, { complexity: 2 }), "sonnet"), "low");
  assert.equal(effortFor(node("x", null, { complexity: 4, criticality: "high" }), "opus"), "xhigh");
  assert.equal(effortFor(node("x", null, { complexity: 1 }), "haiku"), null);
});

test("budget pressure downgrades least critical nodes first and respects floors", () => {
  const p = plan([
    node("r", null, { complexity: 3, suggestedModel: "opus", estimatedOutputTokens: 4000 }),
    node("cheap", "r", { complexity: 3, criticality: "low", suggestedModel: "opus", estimatedOutputTokens: 8000 }),
    node("key", "r", { complexity: 4, criticality: "high", suggestedModel: "opus", estimatedOutputTokens: 8000 }),
  ]);
  const generous = routePlan(p, opts);
  const tight = routePlan(p, { ...opts, budgetUsd: generous.estTotalUsd * 0.8 });
  assert.ok(tight.estTotalUsd < generous.estTotalUsd);
  assert.equal(tight.nodes.find((n) => n.id === "key")!.model, "opus");
  assert.notEqual(tight.nodes.find((n) => n.id === "cheap")!.model, "opus");
  assert.equal(tight.nodes.find((n) => n.id === "r")!.model, "opus", "supervisor stays >= its opus child");
});

test("high-criticality node ignores a cheaper planner suggestion", () => {
  const rp = routePlan(plan([node("r", null, { complexity: 4, criticality: "high", suggestedModel: "sonnet" })]), opts);
  assert.equal(rp.nodes[0].model, "opus");
});

test("impossible budget is reported, not silently ignored", () => {
  const rp = routePlan(plan([node("r", null, { complexity: 5, criticality: "high" })]), { ...opts, budgetUsd: 0.0001 });
  assert.equal(rp.overBudget, true);
  assert.equal(rp.nodes[0].model, "opus");
});
