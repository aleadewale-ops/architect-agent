import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { agentFor, escalationAgentFor, REVIEWER_AGENTS, WORKER_AGENTS } from "../src/agents.js";
import { renderClaudeFiles } from "../src/gen-claude.js";
import { routePlan } from "../src/router.js";
import { buildDispatch, computeWaves, parseReview } from "../src/run-tools.js";
import { node, plan } from "./helpers.js";

const opts = { allowFable: false, budgetUsd: Number.POSITIVE_INFINITY };

test("every routed (model, effort) maps to an existing agent at the nearest effort", () => {
  assert.equal(agentFor("haiku", null), "architect-haiku");
  assert.equal(agentFor("sonnet", "low"), "architect-sonnet-low");
  assert.equal(agentFor("opus", "xhigh"), "architect-opus-deep");
  assert.equal(agentFor("opus", "low"), "architect-opus-medium");
  assert.equal(agentFor("fable", "high"), "architect-fable");
  const names = new Set(WORKER_AGENTS.map((a) => a.name));
  for (const m of ["haiku", "sonnet", "opus", "fable"] as const) {
    for (const e of ["low", "medium", "high", "xhigh", "max"] as const) assert.ok(names.has(agentFor(m, e)));
  }
});

test("escalation goes one tier up; fable only when allowed", () => {
  const [n] = routePlan(plan([node("r", null, { complexity: 4, criticality: "high" })]), opts).nodes;
  assert.equal(escalationAgentFor(n, false), "architect-opus-deep");
  assert.equal(escalationAgentFor(n, true), "architect-fable");
});

test("waves respect children and dependencies; dispatch picks agents and reviews", () => {
  const nodes = routePlan(
    plan([
      node("root", null, { complexity: 4 }),
      node("lit", "root", { complexity: 2, needsResearch: true }),
      node("proof", "root", { complexity: 4, criticality: "high", kind: "proof", dependsOn: ["lit"] }),
      node("check", "proof", { complexity: 1, kind: "computation", suggestedModel: "haiku" }),
    ]),
    opts,
  ).nodes;
  assert.deepEqual(computeWaves(nodes), [["lit", "check"], ["proof"], ["root"]]);
  const d = buildDispatch("t", "RUN", nodes, { allowFable: false, verify: "auto" });
  const by = Object.fromEntries(d.nodes.map((n) => [n.id, n]));
  assert.equal(by.check.agent, "architect-haiku");
  assert.equal(by.check.review, false);
  assert.equal(by.proof.review, true);
  assert.equal(by.proof.reviewer, "architect-reviewer-strict");
  assert.deepEqual(by.proof.waitsFor.sort(), ["check", "lit"]);
  assert.equal(by.root.review, true);
});

test("review file parsing", () => {
  assert.deepEqual(parseReview("VERDICT: FAIL\nATTEMPT: 2\n- wrong index\n- missing ref"), { verdict: "FAIL", attempt: 2, issues: ["wrong index", "missing ref"] });
  assert.equal(parseReview("verdict: pass").verdict, "PASS");
});

test("generated .claude files are up to date (run npm run gen:claude)", () => {
  for (const [path, content] of Object.entries(renderClaudeFiles())) {
    assert.equal(readFileSync(path, "utf8"), content, `${path} is stale`);
  }
  assert.equal(Object.keys(renderClaudeFiles()).length, WORKER_AGENTS.length + REVIEWER_AGENTS.length + 2);
});
