import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedHosts } from "../src/knowledge.js";
import { buildParams } from "../src/llm.js";
import { matchSkills } from "../src/skills.js";

const base = { effort: "high" as const, system: "s", user: "u", maxTokens: 8000 };

test("per-model request shape", () => {
  const haiku = buildParams({ ...base, model: "haiku" });
  assert.equal(haiku.thinking, undefined);
  assert.equal(haiku.output_config, undefined);
  assert.equal(haiku.fallbacks, undefined);

  const opus = buildParams({ ...base, model: "opus" });
  assert.deepEqual(opus.thinking, { type: "adaptive" });
  assert.deepEqual(opus.output_config, { effort: "high" });
  assert.equal(opus.fallbacks, "default");
  assert.deepEqual(opus.betas, ["server-side-fallback-2026-07-01"]);

  const fable = buildParams({ ...base, model: "fable" });
  assert.equal(fable.thinking, undefined, "Fable 5.1: thinking param must be omitted");
  assert.equal(fable.fallbacks, "default");
});

test("research restricts web tools to the curated hosts", () => {
  const hosts = allowedHosts(["math"]);
  assert.ok(hosts.includes("arxiv.org") && hosts.includes("mathoverflow.net"));
  assert.ok(!hosts.includes("archnet.org"));
  const p = buildParams({ ...base, model: "sonnet", research: { hosts, maxUses: 5 } });
  assert.equal(p.tools?.length, 2);
  assert.throws(() => buildParams({ ...base, model: "haiku", research: { hosts, maxUses: 5 } }));
});

test("skill matching finds domain tools", () => {
  assert.ok(matchSkills("formal proof in algebraic geometry").some((s) => s.name.startsWith("mathlib4")));
  assert.ok(matchSkills("BIM ifc building model").some((s) => s.name === "IfcOpenShell"));
  assert.ok(matchSkills("daylight and energy for sustainable housing").some((s) => s.name === "Ladybug Tools"));
  assert.ok(matchSkills("formalni dokaz v algebrski geometriji").some((s) => s.name.startsWith("mathlib4")));
  assert.ok(matchSkills("trajnostna arhitektura, energija in svetloba").some((s) => s.name === "Ladybug Tools"));
});
