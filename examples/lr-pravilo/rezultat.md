Povzetek: Littlewood–Richardsonovo (LR) pravilo; ročno izpeljani razvoj s_{21}·s_{21} = s_{42}+s_{411}+s_{33}+2s_{321}+s_{3111}+s_{222}+s_{2211} (8 LR-tablojev) se ujema z izračunom `lr-compute`; preizkus dimenzij da Σ c^ν f^ν = 80.

# Littlewood–Richardsonovo pravilo

## 1. Kaj pravilo izračuna

Naj bo Λ kolobar simetričnih funkcij in {s_λ} baza Schurovih funkcij, indeksirana z razčlenitvami λ. Produkt dveh Schurovih funkcij je spet simetrična funkcija, zato se razvije v isti bazi:

  s_λ · s_μ = Σ_ν c^ν_{λμ} s_ν .

Števila c^ν_{λμ} so **Littlewood–Richardsonovi koeficienti** (strukturne konstante Λ v Schurovi bazi). Znano je, da so nenegativna cela števila. LR-pravilo jih izrazi kot število določenih tablojev in s tem to dokaže (Macdonald I §9; Fulton pogl. 5).

Enakovredne interpretacije:

- **Reprezentacije GL_n(ℂ).** Karakter nerazcepne polinomske reprezentacije V_λ (ℓ(λ) ≤ n) je s_λ(x_1,…,x_n), in s_ν(x_1,…,x_n) = 0, kadar je ℓ(ν) > n. Zato velja V_λ ⊗ V_μ ≅ ⊕_{ℓ(ν)≤n} V_ν^{⊕ c^ν_{λμ}}, tj. c^ν_{λμ} je večkratnost V_ν v tenzorskem produktu (to je izhodišče dela Knutson–Tao). Na strani simetrične grupe je c^ν_{λμ} večkratnost S^ν v Ind_{S_p×S_q}^{S_{p+q}}(S^λ ⊠ S^μ).
- **Schubertov račun.** V H*(Gr(k,ℂ^n)) z bazo Schubertovih razredov σ_λ, λ ⊆ k×(n−k), velja σ_λ·σ_μ = Σ_{ν ⊆ k×(n−k)} c^ν_{λμ} σ_ν. Kadar je |ν| = |λ|+|μ|, je c^ν_{λμ} število točk v preseku treh Schubertovih varietet X_λ, X_μ, X_{ν^∨} glede na tri splošne zastavice, kjer je ν^∨ komplement ν v pravokotniku (Vakil, arXiv:math/0302294).

## 2. Kombinatorična formulacija

**Poševna oblika.** Za λ ⊆ ν (tj. λ_i ≤ ν_i za vse i) je ν/λ množica celic Youngovega diagrama ν, ki niso v λ. Uporabljamo angleško konvencijo: vrstica 1 je zgoraj, celica (i,j) je v vrstici i in stolpcu j.

**Polstandardna zapolnitev.** Polstandardni tabló oblike ν/λ je zapolnitev celic ν/λ s pozitivnimi celimi števili, ki
 (a) po vsaki vrstici od leve proti desni **šibko naraščajo**,
 (b) po vsakem stolpcu od zgoraj navzdol **strogo naraščajo**.

**Vsebina.** Tabló ima vsebino μ = (μ_1, μ_2, …), če vsebuje natanko μ_i vpisov, enakih i, za vsak i.

**Obrnjena bralna beseda.** w(T) dobimo tako, da vsako vrstico beremo **od desne proti levi**, vrstice pa jemljemo **od zgoraj navzdol**.

**Mrežna (Yamanouchijeva, volilna) beseda.** Beseda w_1 w_2 … w_m je mrežna, če za vsak začetni del w_1…w_r in vsak k ≥ 1 velja
  #{s ≤ r : w_s = k} ≥ #{s ≤ r : w_s = k+1}.
(Npr. 112 in 121 sta mrežni, 211 ni, ker začetni del „2“ vsebuje več dvojk kot enic.)

**Definicija.** *LR-tabló* oblike ν/λ in vsebine μ je polstandardni tabló T oblike ν/λ z vsebino μ, katerega obrnjena bralna beseda w(T) je mrežna.

