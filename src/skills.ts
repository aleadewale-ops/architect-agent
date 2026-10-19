// Catalog of skills and tools worth attaching to a task. "claude-skill" entries are
// Agent Skills (SKILL.md folders); "library" entries are software an agent can run
// or cite. Matching is local keyword scoring - zero tokens. For anything not in
// the catalog, `architect skills --discover` searches GitHub with a model.

export interface SkillEntry {
  name: string;
  kind: "claude-skill" | "library";
  url: string;
  tags: string[];
  description: string;
}

const ANTHROPIC_SKILLS = "https://github.com/anthropics/skills/tree/main/skills";

export const SKILLS: SkillEntry[] = [
  // Anthropic Agent Skills
  { name: "skill-creator", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/skill-creator`, tags: ["skill", "create", "workflow", "automation", "evaluate"], description: "Author, test and refine new skills (turn a recurring workflow into a skill)" },
  { name: "pdf", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/pdf`, tags: ["pdf", "paper", "extract", "report", "arxiv", "book"], description: "Read, extract, merge and create PDF files (papers, monographs)" },
  { name: "docx", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/docx`, tags: ["word", "docx", "report", "document"], description: "Create and edit Word documents" },
  { name: "pptx", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/pptx`, tags: ["slides", "presentation", "pptx", "lecture"], description: "Build slide decks (lectures, design reviews)" },
  { name: "xlsx", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/xlsx`, tags: ["spreadsheet", "table", "data", "xlsx", "schedule"], description: "Spreadsheets with formulas (areas, costs, datasets)" },
  { name: "mcp-builder", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/mcp-builder`, tags: ["mcp", "tool", "integration", "api", "server"], description: "Build MCP servers that give agents new tools (e.g. arXiv API)" },
  { name: "canvas-design", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/canvas-design`, tags: ["poster", "visual", "design", "diagram", "image"], description: "Visual compositions and posters" },
  { name: "algorithmic-art", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/algorithmic-art`, tags: ["generative", "geometry", "pattern", "visual", "parametric"], description: "Generative art with p5.js: parametric patterns, tilings" },
  { name: "frontend-design", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/frontend-design`, tags: ["web", "ui", "frontend", "interface", "portfolio"], description: "Distinctive, production-grade web interfaces" },
  { name: "webapp-testing", kind: "claude-skill", url: `${ANTHROPIC_SKILLS}/webapp-testing`, tags: ["test", "web", "playwright", "qa"], description: "Test web apps with Playwright" },
  // Mathematics
  { name: "mathlib4 (Lean 4)", kind: "library", url: "https://github.com/leanprover-community/mathlib4", tags: ["proof", "formal", "verify", "lean", "algebra", "topology", "geometry", "combinatorics"], description: "Formal verification of proofs; strongest guard against proof errors" },
  { name: "SageMath", kind: "library", url: "https://github.com/sagemath/sage", tags: ["computation", "algebra", "combinatorics", "geometry", "enumerate", "polynomial", "graph"], description: "Computer algebra: enumerative combinatorics, varieties, symbolic computation" },
  { name: "Macaulay2", kind: "library", url: "https://github.com/Macaulay2/M2", tags: ["algebraic geometry", "commutative algebra", "ideal", "groebner", "sheaf", "cohomology"], description: "Algebraic geometry and commutative algebra computations" },
  { name: "OSCAR (Julia)", kind: "library", url: "https://github.com/oscar-system/Oscar.jl", tags: ["algebraic geometry", "group", "polyhedral", "toric", "combinatorics"], description: "Computer algebra: groups, polyhedral and toric geometry" },
  { name: "GAP", kind: "library", url: "https://github.com/gap-system/gap", tags: ["group", "symmetry", "algebra", "combinatorics"], description: "Computational group theory (symmetry groups, also of architectural patterns)" },
  { name: "SymPy", kind: "library", url: "https://github.com/sympy/sympy", tags: ["symbolic", "computation", "calculus", "differential geometry", "tensor"], description: "Symbolic mathematics in Python, incl. differential geometry module" },
  { name: "NetworkX", kind: "library", url: "https://github.com/networkx/networkx", tags: ["graph", "network", "combinatorics", "urban", "space syntax"], description: "Graph algorithms (combinatorics, spatial networks)" },
  { name: "TikZ/PGF", kind: "library", url: "https://github.com/pgf-tikz/pgf", tags: ["diagram", "figure", "latex", "commutative diagram", "drawing"], description: "Publication-quality mathematical diagrams in LaTeX" },
  // Architecture and computational design
  { name: "COMPAS", kind: "library", url: "https://github.com/compas-dev/compas", tags: ["architecture", "geometry", "structure", "fabrication", "computational design", "mesh"], description: "Computational design framework (ETH Zürich): geometry, structures, fabrication" },
  { name: "IfcOpenShell", kind: "library", url: "https://github.com/IfcOpenShell/IfcOpenShell", tags: ["bim", "ifc", "building", "architecture", "model"], description: "Read and write BIM/IFC building models" },
  { name: "Ladybug Tools", kind: "library", url: "https://github.com/ladybug-tools", tags: ["sustainability", "climate", "daylight", "energy", "environmental", "architecture"], description: "Environmental and energy analysis for sustainable design" },
  { name: "topologicpy", kind: "library", url: "https://github.com/wassimj/topologicpy", tags: ["topology", "spatial", "architecture", "graph", "non-manifold"], description: "Non-manifold topology for architectural spatial models" },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9čšžćđ]+/).filter((w) => w.length > 2);
}

// Slovenian stems -> English tags, so local matching works for queries in Slovenian.
const SL_STEMS: [string, string][] = [
  ["dokaz", "proof"], ["formaln", "formal"], ["preverj", "verify"], ["geometri", "geometry"],
  ["algebrsk", "algebraic geometry"], ["kombinatori", "combinatorics"], ["topologij", "topology"],
  ["diferencialn", "differential geometry"], ["simetrij", "symmetry"], ["grup", "group"], ["graf", "graph"],
  ["izračun", "computation"], ["računan", "computation"], ["preštej", "enumerate"], ["polinom", "polynomial"],
  ["arhitektur", "architecture"], ["stavb", "building"], ["urban", "urban"], ["trajnost", "sustainability"],
  ["energij", "energy"], ["svetlob", "daylight"], ["osvetlit", "daylight"], ["podneb", "climate"],
  ["konstrukcij", "structure"], ["prostor", "spatial"], ["parametri", "parametric"], ["vzor", "pattern"],
  ["diagram", "diagram"], ["slik", "figure"], ["poročil", "report"], ["predstavit", "presentation"],
  ["prosojnic", "slides"], ["članek", "paper"], ["članki", "paper"], ["knjig", "book"], ["tabel", "table"],
  ["spletn", "web"], ["test", "test"], ["orodj", "tool"], ["skill", "skill"],
];

function expandQuery(query: string): string {
  const q = query.toLowerCase();
  const extra = SL_STEMS.filter(([sl]) => q.includes(sl)).map(([, en]) => en);
  return [q, ...extra].join(" ");
}

export function matchSkills(query: string, limit = 6): SkillEntry[] {
  const q = expandQuery(query);
  const words = new Set(tokenize(q));
  const scored = SKILLS.map((s) => {
    let score = 0;
    for (const t of s.tags) {
      if (t.includes(" ") ? q.includes(t) : words.has(t)) score += 3;
      else if (tokenize(t).some((w) => [...words].some((x) => x.length > 3 && (w.startsWith(x) || x.startsWith(w))))) score += 1;
    }
    for (const w of tokenize(s.description)) if (words.has(w)) score += 1;
    return { s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

export function describeSkills(): string {
  return SKILLS.map((s) => `- ${s.name} (${s.kind}): ${s.description}`).join("\n");
}

export function findSkill(name: string): SkillEntry | undefined {
  return SKILLS.find((s) => s.name.toLowerCase() === name.toLowerCase());
}
