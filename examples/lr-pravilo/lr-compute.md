Computational check that s_{21}·s_{21} = s_{42}+s_{411}+s_{33}+2s_{321}+s_{3111}+s_{222}+s_{2211}, verified two independent ways (brute-force LR skew tableaux vs. SSYT-based Schur polynomials in 6 variables), plus a hook-length dimension check summing to 80.

## What the Littlewood–Richardson rule computes

For partitions λ, μ, ν, the Littlewood–Richardson (LR) coefficient c^ν_{λμ} is defined by either of two equivalent statements:

- **Representation-theoretic / symmetric-function**: it is the structure constant of the ring of symmetric functions in the Schur basis,
  s_λ · s_μ = Σ_ν c^ν_{λμ} s_ν,
  equivalently the multiplicity with which the irreducible GL_n representation V_ν occurs in V_λ ⊗ V_μ, and (by Frobenius reciprocity applied to the symmetric-group side) the multiplicity of the S_n-irreducible S^ν in Ind_{S_p×S_q}^{S_n}(S^λ ⊗ S^μ) for p=|λ|, q=|μ|, n=p+q.
- **Combinatorial (LR rule)**: c^ν_{λμ} equals the number of *Littlewood–Richardson skew tableaux* of shape ν/λ and content μ, i.e. semistandard Young tableaux T of skew shape ν/λ such that:
  1. entries weakly increase left-to-right along each row and strictly increase top-to-bottom down each column (the usual SSYT/semistandard conditions),
  2. the multiset of entries equals the content μ (μ_i copies of the value i),
  3. the **reverse reading word** of T — read each row from right to left, rows taken top to bottom — is a **lattice word** (a.k.a. ballot sequence): in every prefix of the word, the number of occurrences of the letter k is ≥ the number of occurrences of k+1, for every k ≥ 1.

Condition (3) is what turns an ordinary Littlewood–Richardson filling of the skew shape into something that gives the correct structure constant of the ring of symmetric functions (equivalently, of the representation ring). Necessarily ν must contain λ (λ_i ≤ ν_i for all i) and |ν| = |λ|+|μ|.

## Manual check on the small example s_{21}·s_{21}

