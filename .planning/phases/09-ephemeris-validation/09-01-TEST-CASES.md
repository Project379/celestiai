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

## Historical-tz caveat (Einstein + Kahlo)

Both cases predate standardized timezones in their birth regions:

- **Germany** adopted Central European Time in 1893. March 1879 Ulm used Local Mean Time (LMT offset ≈ +0:39:54 vs UTC).
- **Mexico** adopted standardized zones around 1922. July 1907 Coyoacán used LMT (offset ≈ -6:36:38 vs UTC).

Celestia's `localTimeToUTC` uses modern `geo-tz` zone resolution, which would interpret these LMT-origin times as modern CET / America_Mexico_City zone times — a 20-36 minute UTC discrepancy, equivalent to 5-9° of Earth rotation.

**Consequence for reference-data sourcing:** JPL / Astronomy Engine / astro.com queries for these cases MUST use Celestia's computed UTC (from running the fixture through `calculateNatalChart` / `localTimeToUTC`), not the astro-community's LMT-corrected UTC. Otherwise Einstein and Kahlo will fail systematically for a known-explainable tz-interpretation reason rather than an ephemeris error. Full protocol in `reference-data/README.md § §9.1.1 Historical-tz interpretation`.

This is a decision worth revisiting at §9.5: if Celestia's stated scope includes accurate chart generation for pre-standardized-tz historical birth dates (e.g., for users researching genealogy), `localTimeToUTC` should be extended with an LMT branch for dates predating the birth-location's tz adoption. That's a product-scope question, not a §9 ephemeris-correctness question.

## What this list unblocks

- Fixture files committed (this round).
- Reference-data sourcing plan (next §9.1 deliverable — JPL adapter, Astronomy Engine integration, astro.com transcription protocol).
- Sample end-to-end comparison using QE II (final §9.1 deliverable).
- §9.2 (planetary longitude validation) — runs on these 12 cases (5 famous + 7 synthetic), with QE II also carrying the `nativeSwisseph` Moshier-floor data point.
