// Task backlog persisted in .architect/tasks.json. The user adds tasks; the planner
// proposes follow-ups after each run.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface Task {
  id: number;
  title: string;
  status: "open" | "done";
  source: "user" | "planner";
  createdAt: string;
  lastRun?: string;
}

export class TaskStore {
  constructor(readonly path: string) {}

  load(): Task[] {
    try {
      return JSON.parse(readFileSync(this.path, "utf8")) as Task[];
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw e;
    }
  }

  private save(tasks: Task[]): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, `${JSON.stringify(tasks, null, 2)}\n`);
  }

  add(title: string, source: Task["source"]): Task {
    const tasks = this.load();
    const existing = tasks.find((t) => t.status === "open" && t.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (existing) return existing;
    const task: Task = { id: Math.max(0, ...tasks.map((t) => t.id)) + 1, title: title.trim(), status: "open", source, createdAt: new Date().toISOString() };
    this.save([...tasks, task]);
    return task;
  }

  update(id: number, patch: Partial<Pick<Task, "status" | "lastRun">>): Task {
    const tasks = this.load();
    const t = tasks.find((x) => x.id === id);
    if (!t) throw new Error(`task ${id} not found`);
    Object.assign(t, patch);
    this.save(tasks);
    return t;
  }

  get(id: number): Task {
    const t = this.load().find((x) => x.id === id);
    if (!t) throw new Error(`task ${id} not found`);
    return t;
  }

  open(): Task[] {
    return this.load().filter((t) => t.status === "open");
  }
}
