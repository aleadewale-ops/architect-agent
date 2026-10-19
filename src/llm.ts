// The only module that talks to the Claude API. Builds per-model request params
// (thinking/effort/fallback rules differ by model), handles stop reasons, and
// records usage in the ledger.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import type { CallRole, Ledger } from "./ledger.js";
import { MODELS, type Effort, type ModelKey } from "./models.js";

type BetaParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type BetaMessage = Anthropic.Beta.Messages.BetaMessage;

export interface CallSpec {
  model: ModelKey;
  effort: Effort | null;
  /** Stable text; cached. Keep per-call data out of it. */
  system: string;
  user: string;
  maxTokens: number;
  /** Enables web search/fetch restricted to these hosts. */
  research?: { hosts: string[]; maxUses: number };
}

export class RefusalError extends Error {
  constructor(readonly category: string | null) {
    super(`model declined the request${category ? ` (${category})` : ""}`);
  }
}

let client: Anthropic | undefined;
function api(): Anthropic {
  client ??= new Anthropic();
  return client;
}

export function buildParams(spec: CallSpec): BetaParams {
  const m = MODELS[spec.model];
  const params: BetaParams = {
    model: m.id,
    max_tokens: spec.maxTokens,
    system: [{ type: "text", text: spec.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: spec.user }],
  };
  if (m.thinking === "adaptive") params.thinking = { type: "adaptive" };
  if (m.effort && spec.effort) params.output_config = { effort: spec.effort };
  if (m.serverFallbacks) {
    // On a safety-classifier decline, the API reruns the request on the recommended model.
    params.betas = ["server-side-fallback-2026-07-01"];
    params.fallbacks = "default";
  }
  if (spec.research) {
    if (!m.webTools) throw new Error(`${m.id} does not support web research tools`);
    const { hosts, maxUses } = spec.research;
    params.tools = [
      { type: "web_search_20260209", name: "web_search", max_uses: maxUses, allowed_domains: hosts },
      { type: "web_fetch_20260209", name: "web_fetch", max_uses: maxUses, allowed_domains: hosts },
    ];
  }
  return params;
}

function checkStop(msg: BetaMessage): void {
  if (msg.stop_reason === "refusal") throw new RefusalError(msg.stop_details?.category ?? null);
}

function textOf(msg: BetaMessage): string {
  return msg.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

export interface TextResult {
  text: string;
  truncated: boolean;
  servedModel: string;
}

/** Free-text call. Streams (long outputs) and resumes server-tool pauses. */
export async function callText(spec: CallSpec, ledger: Ledger, label: string, role: CallRole): Promise<TextResult> {
  const params = buildParams(spec);
  const messages = [...params.messages];
  let text = "";
  for (let turn = 0; turn < 5; turn++) {
    const msg = await api().beta.messages.stream({ ...params, messages }).finalMessage();
    ledger.record(label, role, spec.model, msg.model, msg.usage);
    checkStop(msg);
    text += textOf(msg);
    if (msg.stop_reason !== "pause_turn") {
      return { text, truncated: msg.stop_reason === "max_tokens", servedModel: msg.model };
    }
    messages.push({ role: "assistant", content: msg.content });
  }
  return { text, truncated: true, servedModel: MODELS[spec.model].id };
}

/** Schema-constrained call; returns the parsed object. */
export async function callStructured<S extends z.ZodType>(
  spec: CallSpec,
  schema: S,
  ledger: Ledger,
  label: string,
  role: CallRole,
): Promise<z.infer<S>> {
  const params = buildParams(spec);
  const msg = await api().beta.messages.parse({
    ...params,
    output_config: { ...params.output_config, format: betaZodOutputFormat(schema) },
  });
  ledger.record(label, role, spec.model, msg.model, msg.usage);
  checkStop(msg);
  if (msg.stop_reason === "max_tokens") throw new Error(`${label}: output truncated at max_tokens`);
  if (msg.parsed_output == null) throw new Error(`${label}: model returned no parseable output`);
  return msg.parsed_output as z.infer<S>;
}
