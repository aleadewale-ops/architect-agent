// Runs a routed plan bottom-up: a node starts once its children and dependencies
// have finished; independent nodes run in parallel up to `concurrency`. The
// scheduler is model-agnostic - the node runner is injected (real API or a fake
// in tests).

import type { RoutedNode } from "./router.js";
import { waitsFor } from "./router.js";

export interface NodeResult {
  output: string;
  model: string;
  attempts: number;
  verified: boolean | null; // null = not reviewed
  issues: string[];
}

export interface NodeInputs {
  dependencies: { node: RoutedNode; result: NodeResult }[];
  children: { node: RoutedNode; result: NodeResult }[];
}

export type NodeRunner = (node: RoutedNode, inputs: NodeInputs) => Promise<NodeResult>;

export type NodeStatus = "done" | "failed" | "skipped";

export interface ExecutionEvent {
  type: "start" | "done" | "failed" | "skipped";
  node: RoutedNode;
  result?: NodeResult;
  error?: unknown;
}

export interface ExecutionResult {
  status: Map<string, NodeStatus>;
  results: Map<string, NodeResult>;
  errors: Map<string, unknown>;
}

export async function executePlan(
  nodes: RoutedNode[],
  runner: NodeRunner,
  opts: { concurrency: number; onEvent?: (e: ExecutionEvent) => void },
): Promise<ExecutionResult> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const waits = waitsFor(nodes);
  const status = new Map<string, NodeStatus>();
  const results = new Map<string, NodeResult>();
  const errors = new Map<string, unknown>();
  const running = new Map<string, Promise<void>>();

  const ready = (n: RoutedNode) => !status.has(n.id) && !running.has(n.id) && waits.get(n.id)!.every((w) => status.get(w) === "done");
  const blocked = (n: RoutedNode) => !status.has(n.id) && !running.has(n.id) && waits.get(n.id)!.some((w) => status.get(w) === "failed" || status.get(w) === "skipped");

  const start = (n: RoutedNode) => {
    opts.onEvent?.({ type: "start", node: n });
    const pick = (ids: string[]) => ids.map((id) => ({ node: byId.get(id)!, result: results.get(id)! }));
    const p = runner(n, { dependencies: pick(n.dependsOn), children: pick(n.children) })
      .then((result) => {
        results.set(n.id, result);
        status.set(n.id, "done");
        opts.onEvent?.({ type: "done", node: n, result });
      })
      .catch((error: unknown) => {
        errors.set(n.id, error);
        status.set(n.id, "failed");
        opts.onEvent?.({ type: "failed", node: n, error });
      })
      .finally(() => running.delete(n.id));
    running.set(n.id, p);
  };

  while (status.size < nodes.length) {
    // Anything waiting on a failed/skipped node can never run; don't spend tokens on it.
    let changed = true;
    while (changed) {
      changed = false;
      for (const n of nodes) {
        if (blocked(n)) {
          status.set(n.id, "skipped");
          opts.onEvent?.({ type: "skipped", node: n });
          changed = true;
        }
      }
    }
    // Deepest first, so leaves (usually cheap readers) start before their supervisors.
    for (const n of nodes.filter(ready).sort((a, b) => b.depth - a.depth)) {
      if (running.size >= opts.concurrency) break;
      start(n);
    }
    if (running.size === 0) {
      if (status.size < nodes.length) throw new Error("scheduler stalled: plan has unsatisfiable dependencies");
      break;
    }
    await Promise.race(running.values());
  }
  return { status, results, errors };
}
