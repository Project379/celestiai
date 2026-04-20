# §9.1 — Test-case list (locked)

**Opened:** 2026-04-20
**Status:** user-approved 2026-04-20 round 3. Locked.
**Epistemic tags:** `[user-decision]`, `[verified]`, `[reference-dependent — Astro-Databank]`, `[runtime-check-needed]`.

All fixture entries below are tagged `[reference-dependent — Astro-Databank]`. Chain of trust flows through Astro-Databank's human-curated catalog; see `packages/astrology/test/validation/reference-data/README.md § All fixture entries are [reference-dependent — Astro-Databank]` for the full rationale.

---

## Famous figures (5 AA-rated)

| # | Case | Birth data | Rodden | Lat | Era | Astro-Databank URL |
|---|---|---|---|---|---|---|
| 1 | Queen Elizabeth II | 1926-04-21, 02:40 GMT, London UK | AA | 51.5°N | 1926 | [Elizabeth II,_Queen_of_United_Kingdom](https://www.astro.com/astro-databank/Elizabeth_II,_Queen_of_United_Kingdom) |
| 2 | Albert Einstein | 1879-03-14, 11:30 LMT, Ulm Germany | AA | 48.4°N | 1879 | [Einstein,_Albert](https://www.astro.com/astro-databank/Einstein,_Albert) |
| 3 | Frida Kahlo | 1907-07-06, 08:30 LMT, Coyoacán Mexico | AA | 19.3°N | 1907 | [Kahlo,_Frida](https://www.astro.com/astro-databank/Kahlo,_Frida) |
| 4 | Princess Ingrid Alexandra of Norway | 2004-01-21, 09:13 CET, Oslo | AA | 59.9°N | 2004 | [Ingrid_Alexandra,_Princess_of_Norway](https://www.astro.com/astro-databank/Ingrid_Alexandra,_Princess_of_Norway) |
| 5 | Crown Princess Leonor of Spain | 2005-10-31, 01:46 CEST, Madrid | AA | 40.4°N | 2005 | [Leonor,_Princess_of_Spain](https://www.astro.com/astro-databank/Leonor,_Princess_of_Spain) |

**Coverage matrix:**

| | Era | Latitude | Hemisphere |
|---|---|---|---|
| Einstein | 1879 | 48°N | N |
| Kahlo | 1907 | 19°N | N |
| QE II | 1926 | 52°N | N |
| Ingrid Alexandra | 2004 | 60°N | N |
| Leonor | 2005 | 40°N | N |

**Era span:** 1879–2005 (126 years, pre- and post-standardized-tz, pre- and post-DST).
**Latitude span:** 19–60°N.
**Hemisphere:** all Northern. Southern-hemisphere coverage satisfied by synthetic Santiago case (34°S) below.

**Composition note (`[user-decision]`, 2026-04-20):** the 5-case list is 4 European royals + 1 Mexican revolutionary. Monochromatic in flavor. Accepted for §9 because AA-rigor constraints beat diversity in the candidate-search pool reachable via WebSearch alone. If the test set expands post-§9.6, prefer non-royal and non-European candidates to balance the list. Log-only; not a §9 action item.

### Rationale update (2026-04-20, doc-drift entry 6)

The original `.planning/phases/09-ephemeris-validation/00-PLAN.md` justified famous-figure inclusion as *"Famous figures with published charts"* — the value proposition was access to astro.com's pre-computed house cusps and aspect tables as independent reference data. That justification is **now obsolete**: astro.com uses Swiss Ephemeris internally, so its output is sweph-vs-sweph, not sweph-vs-independent. See `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 6.

Under the restructured §9.3 / §9.4 architecture (`09-01-HARNESS.md § Tier 3 / Tier 4`), houses validate against an inline independent Placidus implementation, and aspects validate via arithmetic-from-longitudes plus synthetic unit tests. Neither uses astro.com. Famous cases no longer fill a reference-data role the synthetic cases couldn't.

**Current role of the 5 famous cases:** equivalent to synthetic cases — running the pipeline against real birth data to see if anything surfaces that synthetic cases miss. The incremental value is:

- **Latitude / era / hemisphere coverage:** genuine real-world parameter combinations the synthetic set approximates but doesn't fully span.
- **Historical-tz edge cases:** Einstein (1879) and Kahlo (1907) exercise the `localTimeToUTC` pre-standardized-tz code path as real-data self-consistency checks (see `§ Scope boundary — historical-tz cases (Einstein 1879, Kahlo 1907)`).
- **DST-transition edge case:** Leonor (2005-10-31 01:46 CEST) falls on the CEST→CET transition day — exercises tz-handling at a transition boundary.
- **High-latitude (pre-Arctic):** Ingrid Alexandra (59.9°N) approaches but doesn't reach the synthetic polar case (70°N); useful as an intermediate data point.

Keep all 5 cases. Rationale for the individual selections stands even though the top-level "famous figures provide external reference data" justification doesn't.

## Synthetic edge cases (7)

Locked from §9.0 plan — no changes.

| # | Case | Purpose |
|---|---|---|
| S1 | Noon UTC at 0°N 0°E on a known date | Simplest possible case — catches basic coordinate-system errors |
| S2 | Arctic Circle (~70°N) during polar night | Placidus-undefined edge case; expected deterministic behaviour documented |
| S3 | Santiago Chile (34°S) | Southern-hemisphere hemisphere-symmetric math |
| S4 | New Year's Eve at a timezone boundary | UTC/local conversion edge case |
| S5 | Leap day (Feb 29) | Calendar edge case |
| S6 | Year 1600 | Historical pre-Gregorian-uniformity handling |
| S7 | Year 2200 | Future-date handling (inside Moshier range) |

All 7 are inside the Moshier date range (JD 625000.5 – 2818000.5; see `09-01-PRECISION-FLOOR.md § Evidence — Moshier precision floor`).

## Reference case (1)

Merged into Queen Elizabeth II fixture — not a separate 6th case.

**Purpose (revised post-§9.0):** original §9.0 intent was `swisseph-wasm vs native-swisseph` spot check. That risk is moot because the shipped dep is `sweph` (native), not `swisseph-wasm`. Revised purpose: **Moshier-vs-SE-files empirical precision-floor check** — one data point measuring this library's actual Moshier drift against its own SE-files output, grounding the 1″ planet threshold in empirical evidence rather than Swiss Ephemeris documentation alone.

**Implementation:** QE II reference-data file (`test/validation/reference-data/queen-elizabeth-ii.ts`) gets a `nativeSwisseph` column alongside `jpl` / `astronomyEngine` / `astrocom`. The `nativeSwisseph` snapshot is generated via the AGPL protocol documented in `reference-data/README.md § Moshier-vs-SE-files reference snapshot — AGPL protocol`.

## Scope boundary — historical-tz cases (Einstein 1879, Kahlo 1907)

These two cases predate standardized civil timezones in their birth regions (Germany standardized CET in 1893; Mexico standardized ~1922). Birth certificates for both record Local Mean Time. Celestia's `localTimeToUTC` uses `geo-tz` modern-zone resolution, so Celestia interprets each birth time under its nearest modern civil zone — which produces a different UTC than the astro-community convention (LMT-based UTC).

**What this means for §9.2/§9.3/§9.4:** For these two cases, reference-data queries (JPL Horizons, Astronomy Engine, astro.com) use **Celestia's computed UTC**, not the LMT-corrected UTC. This makes Einstein and Kahlo **self-consistency checks** — they validate that `sweph`'s output matches JPL/astro.com given whatever UTC Celestia feeds it — rather than full cross-validation checks.

**What this does NOT validate:** whether Celestia's UTC is the astronomically-correct UTC for pre-standardized-tz birth data. That is a product-scope question about `localTimeToUTC`'s handling of historical dates, tracked separately as `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry 4.

**Why keep these cases despite the weaker validation role:** self-consistency checks still catch real ephemeris-math bugs downstream of the UTC input. Replacing Einstein/Kahlo with post-standardized-tz AA cases would mean sourcing new reference data for new cases; that cost isn't justified by the incremental validation strength, given the 7 synthetic cases carry the bulk of the actual cross-validation load.

Full reference-data-sourcing protocol for these cases lives in `reference-data/README.md § §9.1.1 Historical-tz interpretation`.

## What this list unblocks

- Fixture files committed (this round).
- Reference-data sourcing plan (next §9.1 deliverable — JPL adapter, Astronomy Engine integration, astro.com transcription protocol).
- Sample end-to-end comparison using QE II (final §9.1 deliverable).
- §9.2 (planetary longitude validation) — runs on these 12 cases (5 famous + 7 synthetic), with QE II also carrying the `nativeSwisseph` Moshier-floor data point.
