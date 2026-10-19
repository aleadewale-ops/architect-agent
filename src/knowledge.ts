// Curated knowledge sources. Research nodes may only search and fetch within the
// domains listed here (web_search/web_fetch `allowed_domains`), so answers stay
// grounded in the academic canon rather than the open web.

import type { KnowledgeDomain } from "./plan-schema.js";

export interface KnowledgeSource {
  name: string;
  url: string;
  /** Hostnames passed to allowed_domains; subdomains are covered. */
  hosts: string[];
  domains: KnowledgeDomain[];
  level: "course" | "lecture-notes" | "preprints" | "research-qa" | "textbooks" | "wiki" | "journals" | "books" | "archive" | "video";
  use: string;
}

export const SOURCES: KnowledgeSource[] = [
  // --- Mathematics ---
  {
    name: "MIT OpenCourseWare (Mathematics)",
    url: "https://ocw.mit.edu/search/?d=Mathematics",
    hosts: ["ocw.mit.edu"],
    domains: ["math"],
    level: "course",
    use: "Graduate course notes, problem sets: enumerative/algebraic combinatorics, differential and algebraic geometry, topology",
  },
  {
    name: "The Rising Sea (Ravi Vakil)",
    url: "https://math.stanford.edu/~vakil/216blog/",
    hosts: ["math.stanford.edu"],
    domains: ["math"],
    level: "lecture-notes",
    use: "Standard reference for scheme-theoretic algebraic geometry",
  },
  {
    name: "Terence Tao's blog",
    url: "https://terrytao.wordpress.com/",
    hosts: ["terrytao.wordpress.com"],
    domains: ["math"],
    level: "lecture-notes",
    use: "Lecture notes and expositions: additive/probabilistic combinatorics, analysis",
  },
  {
    name: "arXiv (math.CO, math.AG, math.DG)",
    url: "https://arxiv.org/archive/math",
    hosts: ["arxiv.org"],
    domains: ["math"],
    level: "preprints",
    use: "Current research; cite as arXiv:YYMM.NNNNN [math.XX]",
  },
  {
    name: "MathOverflow",
    url: "https://mathoverflow.net/",
    hosts: ["mathoverflow.net"],
    domains: ["math"],
    level: "research-qa",
    use: "Research-level Q&A, open problems, folklore results and references",
  },
  {
    name: "AIM Open Textbook Initiative",
    url: "https://aimath.org/textbooks/",
    hosts: ["aimath.org"],
    domains: ["math"],
    level: "textbooks",
    use: "Peer-reviewed open textbooks for upper-level and graduate mathematics",
  },
  {
    name: "nLab",
    url: "https://ncatlab.org/nlab/show/HomePage",
    hosts: ["ncatlab.org"],
    domains: ["math"],
    level: "wiki",
    use: "Research-level wiki: higher category theory, algebraic topology, modern geometry",
  },
  {
    name: "Project Euclid",
    url: "https://projecteuclid.org/",
    hosts: ["projecteuclid.org"],
    domains: ["math"],
    level: "journals",
    use: "Open-access journals and monographs",
  },
  // --- Architecture ---
  {
    name: "MIT OpenCourseWare (Architecture, Course 4)",
    url: "https://ocw.mit.edu/search/?d=Architecture",
    hosts: ["ocw.mit.edu"],
    domains: ["architecture"],
    level: "course",
    use: "History/theory, urbanism, design computation, building technology",
  },
  {
    name: "TU Delft OpenCourseWare",
    url: "https://ocw.tudelft.nl/",
    hosts: ["ocw.tudelft.nl"],
    domains: ["architecture"],
    level: "course",
    use: "Sustainable architecture, urban planning",
  },
  {
    name: "AA School of Architecture lectures",
    url: "https://www.aaschool.ac.uk/",
    hosts: ["aaschool.ac.uk"],
    domains: ["architecture"],
    level: "video",
    use: "Lectures and symposia by leading architects and theorists (video; use descriptions/transcripts)",
  },
  {
    name: "Harvard GSD",
    url: "https://www.gsd.harvard.edu/",
    hosts: ["gsd.harvard.edu"],
    domains: ["architecture"],
    level: "video",
    use: "Public lectures and conferences on architecture and landscape architecture",
  },
  {
    name: "UCL Press",
    url: "https://www.uclpress.co.uk/",
    hosts: ["uclpress.co.uk"],
    domains: ["architecture"],
    level: "books",
    use: "Open-access monographs (Bartlett): architecture, urbanism, spatial theory",
  },
  {
    name: "OAPEN Library",
    url: "https://library.oapen.org/",
    hosts: ["oapen.org"],
    domains: ["architecture", "math"],
    level: "books",
    use: "Peer-reviewed open-access academic books",
  },
  {
    name: "Archnet",
    url: "https://www.archnet.org/",
    hosts: ["archnet.org"],
    domains: ["architecture"],
    level: "archive",
    use: "Plans, photographs, monographs; Islamic world and Global South typologies",
  },
  {
    name: "DOAJ",
    url: "https://doaj.org/",
    hosts: ["doaj.org"],
    domains: ["architecture", "math"],
    level: "journals",
    use: "Directory of peer-reviewed open-access journals",
  },
  {
    name: "Columbia GSAPP",
    url: "https://www.arch.columbia.edu/",
    hosts: ["arch.columbia.edu"],
    domains: ["architecture"],
    level: "archive",
    use: "Digitized archives, research publications",
  },
  {
    name: "ETH Zürich Research Collection",
    url: "https://www.research-collection.ethz.ch/",
    hosts: ["research-collection.ethz.ch"],
    domains: ["architecture", "math"],
    level: "archive",
    use: "Open theses and research papers",
  },
];

export function sourcesFor(domains: KnowledgeDomain[]): KnowledgeSource[] {
  const want = new Set(domains);
  if (want.size === 0 || want.has("general")) return SOURCES;
  return SOURCES.filter((s) => s.domains.some((d) => want.has(d)));
}

export function allowedHosts(domains: KnowledgeDomain[]): string[] {
  return [...new Set(sourcesFor(domains).flatMap((s) => s.hosts))].sort();
}

export function describeSources(): string {
  return SOURCES.map((s) => `- ${s.name} [${s.domains.join("/")}, ${s.level}] ${s.url}: ${s.use}`).join("\n");
}