Take λ = μ = (2,1), so |ν| = 6. Since λ is self-conjugate, ν must contain (2,1). Enumerating all partitions ν of 6 with ν ⊇ (2,1) and, for each, all fillings of the skew shape ν/(2,1) with content (2,1) (two 1's, one 2) satisfying the SSYT + lattice-word conditions above, gives exactly the LR tableaux tabulated in the "Method A" output below. By hand, e.g. for ν=(3,2,1):

```
row0: . . 1        row0: . . 1
row1: . 2           row1: . 1
row2: 1             row2: 2
```
Both fillings are valid SSYT of the skew shape, and both reverse reading words (1,1,2 for the left one; 1,1,2 for the right one, reading right-to-left top-to-bottom) are lattice words, giving c^{(3,2,1)}_{(21),(21)} = 2 — the only multiplicity-2 term in the whole expansion. This matches the classical result

  s_{21} · s_{21} = s_{42} + s_{411} + s_{33} + 2·s_{321} + s_{3111} + s_{222} + s_{2211}.

## Computational verification

Script (SymPy only, no SageMath needed), saved at `.architect/runs/20260926-202238/lr_compute.py`:

```python
"""Check the Littlewood-Richardson expansion of s_{21} * s_{21} two ways.
Method A: brute-force count of LR skew tableaux of shape nu/(2,1), content (2,1).
Method B: bialternant Schur polynomials in 6 variables, verify s_21^2 - sum c_nu s_nu == 0.
Also: hook-length formula for f^nu, check sum c_nu * f^nu == 80.
"""
import itertools
from collections import Counter
from sympy import symbols, factorial, prod, expand, Add, Mul

MU = (2, 1)          # the fixed partition lambda = mu = (2,1)
N = 6                # total size 3+3

def partitions(n, max_part=None):
    if max_part is None:
        max_part = n
    if n == 0:
        yield ()
        return
    for k in range(min(n, max_part), 0, -1):
        for rest in partitions(n - k, k):
            yield (k,) + rest

def contains(nu, mu):
    return all((nu[i] if i < len(nu) else 0) >= (mu[i] if i < len(mu) else 0)
               for i in range(max(len(nu), len(mu))))

def skew_cells(nu, mu):
    cells = []
    for i in range(len(nu)):
        m = mu[i] if i < len(mu) else 0
        for c in range(m, nu[i]):
            cells.append((i, c))
    return cells

def is_ssyt(cells, vals):
    d = dict(zip(cells, vals))
    rows, cols = {}, {}
    for (r, c), v in d.items():
        rows.setdefault(r, []).append((c, v))
        cols.setdefault(c, []).append((r, v))
    for r in rows.values():
        r.sort()
        if any(r[i][1] > r[i + 1][1] for i in range(len(r) - 1)):
            return False
    for c in cols.values():
        c.sort()
        if any(c[i][1] >= c[i + 1][1] for i in range(len(c) - 1)):
            return False
    return True

def reverse_reading_word(cells, vals):
    d = dict(zip(cells, vals))
    by_row = {}
    for (r, c), v in d.items():
        by_row.setdefault(r, []).append((c, v))
    word = []
    for r in sorted(by_row):
        for c, v in sorted(by_row[r], key=lambda x: -x[0]):
            word.append(v)
    return word

def is_lattice(word):
    cnt = {}
    for v in word:
        cnt[v] = cnt.get(v, 0) + 1
        for k in range(1, v):
            if cnt.get(k, 0) < cnt.get(v, 0):
                return False
    return True

def hook_length_f(lam):
    lam = [p for p in lam if p > 0]
    conj = [sum(1 for p in lam if p > i) for i in range(lam[0])] if lam else []
    hooks = []
    for i, li in enumerate(lam):
        for j in range(li):
            arm = li - j - 1
            leg = conj[j] - i - 1
            hooks.append(arm + leg + 1)
    return factorial(sum(lam)) // prod(hooks)

# ---------- Method A: brute-force LR tableaux ----------
content = (2, 1)  # two 1s, one 2
multiset = [1, 1, 2]
candidates = [nu for nu in partitions(N) if contains(nu, MU)]

coeffs_A = {}
tableaux_by_nu = {}
for nu in candidates:
    cells = skew_cells(nu, MU)
    assert len(cells) == sum(content)
    found = []
    for perm in set(itertools.permutations(multiset)):
        if is_ssyt(cells, perm):
            word = reverse_reading_word(cells, perm)
            if is_lattice(word):
                found.append(dict(zip(cells, perm)))
    if found:
        coeffs_A[nu] = len(found)
        tableaux_by_nu[nu] = found

print("=== Method A: brute-force LR tableaux, nu/(2,1) content (2,1) ===")
for nu in candidates:
    c = coeffs_A.get(nu, 0)
    tag = " <-- c_nu > 0" if c else ""
    print(f"nu={nu}: c_nu = {c}{tag}")

print("\nLR tableaux found (row lists, '.' = cell of mu = (2,1)):")
for nu, tabs in tableaux_by_nu.items():
    print(f" nu = {nu}:")
    for t in tabs:
        rows = []
        for i in range(len(nu)):
            m = MU[i] if i < len(MU) else 0
            row = ['.'] * m + [str(t[(i, c)]) for c in range(m, nu[i])]
            rows.append(row)
        print("   ", rows)

# ---------- Method B: Schur polynomials in N variables via direct SSYT sum ----------
# (an independent combinatorial route from Method A: straight-shape SSYT with
#  entries in {1,...,N}, no lattice-word / skew-shape machinery reused)
xs = symbols(f'x1:{N+1}')

def schur(lam, n):
    lam = [p for p in lam if p > 0]
    cells = [(i, c) for i in range(len(lam)) for c in range(lam[i])]
    monomials = Counter()
    for vals in itertools.product(range(1, n + 1), repeat=len(cells)):
        d = dict(zip(cells, vals))
        ok = True
        for i in range(len(lam)):
            row = [d[(i, c)] for c in range(lam[i])]
            if any(row[k] > row[k + 1] for k in range(len(row) - 1)):
                ok = False
                break
        if ok:
            maxcol = lam[0] if lam else 0
            for c in range(maxcol):
                col = [d[(i, c)] for i in range(len(lam)) if c < lam[i]]
                if any(col[k] >= col[k + 1] for k in range(len(col) - 1)):
                    ok = False
                    break
        if not ok:
            continue
        counts = [0] * n
        for v in vals:
            counts[v - 1] += 1
        monomials[tuple(counts)] += 1
    terms = [coef * Mul(*[xs[i] ** e for i, e in enumerate(exp) if e])
             for exp, coef in monomials.items()]
    return Add(*terms) if terms else 0

s21 = schur(MU, N)
lhs = expand(s21 * s21)
rhs = expand(sum(c * schur(nu, N) for nu, c in coeffs_A.items()))
diff = expand(lhs - rhs)

print("\n=== Method B: SSYT-based Schur-polynomial check in", N, "variables ===")
print("s_21 * s_21 - sum_nu c_nu * s_nu simplifies to:", diff)
print("Difference is exactly zero:", diff == 0)

# ---------- hook-length check ----------
print("\n=== hook-length formula check ===")
total = 0
for nu, c in coeffs_A.items():
    f = hook_length_f(nu)
    total += c * f
    print(f"nu={nu}: c_nu={c}, f^nu={f}, c_nu*f^nu={c*f}")
print("sum c_nu * f^nu =", total)
```

Note on Method B: the node's suggested route was the bialternant determinant formula det(x_i^{λ_j+n-j})/Vandermonde. An initial implementation of that route (symbolic 6×6 determinants divided and simplified with SymPy) did not finish in reasonable time — multivariate rational-function simplification of two full 6×6 monomial determinants is expensive in SymPy. Per the node's explicit fallback ("or via semistandard tableaux"), Method B was instead implemented as direct enumeration of ordinary (straight-shape) semistandard tableaux with entries in {1,…,6}, summing their monomials to build each s_ν(x_1,…,x_6). This is mathematically the same bialternant/Jacobi–Trudi-equivalent object but reached by a route that shares no code with Method A's skew/lattice-word logic (Method A checks skew-shape fillings with a lattice-word condition; Method B checks straight-shape fillings with no lattice-word condition at all), so the two methods remain independent checks of the same coefficients. This ran in under 2 seconds.

The node text also states "the largest number of rows, which is 4" — this is not quite right: among the 9 partitions ν of 6 containing (2,1), the partition (2,1,1,1,1) has 5 rows (its LR coefficient turns out to be 0, and (5,1) — its conjugate — also has coefficient 0). Using N=6 variables (≥ 5) as specified is safe and was used throughout; this discrepancy is noted for the record and does not affect the result.

### Actual printed output (both methods run against each other, unedited)

```
=== Method A: brute-force LR tableaux, nu/(2,1) content (2,1) ===
nu=(5, 1): c_nu = 0
nu=(4, 2): c_nu = 1 <-- c_nu > 0
nu=(4, 1, 1): c_nu = 1 <-- c_nu > 0
nu=(3, 3): c_nu = 1 <-- c_nu > 0
nu=(3, 2, 1): c_nu = 2 <-- c_nu > 0
nu=(3, 1, 1, 1): c_nu = 1 <-- c_nu > 0
nu=(2, 2, 2): c_nu = 1 <-- c_nu > 0
nu=(2, 2, 1, 1): c_nu = 1 <-- c_nu > 0
nu=(2, 1, 1, 1, 1): c_nu = 0

LR tableaux found (row lists, '.' = cell of mu = (2,1)):
 nu = (4, 2):
    [['.', '.', '1', '1'], ['.', '2']]
 nu = (4, 1, 1):
    [['.', '.', '1', '1'], ['.'], ['2']]
 nu = (3, 3):
    [['.', '.', '1'], ['.', '1', '2']]
 nu = (3, 2, 1):
    [['.', '.', '1'], ['.', '2'], ['1']]
    [['.', '.', '1'], ['.', '1'], ['2']]
 nu = (3, 1, 1, 1):
    [['.', '.', '1'], ['.'], ['1'], ['2']]
 nu = (2, 2, 2):
    [['.', '.'], ['.', '1'], ['1', '2']]
 nu = (2, 2, 1, 1):
    [['.', '.'], ['.', '1'], ['1'], ['2']]

=== Method B: SSYT-based Schur-polynomial check in 6 variables ===
s_21 * s_21 - sum_nu c_nu * s_nu simplifies to: 0
Difference is exactly zero: True

=== hook-length formula check ===
nu=(4, 2): c_nu=1, f^nu=9, c_nu*f^nu=9
nu=(4, 1, 1): c_nu=1, f^nu=10, c_nu*f^nu=10
nu=(3, 3): c_nu=1, f^nu=5, c_nu*f^nu=5
nu=(3, 2, 1): c_nu=2, f^nu=16, c_nu*f^nu=32
nu=(3, 1, 1, 1): c_nu=1, f^nu=10, c_nu*f^nu=10
nu=(2, 2, 2): c_nu=1, f^nu=5, c_nu*f^nu=5
nu=(2, 2, 1, 1): c_nu=1, f^nu=9, c_nu*f^nu=9
sum c_nu * f^nu = 80
```
(Wall-clock time: ≈1.5 s total on this machine.)

## Final expansion

Both methods agree exactly:

  **s_{21} · s_{21} = s_{42} + s_{411} + s_{33} + 2·s_{321} + s_{3111} + s_{222} + s_{2211}**

with all other ν ⊇ (2,1) of size 6 — namely (5,1) and (2,1,1,1,1) — contributing coefficient 0. The SymPy polynomial difference s_{21}²(x₁,…,x₆) − Σ c_ν s_ν(x₁,…,x₆) expands to exactly `0`, and Σ c_ν f^ν = 80, which independently equals f^{(2,1)}·f^{(2,1)}·C(6,3) = 2·2·20 = 80 (the dimension identity for Res^{S_6}_{S_3×S_3} of the induced representation, since f^{(2,1)} = 2 for partitions of 3 by the hook-length formula).

## Key sources for the Littlewood–Richardson rule

- W. Fulton, *Young Tableaux: With Applications to Representation Theory and Geometry*, London Mathematical Society Student Texts 35, Cambridge University Press, 1997 — Chapter 5 (Littlewood–Richardson rule, skew tableaux, lattice/ballot words), the standard combinatorial reference used for the definitions above.
- I. G. Macdonald, *Symmetric Functions and Hall Polynomials*, 2nd ed., Oxford University Press, 1995 — Chapter I, §9 (Littlewood–Richardson rule as Schur-function structure constants).
- R. P. Stanley, *Enumerative Combinatorics, Volume 2*, Cambridge University Press, 1999 — Chapter 7 and Appendix A1 (symmetric functions, Schur functions, the LR rule, hook-length formula).
- B. E. Sagan, *The Symmetric Group: Representations, Combinatorial Algorithms, and Symmetric Functions*, 2nd ed., Graduate Texts in Mathematics 203, Springer, 2001 — Chapter 4 (RSK, tableaux, Littlewood–Richardson rule, hook-length formula for f^λ).
- A. Knutson and T. Tao, "The honeycomb model of GL_n(C) tensor products I: Proof of the saturation conjecture," *J. Amer. Math. Soc.* 12 (1999), 1055–1090; arXiv:math/9807160 — an alternative (honeycomb/hive) model for the same LR coefficients, useful context for why the classical tableau rule is one of several equivalent combinatorial models.
- MIT OpenCourseWare, 18.212 Algebraic Combinatorics (Prof. Alexander Postnikov) — covers Young tableaux, Schur polynomials and symmetric-function combinatorics that underlie the LR rule; UNCERTAIN whether a specific lecture in the published OCW notes treats the LR rule itself in full detail (not independently re-verified here since this node's research flag is "no"; the more load-bearing citations above are textbook chapters that do cover it explicitly).

All of the numerical/combinatorial claims above (the 9 candidate ν, the 7 LR tableaux, the coefficients including the multiplicity-2 case ν=(3,2,1), the polynomial identity, and the hook-length sum 80) were verified by the script in this run, not taken on faith from the references.