**Izrek (Littlewood–Richardsonovo pravilo).**
  c^ν_{λμ} = število LR-tablojev oblike ν/λ in vsebine μ.

Posledice in pripombe:
- c^ν_{λμ} ≠ 0 zahteva |ν| = |λ| + |μ| (s_λ je homogena stopnje |λ|) in λ ⊆ ν (sicer poševna oblika ne obstaja).
- Ker je Λ komutativen, velja **simetrija** c^ν_{λμ} = c^ν_{μλ}. Iz nje sledi tudi μ ⊆ ν. Simetrija iz definicije LR-tablojev ni očitna, saj sta vlogi λ (oblika) in μ (vsebina) različni.
- Mrežnost zahteva, da je prva črka w(T) enaka 1. Za vsebino (2,1) (dve enici, ena dvojka) sta možni besedi 112, 121 in 211. Mrežni sta natanko prvi dve, zato je **pogoj mrežnosti tu enakovreden temu, da w(T) ne začne z 2**.

## 3. Ročni preizkus: s_{21} · s_{21}

Tu je λ = μ = (2,1), zato |ν| = 6 in ν ⊇ (2,1), tj. ν_1 ≥ 2 in ν_2 ≥ 1. Od 11 razčlenitev števila 6 izpadeta (6) in (1^6). Ostane **9 kandidatov**:

  (5,1), (4,2), (4,1,1), (3,3), (3,2,1), (3,1,1,1), (2,2,2), (2,2,1,1), (2,1,1,1,1).

Vsaka poševna oblika ν/(2,1) ima 3 celice. Vanje vpisujemo multimnožico {1,1,2}, torej za vsak ν obstajajo natanko **3 zapolnitve**, ki jih določa lega dvojke. Celice označimo z c1, c2, c3 v vrstnem redu obrnjenega branja. Dvojka v c1, c2 oziroma c3 da besedo 211, 121 oziroma 112. V spodnjih diagramih „·“ označuje celico λ = (2,1).

**ν = (5,1).** Celice: c1=(1,5), c2=(1,4), c3=(1,3), vse v eni vrstici.
- 2 v c1: vrstica 1 1 2 je polstandardna, beseda pa je **211** ✗ (ni mrežna).
- 2 v c2: vrstica 1 2 1 ✗ (vrstica ne narašča šibko).
- 2 v c3: vrstica 2 1 1 ✗ (vrstica).
→ c = 0.

**ν = (4,2).** c1=(1,4), c2=(1,3), c3=(2,2).
```
· · 1 1
· 2
```
- 2 v c3 (zgoraj): polstandardna, w = 112 ✓.
- 2 v c1: `· · 1 2 / · 1` je polstandardna, w = 211 ✗.
- 2 v c2: vrstica 1 je `2 1` ✗ (vrstica).
→ c = 1.

**ν = (4,1,1).** c1=(1,4), c2=(1,3), c3=(3,1).
```
· · 1 1
·
2
```
- 2 v c3: polstandardna, w = 112 ✓.
- 2 v c1: w = 211 ✗.
- 2 v c2: vrstica 1 je `2 1` ✗.
→ c = 1.

**ν = (3,3).** c1=(1,3), c2=(2,3), c3=(2,2). Celici c1 in c2 sta v istem stolpcu.
```
· · 1
· 1 2
```
- 2 v c2: vrstica 2 je `1 2` ✓, stolpec 3 je 1 nad 2 ✓, w = 1,2,1 = 121 ✓.
- 2 v c1: stolpec 3 je 2 nad 1 ✗ (stolpec); tudi w = 211 ✗.
- 2 v c3: vrstica 2 je `2 1` ✗ (vrstica).
→ c = 1.

**ν = (3,2,1).** c1=(1,3), c2=(2,2), c3=(3,1). Nobeni dve celici nista v isti vrstici ali stolpcu, zato so vse tri zapolnitve polstandardne.
```
T1:  · · 1        T2:  · · 1
     · 1               · 2
     2                 1
     w = 112 ✓         w = 121 ✓
```
- 2 v c1 (`· · 2 / · 1 / 1`): w = 211 ✗ (ni mrežna).
→ **c = 2**. To sta oba LR-tabloja oblike (3,2,1)/(2,1).

