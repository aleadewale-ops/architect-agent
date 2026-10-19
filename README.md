# Architect: a hierarchical orchestrator of Claude agents

Architect takes a task and splits it into a tree of agents (agent → subagent → sub-subagent). It gives every node the cheapest Claude model that will do that node correctly, runs the tree, and sends risky steps to review. At the end it writes a report with the actual token use and cost. It also suggests follow-up tasks and suitable skills or tools.

For research steps it uses only curated academic sources: MIT OCW, arXiv (math.CO/AG/DG), MathOverflow, nLab, AIM, Project Euclid, Vakil's *The Rising Sea*, Tao's blog, TU Delft, AA, Harvard GSD, UCL Press, OAPEN, Archnet, DOAJ, Columbia GSAPP and ETH Zürich. The source list lives in `src/knowledge.ts`; change it for your field.

## Two modes

| | **Subscription** (recommended) | **API** |
|---|---|---|
| Start | in Claude Code: `/architect "<task>"` | `npm run architect -- run "<task>"` |
| Payment | your Claude subscription, no API key | usage through `ANTHROPIC_API_KEY` |
| Workers | Claude Code subagents (`.claude/agents/architect-*.md`) | direct API calls |
| Rules, plan, waves, report | same code (`src/router.ts`, `src/run-tools.ts`) | same code |

### Subscription mode

1. `npm install` (once).
2. Open Claude Code in this folder (locally, on a server or in the cloud). New agents and the skill load in a **new session**.
3. `/architect "Explain the Littlewood–Richardson rule ..."`. Options: `--plan-only`, `--allow-fable`, `--verify auto|all|none`, `--file <path>` and `--yes`.
4. On a server without a window: `claude -p '/architect "<task>" --yes'` (subscription login, without `--bare`).

The skill:
- calls the planner (`architect-planner`, Opus);
- checks and schedules the plan with `npx tsx src/run-tools.ts route` (no tokens);
- runs the nodes in waves with subagents, each with its own model and effort;
- sends risky nodes to review and, if they fail, fixes them once on a stronger model;
- writes the report to `.architect/runs/<time>/report.md`.

Subagents hand their outputs over through files, so the orchestrator's context stays small. Use `/usage` (Attribution section) to see usage per subagent.

After changing prompts, sources or the agent table, run `npm run gen:claude`. A test checks that the files in `.claude/` are up to date.

A full example run is in [`examples/lr-pravilo/`](examples/lr-pravilo/) (in Slovenian, the language it was run in): the plan, node outputs, reviews, the final result and the report.

The result is written in the language set by `--lang`, else `$ARCHITECT_LANG`, else English. In subscription mode it follows the language you write in.

## How it works

```
task
  │
  ▼
PLANNER (claude-opus-5, structured output)
  proposes a tree of nodes: goal, kind, difficulty 1–5, criticality,
  need for research, acceptance criteria, suggested model, skills
  │
  ▼
ROUTER (deterministic rules, 0 tokens)
  • checks the structure: one root, depth ≤ 2, ≤ 6 children, ≤ 20 nodes, no cycles
  • picks model and effort by the rules below, trusts the planner within ±1 level
  • a supervisor is at least as strong as its subagents
  • estimates the cost and, if the budget is too small, lowers the least critical nodes
  │
  ▼
EXECUTOR (leaves to root, independent nodes in parallel)
  each node → the chosen model (+ web search on curated sources only)
  risky nodes → REVIEWER → on failure, one fix on a stronger model
  │
  ▼
REPORT (.architect/runs/<time>/report.md) + suggested tasks added to the list
```

### Model selection rules

| Difficulty | Base model | Effort |
|---|---|---|
| 1 | `claude-haiku-4-5` | – |
| 2–3 | `claude-sonnet-5` | low / medium |
| 4–5 | `claude-opus-5` | high / xhigh |
| 5 + high criticality + `--allow-fable` | `claude-fable-5-1` | xhigh |

The model ids live in `src/models.ts`; update them when new models come out.

Additional rules:
- Research nodes use at least Sonnet (Haiku has no web tools).
- Highly critical nodes never drop below the model the rules set, neither because of the planner's suggestion nor because of the budget.
- Proofs and syntheses with difficulty 4 or more get at least Opus.
- High criticality raises effort by one step, low criticality lowers it.

### Why token use stays low

- Delegation has a price. The planner splits the tree only when subtasks are independent, need a different model tier, or the raw material would flood the parent. A simple task is a single node.
- System prompts are stable and cached (prompt caching).
- Only nodes where a mistake is expensive are reviewed (the root, high criticality, difficulty ≥ 4). The reviewer is Sonnet on low effort, or Opus for nodes that ran on Opus.
- A failure gets one fix on a stronger model, not an endless loop.
- After a failure, dependent nodes are skipped instead of wasting tokens.
- `architect plan` shows the tree and the cost estimate before anything expensive runs.

### How mistakes are reduced

- Every node has checkable acceptance criteria.
- The parent checks and merges its subagents' outputs, and gets the reviewer's warnings with them.
- In mathematics the planner separates the literature search from the proof and adds checks on small cases. It marks steps worth formalising (Lean/mathlib).
- Agents must not invent sources, and they mark uncertainty with `UNCERTAIN:`.
- Opus and Fable run with `fallbacks: "default"`: if the safety classifier refuses a request, the API runs it on the recommended model automatically.

## Install (API mode)

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
npm run architect -- plan "Survey of Schubert calculus and its combinatorics (the Littlewood–Richardson rule)"
npm run architect -- run  "Compare the courtyard house typology in Islamic and Mediterranean architecture" --budget 2
npm run architect -- run  "Proof of the theorem ... " --allow-fable --verify all

npm run architect -- tasks add "Collect open problems in enumerative combinatorics from MathOverflow"
npm run architect -- tasks
npm run architect -- tasks run 1
npm run architect -- tasks done 1

npm run architect -- skills "sustainable architecture, energy"   # local catalog, 0 tokens
npm run architect -- skills "arxiv mcp server" --discover        # + search on GitHub

npm run architect -- sources
npm run architect -- models
```

Options: `--budget <USD>` (default 3), `--allow-fable`, `--planner opus|fable`, `--planner-effort`, `--verify auto|all|none`, `--concurrency <n>`, `--lang <language>`, `--yes`, `--force`.

## Structure

| File | Role |
|---|---|
| `src/models.ts` | model catalog, prices, cost calculation |
| `src/plan-schema.ts` | plan schema (Zod → structured output) |
| `src/router.ts` | tree validation, model/effort choice, budget |
| `src/planner.ts` | planner call + one repair round for an invalid plan |
| `src/executor.ts` | scheduler (dependencies, parallelism, skips) |
| `src/worker.ts` | node execution, review, escalation |
| `src/llm.ts` | the only contact with the API (per-model parameters, stop reasons) |
| `src/knowledge.ts` | curated knowledge sources and allowed domains |
| `src/skills.ts` | catalog of skills and tools + matching (English and Slovenian queries) |
| `src/tasks.ts` | task list (`.architect/tasks.json`) |
| `src/report.ts`, `src/cli.ts` | report and command line |

## Development

```bash
npm test          # tests of the rules, the scheduler and the parameters (no API calls)
npm run typecheck
```

## License

MIT
