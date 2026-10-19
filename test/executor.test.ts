import assert from "node:assert/strict";
import { test } from "node:test";
import { executePlan, type NodeRunner } from "../src/executor.js";
import { routePlan } from "../src/router.js";
import { node, plan } from "./helpers.js";

const route = (nodes: ReturnType<typeof node>[]) => routePlan(plan(nodes), { allowFable: false, budgetUsd: 100 }).nodes;

test("children and dependencies finish before the node that needs them", async () => {
  const nodes = route([node("root", null), node("lit", "root"), node("proof", "root", { dependsOn: ["lit"] }), node("check", "proof")]);
  const order: string[] = [];
  const runner: NodeRunner = async (n, inputs) => {
    order.push(n.id);
    return { output: `${n.id}(${[...inputs.dependencies, ...inputs.children].map((x) => x.result.output).join(",")})`, model: n.model, attempts: 1, verified: null, issues: [] };
  };
  const res = await executePlan(nodes, runner, { concurrency: 2 });
  assert.ok(order.indexOf("lit") < order.indexOf("proof"));
  assert.ok(order.indexOf("check") < order.indexOf("proof"));
  assert.equal(order.at(-1), "root");
  assert.match(res.results.get("root")!.output, /proof\(lit\(\),check\(\)\)/);
});

test("failure skips dependents but independent branches still run", async () => {
  const nodes = route([node("root", null), node("bad", "root"), node("good", "root"), node("after", "root", { dependsOn: ["bad"] })]);
  const runner: NodeRunner = async (n) => {
    if (n.id === "bad") throw new Error("boom");
    return { output: n.id, model: n.model, attempts: 1, verified: null, issues: [] };
  };
  const res = await executePlan(nodes, runner, { concurrency: 3 });
  assert.equal(res.status.get("bad"), "failed");
  assert.equal(res.status.get("good"), "done");
  assert.equal(res.status.get("after"), "skipped");
  assert.equal(res.status.get("root"), "skipped");
});

test("concurrency limit is respected", async () => {
  const nodes = route([node("root", null), ...["a", "b", "c", "d", "e"].map((id) => node(id, "root"))]);
  let active = 0;
  let peak = 0;
  const runner: NodeRunner = async (n) => {
    peak = Math.max(peak, ++active);
    await new Promise((r) => setTimeout(r, 5));
    active--;
    return { output: n.id, model: n.model, attempts: 1, verified: null, issues: [] };
  };
  await executePlan(nodes, runner, { concurrency: 2 });
  assert.equal(peak, 2);
});
