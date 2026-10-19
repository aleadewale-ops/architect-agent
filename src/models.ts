// Catalog of Claude models the orchestrator can assign, ordered by tier.
// Prices are USD per million tokens (Anthropic first-party API).

export type ModelKey = "haiku" | "sonnet" | "opus" | "fable";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const EFFORTS: Effort[] = ["low", "medium", "high", "xhigh", "max"];

export interface ModelSpec {
  key: ModelKey;
  id: string;
  tier: number;
  inputPerMTok: number;
  outputPerMTok: number;
  /** Accepts `output_config.effort`. */
  effort: boolean;
  /** "adaptive": send `thinking: {type: "adaptive"}`; "implicit": always on, omit the param; "off": no thinking. */
  thinking: "off" | "adaptive" | "implicit";
  /** Supports server-side `fallbacks: "default"` on refusals. */
  serverFallbacks: boolean;
  /** Supports the web_search/web_fetch 20260209 tool variants. */
  webTools: boolean;
  strengths: string;
}

export const MODELS: Record<ModelKey, ModelSpec> = {
  haiku: {
    key: "haiku",
    id: "claude-haiku-4-5",
    tier: 0,
    inputPerMTok: 1,
    outputPerMTok: 5,
    effort: false,
    thinking: "off",
    serverFallbacks: false,
    webTools: false,
    strengths: "fast, cheap: extraction, formatting, classification, short well-specified subtasks",
  },
  sonnet: {
    key: "sonnet",
    id: "claude-sonnet-5",
    tier: 1,
    inputPerMTok: 2,
    outputPerMTok: 10,
    effort: true,
    thinking: "adaptive",
    serverFallbacks: false,
    webTools: true,
    strengths: "strong generalist: literature research, summaries of sources, drafting, routine reasoning, review",
  },
  opus: {
    key: "opus",
    id: "claude-opus-5",
    tier: 2,
    inputPerMTok: 5,
    outputPerMTok: 25,
    effort: true,
    thinking: "adaptive",
    serverFallbacks: true,
    webTools: true,
    strengths: "deep reasoning: planning, proofs, design critique, synthesis of conflicting inputs",
  },
  fable: {
    key: "fable",
    id: "claude-fable-5-1",
    tier: 3,
    inputPerMTok: 10,
    outputPerMTok: 50,
    effort: true,
    thinking: "implicit",
    serverFallbacks: true,
    webTools: true,
    strengths: "most capable: frontier-level proofs and research questions, long-horizon hard problems",
  },
};

export const TIER_ORDER: ModelKey[] = ["haiku", "sonnet", "opus", "fable"];

export function modelAtTier(tier: number): ModelKey {
  return TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, tier))];
}

export function modelById(id: string): ModelSpec | undefined {
  return Object.values(MODELS).find((m) => id === m.id || id.startsWith(`${m.id}-`));
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export function costUsd(model: ModelSpec, u: TokenUsage): number {
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const cacheRead = u.cache_read_input_tokens ?? 0;
  return (
    (u.input_tokens * model.inputPerMTok +
      cacheWrite * model.inputPerMTok * 1.25 +
      cacheRead * model.inputPerMTok * 0.1 +
      u.output_tokens * model.outputPerMTok) /
    1_000_000
  );
}
