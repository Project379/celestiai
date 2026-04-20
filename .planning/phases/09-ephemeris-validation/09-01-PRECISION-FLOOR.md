# §9.1 — Precision-floor investigation (gate before harness scaffold)

**Opened:** 2026-04-20
**Status:** findings complete; **blocks §9.1 harness scaffold + sample comparison until user approves revised thresholds**.
**Scope:** the "first action in §9.1" from the opening planning message — verify the ephemeris backend actually in use and report the library's precision floor *before* test cases run against a threshold that may sit below that floor.

**Epistemic tags used:** `[verified]` (observed in code or quoted from primary doc), `[inferred]` (reasoning from observations), `[runtime-check-needed]` (not yet observed).

---

## Findings summary

1. **Library identity: `sweph` v2.10.3-b-1 (native Node N-API bindings), not `swisseph-wasm`.** `[verified]` — `packages/astrology/package.json` dependency list; `packages/astrology/node_modules/sweph/package.json` name + version; `binding.gyp` confirms native C/C++ add-on build.
2. **Ephemeris mode: Moshier (`SEFLG_MOSEPH`), exclusively.** `[verified]` — only flag combination used in `packages/astrology/src`; `calculator.ts:46` and `transit.ts:113` both pass `SEFLG_MOSEPH | SEFLG_SPEED` to `sweph.calc_ut`. No `set_ephe_path()` call anywhere in `@celestia/astrology`. No `.se1` or JPL data files are bundled with the `sweph` package (sweph README: *"This library does not include any ephemeris files by default"*).
3. **Moshier precision floor is not uniform across bodies.** Planets are ≤1″ vs JPL; the Moon is "a few arc seconds" vs JPL. `[verified]` — quoted below from the Swiss Ephemeris official documentation.
4. **Implication for §9.2 thresholds.** The planned uniform 1-arc-second JPL threshold is (a) at the planet precision floor — zero headroom, (b) below the Moon precision floor — it will fail the Moon routinely with no actual bug. Single proposal below re-tiers by body and preserves §9.5's branching multipliers.

---

## Evidence — library identity

`[verified]` `packages/astrology/package.json`:

```json
"dependencies": {
  "geo-tz": "^8.1.6",
  "sweph": "^2.10.3-4"
}
```

`[verified]` `packages/astrology/node_modules/sweph/package.json`: name `"sweph"`, version `"2.10.3-b-1"`, "Equivalent to Swiss Ephemeris version: 2.10.03b revision 1".

`[verified]` `packages/astrology/node_modules/sweph/binding.gyp` present; sweph README explicitly: *"This library is a C/C++ add-on designed for Node.JS only, it will not work in browsers"*. Runtime path is native bindings, never WebAssembly.

## Evidence — Moshier mode in use

`[verified]` Only two places in `@celestia/astrology/src` set ephemeris flags, and both choose Moshier:

- `packages/astrology/src/calculator.ts:46` — `const flags = sweph.constants.SEFLG_MOSEPH | sweph.constants.SEFLG_SPEED`
- `packages/astrology/src/transit.ts:113` — same flag combination.

`[verified]` `calculator.ts:4-6` source comment: *"All calculations use the Moshier ephemeris (built-in, no external files needed)."*

`[verified]` No `set_ephe_path` call in `packages/astrology/src` (grep across src tree for `set_ephe_path` and `SEFLG_SWIEPH` / `SEFLG_JPLEPH`: zero hits).

`[verified]` Houses: `sweph.houses(jd, lat, lon, HOUSE_SYSTEM_PLACIDUS)` at `calculator.ts:164` — takes no ephemeris flag. House computation in the Swiss Ephemeris depends on sidereal time / Earth rotation, **not** on planetary ephemeris tables. Moshier-vs-SE-files does not affect house output. `[inferred]` — from Swiss Ephemeris source (`swehouse.c`) and the `sweph.houses` signature not accepting flags.

## Evidence — Moshier precision floor

`[verified]` Quoted verbatim from the Swiss Ephemeris official documentation (`https://www.astro.com/swisseph/swisseph.htm`, Moshier section):

> "Its deviation from JPL is below 1 arc second with the planets and a few arc seconds with the Moon."