**ν = (3,1,1,1).** c1=(1,3), c2=(3,1), c3=(4,1). Celici c2 in c3 sta v istem stolpcu.
```
· · 1
·
1
2
```
- 2 v c3: stolpec 1 je 1 nad 2 ✓, w = 112 ✓.
- 2 v c2: stolpec je 2 nad 1 ✗.
- 2 v c1: stolpec je 1 nad 1 ✗ (ni strogo); tudi w = 211 ✗.
→ c = 1.

**ν = (2,2,2).** c1=(2,2), c2=(3,2), c3=(3,1). Celici c1 in c2 sta v istem stolpcu, c2 in c3 pa v isti vrstici.
```
· ·
· 1
1 2
```
- 2 v c2: vrstica 3 je `1 2` ✓, stolpec 2 je 1 nad 2 ✓, w = 1,2,1 = 121 ✓.
- 2 v c1: stolpec 2 je 2 nad 1 ✗; tudi w = 211 ✗.
- 2 v c3: vrstica 3 je `2 1` ✗.
→ c = 1.

**ν = (2,2,1,1).** c1=(2,2), c2=(3,1), c3=(4,1).
```
· ·
· 1
1
2
```
- 2 v c3: w = 112 ✓.
- 2 v c2: stolpec 1 je 2 nad 1 ✗.
- 2 v c1: stolpec 1 je 1 nad 1 ✗; tudi w = 211 ✗.
→ c = 1.

**ν = (2,1,1,1,1).** c1=(3,1), c2=(4,1), c3=(5,1), vse v enem stolpcu. Strogo naraščanje bi zahtevalo tri različne vrednosti, vsebina pa ima dve enici. Nobena zapolnitev ni polstandardna.
→ c = 0.

**Rezultat ročnega štetja (skupaj 8 LR-tablojev):**

  **s_{21} · s_{21} = s_{42} + s_{411} + s_{33} + 2 s_{321} + s_{3111} + s_{222} + s_{2211}.**

