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
