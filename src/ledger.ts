import { MODELS, costUsd, modelById, type ModelKey, type TokenUsage } from "./models.js";

export type CallRole = "plan" | "work" | "verify" | "discover";

export interface LedgerEntry {
  label: string;
  role: CallRole;
  requestedModel: ModelKey;
  servedModel: string;
  usage: TokenUsage;
  costUsd: number;
}

/** Records every API call so the run report shows real tokens and dollars. */
export class Ledger {
  readonly entries: LedgerEntry[] = [];

  record(label: string, role: CallRole, requestedModel: ModelKey, servedModelId: string, usage: TokenUsage): LedgerEntry {
    // A server-side fallback may serve the request on another model; bill at its rates.
    const served = modelById(servedModelId) ?? MODELS[requestedModel];
    const entry = { label, role, requestedModel, servedModel: servedModelId, usage, costUsd: costUsd(served, usage) };
    this.entries.push(entry);
    return entry;
  }

  get totalUsd(): number {
    return this.entries.reduce((s, e) => s + e.costUsd, 0);
  }

  summary(): { model: string; calls: number; input: number; cacheRead: number; output: number; usd: number }[] {
    const rows = new Map<string, { model: string; calls: number; input: number; cacheRead: number; output: number; usd: number }>();
    for (const e of this.entries) {
      const r = rows.get(e.servedModel) ?? { model: e.servedModel, calls: 0, input: 0, cacheRead: 0, output: 0, usd: 0 };
      r.calls++;
      r.input += e.usage.input_tokens + (e.usage.cache_creation_input_tokens ?? 0);
      r.cacheRead += e.usage.cache_read_input_tokens ?? 0;
      r.output += e.usage.output_tokens;
      r.usd += e.costUsd;
      rows.set(e.servedModel, r);
    }
    return [...rows.values()].sort((a, b) => b.usd - a.usd);
  }
}