*Neodvisna kontrola s konjugacijo.* Involucija ω na Λ (ω s_λ = s_{λ'}) je homomorfizem kolobarjev in velja (2,1)' = (2,1). Zato mora biti razvoj invarianten za λ ↦ λ'. Res se pari (4,2)↔(2,2,1,1), (4,1,1)↔(3,1,1,1), (3,3)↔(2,2,2) in (5,1)↔(2,1,1,1,1) ujemajo po koeficientih, (3,2,1) pa je samokonjugirana.

## 4. Preizkus dimenzij

Naj bo f^ν število standardnih tablojev oblike ν, ⊢ n. Po formuli s kavlji je f^ν = n!/∏ h(c), kjer je h(c) dolžina kavlja celice c. Utemeljitev identitete: preslikava, ki simetrični funkciji stopnje n priredi njen koeficient pri x_1x_2⋯x_n, deljen z n!, je homomorfizem kolobarjev („eksponentna specializacija“) in slika s_ν v f^ν/n!. Iz s_λ s_μ = Σ c^ν_{λμ} s_ν zato sledi

  Σ_ν c^ν_{λμ} f^ν = C(|λ|+|μ|, |λ|) · f^λ f^μ.

Reprezentacijsko: obe strani sta dimenziji Ind_{S_3×S_3}^{S_6}(S^{21} ⊠ S^{21}). Za λ = μ = (2,1) imamo kavlje 3,1,1, torej f^{21} = 6/3 = 2, in desna stran je C(6,3)·2·2 = 20·4 = **80**.

| ν | dolžine kavljev po vrsticah | ∏ h | f^ν = 720/∏h | c^ν | c^ν f^ν |
|---|---|---|---|---|---|
| (4,2) | 5 4 2 1 / 2 1 | 80 | **9** | 1 | 9 |
| (4,1,1) | 6 3 2 1 / 2 / 1 | 72 | **10** | 1 | 10 |
| (3,3) | 4 3 2 / 3 2 1 | 144 | **5** | 1 | 5 |
| (3,2,1) | 5 3 1 / 3 1 / 1 | 45 | **16** | 2 | 32 |
| (3,1,1,1) | 6 2 1 / 3 / 2 / 1 | 72 | **10** | 1 | 10 |
| (2,2,2) | 4 3 / 3 2 / 2 1 | 144 | **5** | 1 | 5 |
| (2,2,1,1) | 5 2 / 4 1 / 2 / 1 | 80 | **9** | 1 | 9 |
| **vsota** | | | | 8 tablojev | **80** ✓ |

9 + 10 + 5 + 32 + 10 + 5 + 9 = 80 = C(6,3)·f^{21}·f^{21}.

## 5. Računski preizkus (`lr-compute`) in primerjava

Skripta `.architect/runs/20260926-202238/lr_compute.py` (Python + SymPy, brez SageMath) preveri rezultat na dva neodvisna načina:

- **Metoda A (grobo štetje LR-tablojev):** za vseh 9 razčlenitev ν ⊢ 6, ν ⊇ (2,1), preveri vse permutacije multimnožice {1,1,2} na celicah ν/(2,1). Za vsako preveri polstandardnost (vrstice šibko, stolpci strogo) in mrežnost obrnjene bralne besede (vrstice od desne proti levi, od zgoraj navzdol).
- **Metoda B (polinomska identiteta):** Schurove polinome s_ν(x_1,…,x_6) zgradi kot vsote monomov po navadnih polstandardnih tablojih z vpisi v {1,…,6}, brez pogoja mrežnosti in brez poševnih oblik. Nato preveri, da je s_{21}² − Σ c^ν s_ν ≡ 0. Ker imajo vse razčlenitve števila 6 največ 6 delov, so s_ν(x_1,…,x_6) za ν ⊢ 6 linearno neodvisni. Ničelna razlika zato enolično potrdi vse koeficiente, ne le njihove kombinacije.
- Dodatno izračuna f^ν s formulo s kavlji in vsoto Σ c^ν f^ν.

Skripto sem v tem koraku ponovno pognal in izpis se ujema z zapisanim (Metoda B: „Difference is exactly zero: True“; vsota 80). Recenzija `lr-compute.review.md`: PASS.

| ν | ročno c^ν | `lr-compute` c^ν | ročni LR-tabloji | tabloji iz `lr-compute` | f^ν (ročno / skripta) |
|---|---|---|---|---|---|
| (5,1) | 0 | 0 | — | — | — |
| (4,2) | 1 | 1 | `··11/·2` | `[..11],[.2]` | 9 / 9 |
| (4,1,1) | 1 | 1 | `··11/·/2` | `[..11],[.],[2]` | 10 / 10 |
| (3,3) | 1 | 1 | `··1/·12` | `[..1],[.12]` | 5 / 5 |
| (3,2,1) | 2 | 2 | `··1/·1/2`, `··1/·2/1` | oba ista | 16 / 16 |
| (3,1,1,1) | 1 | 1 | `··1/·/1/2` | `[..1],[.],[1],[2]` | 10 / 10 |
| (2,2,2) | 1 | 1 | `··/·1/12` | `[..],[.1],[12]` | 5 / 5 |
| (2,2,1,1) | 1 | 1 | `··/·1/1/2` | `[..],[.1],[1],[2]` | 9 / 9 |
| (2,1,1,1,1) | 0 | 0 | — | — | — |
| **vsota** | 8 | 8 | | | Σ c f = 80 / 80 |

**Ujemanje je popolno**, člen za členom, vključno s tabloji. Neskladij med ročnim in računskim rezultatom ni.

Popravki besedila `lr-compute.md` (na rezultat ne vplivajo):
1. Za ν = (3,2,1) poročilo navaja, da imata oba tabloja obrnjeno bralno besedo 1,1,2. To ne drži: tabló z 2 v drugi vrstici (`··1/·2/1`) ima besedo **1,2,1**, drugi pa 1,1,2. Obe sta mrežni, zato c = 2 ostane pravilen.
2. V utemeljitvi vsote 80 piše „Res^{S_6}_{S_3×S_3}“. Prav je Ind_{S_3×S_3}^{S_6}.
3. Seznam virov v `lr-compute.md` navaja MIT 18.212 Algebraic Combinatorics (Postnikov). Tak predmet na MIT OCW obstaja (pomlad 2019), vendar ga `lit-sources` ni preverjal. Zato seznam virov spodaj uporablja preverjeni vnos iz `lit-sources`: **18.312, pomlad 2009**, stran Projects. Pri Stanleyju je natančnejši sklic za LR-pravilo Dodatek 1, §A1.3.

## 6. Viri

Vsi viri so iz poročila `lit-sources`. Pri Stanleyju `lit-sources` predlaga sklic „§7.17, Pos. 7.17.5“ namesto §7.10. Ta sklic ne zdrži: v EC2 je §7.17 „The Murnaghan–Nakayama rule“, Pos. 7.17.5 pa govori o karakterjih simetrične grupe. LR-pravilo je v EC2 v Dodatku 1, §A1.3, zato navajam ta sklic. Pri Saganu §4.9 ni potrjen. `lit-sources` je vire preverjal z iskalnimi zadetki, ne z branjem samih strani, ker je bil WebFetch blokiran.

**Učbeniki**
1. W. Fulton, *Young Tableaux: With Applications to Representation Theory and Geometry*, LMS Student Texts 35, Cambridge UP, 1997. **Poglavje 5, „The Littlewood–Richardson Rule“**; **Dodatek A** (različice formulacije LR-tablojev, jeu de taquin). Najprimernejše prvo branje.
2. R. P. Stanley, *Enumerative Combinatorics, Vol. 2*, Cambridge UP, 1999. **Pogl. 7** (simetrične funkcije, definicija koeficientov c^ν_{λμ}) in **Dodatek 1 (S. Fomin), §A1.3, „The Littlewood–Richardson rule“** (LR-pravilo in dokaz prek RSK/jeu de taquin; zlasti Def. A1.3.10).
3. I. G. Macdonald, *Symmetric Functions and Hall Polynomials*, 2. izd., Oxford UP, 1995. **Pogl. I, §9, „The Littlewood–Richardson rule“**.
4. B. E. Sagan, *The Symmetric Group*, 2. izd., GTM 203, Springer, 2001. **Poglavje 4** (RSK, jeu de taquin, Schurove funkcije, LR-pravilo). UNCERTAIN: natančen razdelek (§4.9) ni potrjen.

**arXiv**
5. A. Knutson, T. Tao, „The honeycomb model of GL_n(ℂ) tensor products I: proof of the saturation conjecture“, **arXiv:math/9807160**; J. Amer. Math. Soc. 12 (1999), 1055–1090. Model satovja (honeycomb) za c^ν_{λμ} kot večkratnosti v tenzorskih produktih; dokaz domneve o nasičenosti.
6. A. S. Buch, „The saturation conjecture (after A. Knutson and T. Tao)“, **arXiv:math/9810180**; Enseign. Math. 46 (2000), 43–60. Kratka pregledna razlaga vira 5.
7. R. Vakil, „A geometric Littlewood–Richardson rule“, **arXiv:math/0302294**; Ann. of Math. 164 (2006), 371–421. Geometrijski dokaz prek degeneracij Schubertovih varietet; bijekcija z LR-tabloji in s sestavljankami (puzzles) Knutsona in Taa.

**MIT OpenCourseWare**
8. **MIT 18.312 Algebraic Combinatorics, pomlad 2009** (A. Postnikov), stran **Projects** na ocw.mit.edu. Projektna tema o razvoju produktov Schurovih funkcij z LR-koeficienti, s sklici na Stanley EC2 pogl. 7 in Sagan pogl. 4.

Opomba: `lit-sources` navaja še J. R. Stembridge, „A concise proof of the Littlewood–Richardson rule“, Electron. J. Combin. 9 (2002), #N5 (odprti dostop, brez arXiv id). Kratki dokaz s protiznačnostno involucijo je vreden branja, vendar ga v oštevilčeni seznam nisem uvrstil, ker nima poglavja, razdelka ali arXiv id.