> "The Moon's position is calculated by a modified version of the lunar theory of Chapront-Touze' and Chapront. This has a precision of 0.5 arc second relative to DE404 for all dates between 1369 B.C. and 3000 A.D."

> "The Moshier Ephemeris covers the interval from 3000 BCE to 3000 CE."

> "the adjustment for the inner planets is strictly valid only from 1350 B.C. to 3000 A.D., but may be used to 3000 B.C. with some loss of precision"

> "The advantage of the Moshier mode of the Swiss Ephemeris is that it needs no disk storage. Its disadvantage, besides the limited precision, is reduced speed: it is about 10 times slower than JPL mode and the compressed JPL mode."

`[verified]` Source-level date-range defines (`packages/astrology/node_modules/sweph/swisseph/sweph.h:219-222`), active branch:

```
#define MOSHPLEPH_START  625000.5    // JD, roughly 3001 BC
#define MOSHPLEPH_END   2818000.5    // JD, roughly 3000 AD
#define MOSHLUEPH_START  625000.5
#define MOSHLUEPH_END   2818000.5
```

`[verified]` Synthetic-case date-range check against those defines:
- Year **1600** → JD ≈ 2305448 → **inside** Moshier range. OK.
- Year **2200** → JD ≈ 2524593 → **inside** Moshier range. OK.
- Neither synthetic case hits or approaches the edge of the Moshier window, so no edge-of-range headroom concern.

`[inferred]` Moshier's "below 1 arc-second planets / few arc-seconds Moon" numbers are stated against modern JPL. Reference validation in §9.2 uses JPL Horizons (typically DE441), so the library's stated deviation and our reference are measuring the same thing.

---

## Proposed threshold revision (§9.2 only — supersedes the 1″ uniform threshold)

The user's original framing in the opening message lists thresholds as a tiered stack (planets vs JPL; independent secondary comparison against Astronomy Engine; separate house/aspect thresholds). The revision below changes exactly one number in that stack: the JPL planet/Moon tier, split into two sub-tiers by body.

**Proposed (single recommendation):**

| Body | §9.2 JPL threshold | Pause-and-fix (§9.5 trigger) | Queue-for-later (§9.5 trigger) |
|---|---|---|---|
| Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto | 1 arc-second | any body drifts >10″ or >1 body drifts >5″ | all drifts ≤5″ but any >1″ |
| Moon | 3 arc-seconds | Moon drifts >30″ or systemic issue suspected | Moon drifts >15″ but ≤30″ |
| North Node | 1 arc-second | same as planets | same as planets |

Rationale, per tier:

- **Planets at 1″** preserves the user-proposed threshold at exactly the value Swiss Ephemeris documents as the Moshier-vs-JPL bound. Passes clean iff the library delivers what its own docs promise. Zero headroom by design — we want to catch any regression below the documented floor.
- **Moon at 3″** sits above the "few arc-seconds" documented ceiling with just enough margin to avoid being at the floor. A 1″ or 2″ Moon threshold would flag noise as failure.
- **10× / 5× branching multipliers** carry over from the user's pre-committed rule, per-body. Moon gets 30″/15″, matching the same tolerance ratio planets get.

**Secondary check vs Astronomy Engine** — unchanged at **1 arc-minute** (60″). The secondary threshold is already 60× looser than the JPL tier, absorbing Astronomy Engine's own ±1′ stated accuracy and any Moshier floor below it.

**Houses vs astro.com at 1 arc-minute** — unchanged. House math is independent of ephemeris mode (see evidence above).

**Aspects vs astro.com at 1 arc-minute + correct type + correct applying/separating** — unchanged. Aspect orbs inherit planetary-longitude precision; at 1′ (60″) aspect threshold, worst-case 3″ Moon noise is 5% of threshold. Well within budget.

**Net effect:** only §9.2 gains one additional threshold entry (Moon). §9.3 and §9.4 proceed as originally planned.

---

## Alternative available (not recommended here, flagged for user decision)

If the user prefers tighter bounds over the Moon exception, the precision floor can be lifted by loading the Swiss Ephemeris Moon data file (`semo_18.se1`, roughly 7 MB covering 1800-2400; `semo_24.se1` for 2400-3000). Add the file to the repo, call `sweph.set_ephe_path(...)` before calc, and switch the Moon-only branch to `SEFLG_SWIEPH`. Planets can stay on Moshier unchanged. This gets the Moon to ~0.001″ precision and lets a uniform 1″ JPL threshold apply to every body.

