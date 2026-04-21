# §9A task 1 — workspace license audit report

**Opened:** 2026-04-21
**Status:** audit complete, findings approved by user, remediation in §9A tasks 2-5 (see `00-SUMMARY.md` at close).
**Scope:** workspace-wide scan for AGPL, GPL, LGPL, SSPL, and other share-alike / restricted licenses across every resolved package, not just top-level deps. Discovery trigger was the §9.6 post-close sweph-pin verification surfacing the `packages/core` AGPL drift (see doc-drift entry #9 in `09-01-PRECISION-FLOOR.md`).

**Epistemic tags used:** `[verified]` (observed in scan output), `[inferred]` (reasoning applied to scan results, e.g., compliance-class judgments).

---

## Methodology

| Parameter | Value |
|---|---|
| Date of audit | 2026-04-21 |
| pnpm version | `9.15.4` (matches `packageManager` field in root `package.json`) |
| Node version | 22 (per `engines` field, LTS) |
| Scan scope | All resolved packages under `node_modules/.pnpm/*/node_modules/*/package.json` — every install at the pnpm content-addressed store, covering top-level, transitive, and optional deps materialized at install time. Not limited to direct workspace deps. |
| License patterns searched (verbatim grep alternation) | `GPL`, `LGPL`, `AGPL`, `SSPL`, `BUSL`, `Elastic`, `CC-BY-NC`, `CPAL`, `EUPL`, `OSL`, `QPL`, `RPL` |
| Matches permissive-license false positives filtered out by pattern | No — the pattern is deliberately inclusive; permissive dual-license matches (e.g., `(BSD-3-Clause OR GPL-2.0)`) surface and are classified by eye. Keeps the methodology simple and makes it easy for a future reader to verify the classification. |

### Exact grep command (copy-pasteable for re-audit)

Run from the repository root with a populated `node_modules` (post-`pnpm install`):

```bash
grep -rE '"license":\s*"[^"]*(GPL|LGPL|AGPL|SSPL|BUSL|Elastic|CC-BY-NC|CPAL|EUPL|OSL|QPL|RPL)' node_modules/.pnpm/*/node_modules/*/package.json 2>/dev/null
```

**How to read the output:** each line emits `<path>:<license-field>`. Expected clean-run output is the sweph pin (`2.10.0-11`) and the benign `node-forge` dual-license lines below. Any new line in the output from a future run warrants investigation — either a new dep was added, a transitive dep's license changed, or an existing dep upgraded into a restricted-license version (the exact failure mode that surfaced in `packages/core` for sweph).

**What the scan does not cover:**

- **Service-provider TOS** (Clerk, Supabase, Stripe, OpenRouter, Vercel, etc.) — these are enumerated in `PRE_LAUNCH_PREREQS.md` item 9 but are a separate audit track; the codebase scan only covers library licenses.
- **`.se1` ephemeris data files** — AGPL-licensed per Astrodienst, but never committed or bundled with Celestia. Used during one-off reference-data generation per `packages/astrology/test/validation/reference-data/README.md § Moshier-vs-SE-files — AGPL protocol`; this is a declared separate compliance path, not a codebase scan concern.
- **npm packages not resolved during install** (e.g., optional deps for platforms we don't target). `pnpm install --frozen-lockfile` produces the install state this audit scans — platform-specific variants that don't install on the current machine (win32) would not appear here. For a comprehensive audit across all install targets, re-run the scan on a Linux runner (the CI environment) and cross-reference. `[inferred]` — not exercised in this audit round; documented as a known limitation.

### When to re-run this audit

- A new workspace package is added under `packages/` or `apps/` (new `package.json` with its own deps).
- A transitive dep is upgraded to a new major version (lockfile SHA changes on a dep where the upstream may have re-licensed).
- `pnpm install` resolves a new version of an existing dep (e.g., caret-range upgrades on `pnpm install` without `--frozen-lockfile`).
- Before any major release milestone — treat this audit as part of the release-gate checklist the same way the validation harness is part of the CI-gate checklist.

A re-audit is a one-line grep copy-paste from this doc plus eye-classification of any new rows. Budget: <5 minutes for a clean-run confirmation.

---

## Findings

| # | Package | Version | License field | Scope | Compliance class |
|---|---|---|---|---|---|
| 1 | `sweph` | `2.10.0-11` | `(GPL-2.0-or-later OR LGPL-3.0-or-later)` | `packages/astrology` dependency (pinned per `d5811fb`) | **GPL-2.0 path — compliant** `[verified]` |
| 2 | `sweph` | `2.10.3-b-1` | `(AGPL-3.0-or-later OR LGPL-3.0-or-later)` | `packages/core` dependency (specifier `^2.10.3-4`, drifted) | **AGPL — non-compliant under current founder decision** `[verified]`; remediation tracked in §9A tasks 2-3 |
| 3 | `node-forge` | `1.4.0` | `(BSD-3-Clause OR GPL-2.0)` | Installed as `node_modules/.pnpm/node-forge@1.4.0/...` | **Benign dual-license** — BSD-3-Clause path elected by default `[inferred]` |
| 4 | `node-forge` | `1.4.0` (same version, separate install path) | `(BSD-3-Clause OR GPL-2.0)` | Pulled in by `@expo/cli@0.24.24` | Same as #3 `[inferred]` |
| 5 | `node-forge` | `1.4.0` (same version, separate install path) | `(BSD-3-Clause OR GPL-2.0)` | Pulled in by `@expo/code-signing-certificates@0.0.6` | Same as #3 `[inferred]` |

**Scan output (verbatim, 5 lines):**

```
node_modules/.pnpm/@expo+cli@0.24.24/node_modules/node-forge/package.json:  "license": "(BSD-3-Clause OR GPL-2.0)",
node_modules/.pnpm/@expo+code-signing-certificates@0.0.6/node_modules/node-forge/package.json:  "license": "(BSD-3-Clause OR GPL-2.0)",
node_modules/.pnpm/node-forge@1.4.0/node_modules/node-forge/package.json:  "license": "(BSD-3-Clause OR GPL-2.0)",
node_modules/.pnpm/sweph@2.10.0-11/node_modules/sweph/package.json:	"license": "(GPL-2.0-or-later OR LGPL-3.0-or-later)",
node_modules/.pnpm/sweph@2.10.3-b-1/node_modules/sweph/package.json:	"license": "(AGPL-3.0-or-later OR LGPL-3.0-or-later)",
```

**Not found** (scan clean — explicitly searched, zero hits):

- No AGPL-3.0-only or AGPL-3.0-or-later deps beyond `sweph@2.10.3-b-1`
- No GPL-3.0 or GPL-3.0-or-later deps (with or without permissive dual-license alternative)
- No LGPL-only deps (the LGPL-3.0 alternatives in sweph's dual-license lines are not independent matches — the `OR LGPL-3.0-or-later` is part of the same sweph hits already counted)
- No SSPL (MongoDB Server Side Public License)
- No BUSL / Business Source License (Sentry, HashiCorp-style)
- No Elastic License (v1 or v2)
- No CC-BY-NC (non-commercial Creative Commons)
- No EUPL (European Union Public License)
- No OSL (Open Software License)
- No QPL (Q Public License, Qt's old license)
- No RPL (Reciprocal Public License)
- No CPAL (Common Public Attribution License)

---

## Analysis

### Finding 2 — `sweph@2.10.3-b-1` (the material compliance risk)

The drift details are captured in `09-01-PRECISION-FLOOR.md § Doc drift corrections` entry #9 and the §9A scope memo. Summary: `packages/core` was created after `packages/astrology`'s GPL-2.0 pin (`d5811fb`, 2026-04-20) and picked up `sweph` via the default latest-matching-semver (`^2.10.3-4`), resolving to `2.10.3-b-1` which Astrodienst has licensed as `(AGPL-3.0-or-later OR LGPL-3.0-or-later)`. The AGPL-3.0 path conflicts with Celestia's closed-source SaaS posture per `docs/licensing.md § Swiss Ephemeris § Reasoning`. The LGPL-3.0 alternative in the dual-license is theoretically open, but LGPL-3.0's "dynamic linking allowed, source disclosure obligated for modifications" framing has ambiguous applicability to server-side SaaS and is not the path `docs/licensing.md` rationalizes. Remediation: pin `packages/core` to `2.10.0-11` and add a workspace-wide pnpm override enforcing that version regardless of what individual packages request (§9A tasks 2-3).

**Usage scope:** `packages/core/src/horoscope/transit-analysis.ts` imports sweph and calls `sweph.calc_ut` at runtime — the dep is not dev-only. `[verified]` via grep.

### Findings 3-5 — `node-forge` (benign)

`node-forge` is dual-licensed `(BSD-3-Clause OR GPL-2.0)`. Downstream consumers elect either license at their own discretion. BSD-3-Clause is a permissive license requiring only attribution and a no-endorsement clause — zero copyleft or network-interaction obligation. **Celestia elects the BSD-3-Clause path for node-forge; no copyleft obligation results.** `[inferred]`.

The three installed copies are all `1.4.0`:
- One direct install at `node_modules/.pnpm/node-forge@1.4.0/`
- Two nested installs under `@expo/cli@0.24.24` and `@expo/code-signing-certificates@0.0.6` (Expo build tooling — pulled in by the mobile app's Expo deps; used during build/signing workflows, not runtime-shipped server code).

No action needed. Optionally, `docs/licensing.md` could document the BSD-3-Clause election for `node-forge` preemptively to save a future reader the same audit cycle. Out of §9A scope unless the user wants it added; the compliance position is stable either way.

### Clean-run confirmation for all other scanned license classes

Zero matches on AGPL (outside the sweph drift), GPL-3, SSPL, BUSL, Elastic, CC-BY-NC, EUPL, OSL, QPL, RPL, CPAL. `[verified]` via grep with zero output on those patterns individually (the combined alternation output above shows all hits in one run; separating the pattern confirmed no filtered-out matches elsewhere).

---

## Remediation reference

sweph drift remediation is tracked in §9A tasks 2-5. See `00-SUMMARY.md` at §9A close for the final disposition, the exact commits landing the pin + pnpm override, and post-remediation verification that both `packages/astrology` and `packages/core` resolve to `sweph@2.10.0-11` under the enforced override.

node-forge requires no remediation.

---

## Epistemic-tag summary

- **Scan outputs** (which packages exist, what their `license` fields say, what versions are resolved): `[verified]` — observable in the grep output and the on-disk `package.json` files.
- **Compliance-class judgments** ("benign dual-license", "material risk", "not runtime-shipped"): `[inferred]` — reasoning applied on top of the scan outputs using the framing in `docs/licensing.md`. A lawyer reviewing these classifications may reach different conclusions; the tags flag that these are engineering judgments, not legal opinions.
- **Re-audit scope limitation** (platform-specific deps not materialized on win32): `[inferred]` — not empirically exercised in this audit; documented as a known limitation for a future cross-platform-runner re-audit.
