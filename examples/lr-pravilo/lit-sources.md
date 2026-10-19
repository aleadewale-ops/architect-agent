# Annotated Bibliography: The Littlewood–Richardson Rule

Summary: 4 verified textbook references (with corrected chapter/section numbers where the
original guess was imprecise), 4 arXiv/open-access papers (3 with confirmed arXiv ids, 1
confirmed to have no arXiv id), and 1 confirmed MIT OpenCourseWare page; total 9 entries.

**Access note.** `WebSearch` worked normally in this environment, but `WebFetch` is blocked
by the network egress proxy for every domain tried (`arxiv.org`, `ocw.mit.edu`,
`semanticscholar.org`, `websites.umich.edu`) — see the tool's `EGRESS_BLOCKED` errors. All
verification below was therefore done by cross-checking multiple independent `WebSearch`
result snippets (including snippets that quote the primary page itself, e.g. Cambridge
Core's own chapter-title page, arxiv.org URLs returned by the search backend, and a DSpace
mirror of the MIT OCW page) rather than by fetching and reading the primary page directly.
Where two searches disagreed or a detail could not be cross-confirmed, it is marked
**unverified** below rather than guessed.

## (a) Textbooks

1. **W. Fulton**, *Young Tableaux: With Applications to Representation Theory and Geometry*,
   London Mathematical Society Student Texts 35, Cambridge University Press, 1997. —
   **Chapter 5, "The Littlewood–Richardson Rule"** (confirmed directly from Cambridge Core's
   chapter page, titled exactly this and numbered Chapter 5), plus **Appendix A** ("Further
   Combinatorics"), which treats equivalent/variant formulations of LR tableaux (e.g. via
   jeu de taquin and dual equivalence). Best first read: elementary, self-contained proof via
   tableaux and the RSK correspondence built up in earlier chapters.

2. **R. P. Stanley**, *Enumerative Combinatorics, Volume 2*, Cambridge Studies in Advanced
   Mathematics 62, Cambridge University Press, 1999. — The LR rule for skew Schur function
   expansion is stated as **Corollary 7.17.5** (Chapter 7, symmetric functions); a second,
   independent combinatorial proof via RSK/jeu de taquin is given in **Appendix 1 (by Sergey
   Fomin), §A1.3** (see esp. the combinatorial model in Definition A1.3.10). *Correction to
   the task brief:* the precise citation found is **§7.17/Cor. 7.17.5 and Appendix 1 §A1.3**,
   not "§7.10" as originally guessed — I could not find any LR-rule statement at 7.10 in
   independent searches, so the original section number should be treated as wrong. Useful
   for: two independent, rigorously cross-referenced proofs in one book.

3. **I. G. Macdonald**, *Symmetric Functions and Hall Polynomials*, 2nd ed., Oxford
   University Press, 1995. — **Chapter I, §9, "The Littlewood–Richardson rule"** (title and
   section number both confirmed). The classical, most concise algebraic treatment via
   skew Schur functions; the reference other books cite for the sharpest statement.

4. **B. Sagan**, *The Symmetric Group: Representations, Combinatorial Algorithms, and
   Symmetric Functions*, 2nd ed., Graduate Texts in Mathematics 203, Springer, 2001. —
   Covered in **Chapter 4** (Young tableaux, RSK, jeu de taquin, Schur functions); multiple
   independent searches confirm the book's Chapter 4 covers the LR rule, but I could **not
   independently confirm the exact subsection number "§4.9"** given in the task brief (no
   accessible table of contents with subsection numbers turned up). Treat "§4.9" as
   **unverified**; "Chapter 4" is confirmed. Useful for: LR rule presented alongside a full
   RSK/jeu-de-taquin toolkit and representation-theoretic applications.

## (b) arXiv / open-access papers

5. **A. Knutson, T. Tao**, "The honeycomb model of $GL_n(\mathbb C)$ tensor products I: proof
   of the saturation conjecture," **arXiv:math/9807160 [math.RT]** (1998); published J. Amer.
   Math. Soc. **12** (1999), 1055–1090. — Introduces the honeycomb/hive model as an
   alternative combinatorial object counting LR coefficients, and proves the saturation
   conjecture ($c_{n\lambda,n\mu}^{n\nu}>0 \Rightarrow c_{\lambda\mu}^\nu>0$). Confirmed:
   this exact arXiv id and title were returned directly by `arxiv.org`-hosted search hits
   (both `/abs/` and `/pdf/` forms), matching the well-known published citation.

6. **A. S. Buch**, "The saturation conjecture (after A. Knutson and T. Tao)," **arXiv:math/9810180
   [math.CO]** (1998, with a later erratum); published Enseign. Math. **46** (2000), 43–60.
   — A short, self-contained exposition of the Knutson–Tao honeycomb proof, written to be
   accessible without the original paper's full machinery. Confirmed via direct
   arxiv.org search hit and abstract snippet.

7. **R. Vakil**, "A geometric Littlewood–Richardson rule," **arXiv:math/0302294 [math.AG]**
   (2003); published Ann. of Math. (2) **164** (2006), 371–421 (with an appendix joint with
   A. Knutson). — Degenerates the intersection of two Schubert varieties into a union of
   Schubert varieties indexed by LR tableaux, giving the first purely geometric proof of the
   rule, over an arbitrary base field, and an explicit bijection to both classical LR
   tableaux and to Knutson–Tao puzzles. Confirmed via direct arxiv.org search hit.

8. **J. R. Stembridge**, "A concise proof of the Littlewood–Richardson rule," Electron. J.
   Combin. **9** (2002), #N5, 4pp. — A very short (4-page) proof using a sign-reversing
   involution on pairs of tableaux; freely available (open access) at combinatorics.org.
   **No arXiv id found** — checked the paper's listing on the author's own publication page
   and several bibliographic search results; none list an arXiv identifier, so this is
   **not** an arXiv paper, only open-access via the journal itself. Do not attach an arXiv
   id to this entry.

## (c) MIT OpenCourseWare

9. **MIT 18.312, Algebraic Combinatorics, Spring 2009** (instructor: Alexander Postnikov),
   OCW page: `ocw.mit.edu/courses/mathematics/18-312-algebraic-combinatorics-spring-2009/projects/`
   (also mirrored at `dspace.mit.edu/bitstream/handle/1721.1/123321/18-312-spring-2009/contents/projects/index.htm`).
   — The course's **Projects** page lists a project topic on writing products of Schur
   functions as sums of Schur functions via Littlewood–Richardson coefficients, explicitly
   citing Stanley EC2 Ch. 7 ("[Sta99]") and Sagan Ch. 4 ("[Sag01]") as the topic's own
   references. Confirmed via multiple independent search snippets quoting this exact project
   description and its two bracketed citations. Useful as a ready-made, MIT-vetted
   reading list pointing straight at entries 2 and 4 above.

   UNCERTAIN / not included as a separate entry: Alexander Postnikov's more advanced topics
   courses (18.217 "Symmetric Group and Symmetric Functions", 18.315/18.318 "Combinatorial
   Theory") cover Schur functions, RSK, the LR rule, and even the honeycomb version of the
   rule in much more depth, and are the more natural lecture-level source — but these live
   on Postnikov's personal MIT math pages (`math.mit.edu/~apost/courses/...`), not on the
   `ocw.mit.edu` OpenCourseWare platform, so they do not qualify as "MIT OCW" per the task's
   own definition and are noted here only as unverified-as-OCW supplementary pointers, not
   counted among the entries above.