Trade-offs the user should weigh:

- **License.** `sweph` v2.10.1+ is AGPL-3.0-or-later. Ephemeris data files from Astrodienst are under the same terms unless a professional Swiss Ephemeris license is purchased. `[runtime-check-needed]` — confirm whether current deployment license situation accommodates AGPL before bundling data files.
- **Repo weight.** `~7 MB` for the 1800-2400 Moon file is tolerable; the full planet file set is 30-50 MB and unnecessary if only the Moon is upgraded.
- **Deployment path.** Serverless environments need the file accessible at calc time — bundle in `packages/astrology/data/` and set the path relative to the package, or copy into the Vercel function filesystem at build time. `[inferred]` — mechanism not yet tried in this codebase.

Recommendation: accept the tiered Moshier thresholds. If §9.2 surfaces Moon discrepancies that the tiered threshold can't accommodate, revisit this alternative then. Don't preemptively take on AGPL-data-file deployment complexity.

---

## Library-identity drift (sidebar, non-blocking)

Across ten+ planning docs (`PROJECT.md`, `STACK.md`, `ARCHITECTURE.md`, `COMPETITOR_ANALYSIS.md`, `PITFALLS.md`, `04-RESEARCH.md`, `Celestia_AI_Reference.md`, `SUMMARY.md`, `DATA_FETCHING_INVENTORY.md`, `08-diary-persistence/00-PLAN.md`, `09-ephemeris-validation/00-PLAN.md`, `09-ephemeris-validation/CONTEXT_HANDOFF.md`), the astrology engine is described as `swisseph-wasm`. The shipped dependency is `sweph` (native N-API). `04-RESEARCH.md` actually contemplated the choice ("sweph (native) vs swisseph-wasm — WASM adds complexity, native is faster on server") but downstream docs carried the `swisseph-wasm` label forward even though the code went native.

**Consequences:**

- `§9.0 00-PLAN.md` risk-register item #3 — *"swisseph-wasm vs. native swisseph divergence"* — is framed around a risk that cannot materialize in this codebase. The real analogue is the Moshier-vs-SE-files split covered above; treating that as the "library divergence" risk is the correct reframe.
- Competitor-analysis copy (*"Built on swisseph-wasm server-side calculations"*) and README-adjacent research (`STACK.md` §9, `ARCHITECTURE.md` §6) misname the dependency. Not product-visible (no user sees these docs), but they are load-bearing for future contributor onboarding.

**Proposed handling:** doc-cleanup pass post-§9.6 (out of validation scope). Replace `swisseph-wasm` with `sweph (native Node bindings, Moshier mode)` across planning docs; rewrite §9.0's risk item #3 as the Moshier-vs-SE-files analogue. **Not blocking §9.2.** Flag only — waiting on user.

---

## What is blocked pending user decision

- Harness scaffold in `packages/astrology/test/validation/` — not written yet.
- Sample comparison for Queen Elizabeth II (or AA-confirmed alternative) — not run yet.
- Test-case list AA-verification for Einstein, 2-4 additions — not started.
- Reference-data sourcing plan (JPL Horizons adapter, astro.com transcription protocol, Astronomy Engine integration) — not started.

**All four wait on user approval of the tiered threshold proposal above.** Per the opening message: *"Propose relaxing §9.2's JPL threshold to 2-3 arc-seconds and surface to user for re-approval before proceeding. Don't silently loosen."*

## Exit criteria for this precision-floor gate

One of:

1. **User approves tiered proposal as-is** → §9.1 continues with harness scaffold, test-case list work, sample comparison using tiered thresholds.
2. **User picks the SE Moon file alternative** → `[runtime-check-needed]` license + deployment check before proceeding; then uniform 1″ thresholds everywhere, §9.1 continues.
3. **User proposes different numbers** → thresholds committed at user-provided values; §9.1 continues.

§9.0 `00-PLAN.md` will be updated as part of the §9.1 harness-scaffold commit (not this commit) to reflect the locked-in thresholds once approved, and to reframe risk-register item #3.
