# Licensing — third-party dependencies

Canonical record of licensing decisions for third-party libraries and services that require explicit compliance analysis beyond "standard MIT/Apache OK."

## Swiss Ephemeris (via `sweph` npm package)

**Decision:** GPL-2.0-or-later via workspace-wide `sweph@2.10.0-11` pin, enforced by a pnpm override at the monorepo root.
**Date of initial decision:** 2026-04-20 (§9.1, `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` round).
**Date of workspace-wide enforcement:** 2026-04-21 (§9A, `.planning/phases/09A-licensing-compliance/00-SUMMARY.md`). Prior to this date, only `packages/astrology` was pinned; `packages/core` had drifted to the AGPL-3.0-licensed `sweph@2.10.3-b-1` — see § Drift discovery and remediation below.
**Alternative considered:** Swiss Ephemeris Professional License (CHF 750 one-time, per Astrodienst's price list). **Deferred post-launch** — see `.planning/POST_LAUNCH_UPGRADES.md` item 1.

### Enforcement mechanism (post-§9A)

`sweph@2.10.0-11` is pinned in **every workspace package that depends on sweph directly** (currently `packages/astrology` and `packages/core`), and additionally enforced by a pnpm override at the repository root:

```jsonc
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "sweph": "2.10.0-11"
    }
  }
}
```

The override means pnpm force-resolves any `sweph` specifier — in any current or future workspace package, or any transitive dep — to `2.10.0-11`, regardless of what the requesting package's specifier says. A future package addition with `"sweph": "^2.x"` will resolve to `2.10.0-11` via the override; a developer explicitly trying to override the override would need to either remove the root-level entry (a deliberate, reviewable commit) or use a non-pnpm install path (which wouldn't surface in this project's workflow).

This is the **durable guardrail** that didn't exist during the §9.1 round — `packages/astrology`'s pin alone was insufficient because each workspace package resolves its own deps independently. The override closes that gap.

### Version-string note

The `sweph` README directs GPL users to either `npm install sweph@gpl` or `npm install sweph@2.10.0`. npm has **no bare `sweph@2.10.0`** release — all actual GPL releases are `2.10.0-<revision>` (revisions 1-11 as of pin date). The `gpl` dist-tag resolves to `2.10.0-11` at time of writing. We pin to the explicit numeric version `2.10.0-11` rather than the `gpl` dist-tag so future upstream revisions don't silently upgrade us. The same explicit version is used in both the package-level specifiers and the root-level pnpm override.

### Drift discovery and remediation — 2026-04-21

During §9.6 post-close sweph-pin verification (see `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md § Doc drift corrections` entry #9), `packages/core/package.json` was found to carry `"sweph": "^2.10.3-4"` resolving to `sweph@2.10.3-b-1`, which Astrodienst has licensed as `(AGPL-3.0-or-later OR LGPL-3.0-or-later)`. `packages/core/src/horoscope/transit-analysis.ts` imports sweph and calls `sweph.calc_ut` at runtime — not a dev-only dep. This placed part of the Stellaeum server-side code on the AGPL-3.0 path while `docs/licensing.md` claimed the workspace was on the GPL-2.0 path.

**Attribution:** `packages/core` was created after the `packages/astrology` GPL-2.0 pin (`d5811fb`, 2026-04-20) and picked up sweph via the default latest-matching-semver convention. Nothing enforced the workspace-wide pin until §9A added the pnpm override.

**Scope impact pre-remediation:** this was a potential pre-launch licensing compliance issue, not a past production exposure — neither `packages/core` nor its consumers had shipped to production at time of discovery. Remediation commits (§9A tasks 2-3, `6bb4ff2`) landed before any public launch.

**Lesson carried forward:** "pin the dep in the package" is insufficient in a monorepo. "Pin the dep workspace-wide via overrides" is needed to make the license-path discipline durable against future package additions. The pnpm override is the explicit mechanism making the GPL-2.0 path enforceable without ongoing human vigilance.

### Reasoning

Stellaeum is closed-source SaaS calling `sweph` from a server API route (`apps/web/app/api/*`). Library choice between `sweph` versions:

- **`sweph@2.10.1+` (latest: 2.10.3-5)** is **AGPL-3.0-or-later**. AGPL §13 (Remote Network Interaction) requires source disclosure to users who interact with the software over a network — directly targets closed-source SaaS. Incompatible with shipping closed-source without a Swiss Ephemeris Professional License (LGPL-3.0 alternative path opens only for paid licensees).
- **`sweph@2.10.0-<rev>`** is **GPL-2.0-or-later OR LGPL-3.0-or-later**. GPL-2.0 has no network-interaction clause. Mainstream interpretation: GPL-2.0 does not trigger source-disclosure obligations for software provided over a network without physical distribution of the binary. This is the "ASP loophole" that AGPL-3.0 was explicitly written to close.

Pinning to `2.10.0-11` keeps Stellaeum on a free-license path pre-launch. Upstream Swiss Ephemeris algorithm content at the `2.10.0` boundary is current enough — Moshier ephemeris (our only runtime path, per `09-01-PRECISION-FLOOR.md`) is stable C code that hasn't substantively changed since SE 2.10.0.

### Known uncertainty

The "ASP loophole" interpretation of GPL-2.0 is mainstream in the open-source community and well-documented in FSF correspondence from the AGPL-3.0 drafting period. It is **not courtroom-verified** for Bulgarian / EU jurisdiction specifically. The founder accepts this tail risk pre-launch on the basis that:

- GPL-2.0 ASP-loophole interpretations have never been successfully challenged in any jurisdiction as of research date.
- Astrodienst's own licensing page explicitly enumerates GPL-2.0 and AGPL-3.0 as separate license paths, acknowledging the compliance distinction rather than treating GPL-2.0 as equivalent to AGPL for SaaS.
- Pre-launch cash constraints make CHF 750 non-negligible; post-launch revenue makes it trivial.

This is a tail-risk acceptance, not a legal opinion.

### Revisit triggers

Reconsider the GPL-2.0 path and move to Professional License if any of the following:

1. **Revenue reaches a level where CHF 750 is negligible.** Rough heuristic: monthly revenue > CHF 5,000.
2. **Astrodienst publicly challenges GPL-2.0 ASP interpretation** or pursues similar cases against any SaaS product using `sweph@gpl`.
3. **Bulgarian/EU jurisdiction case law shifts** on GPL-2.0 "distribution" interpretation — specifically any ruling that "provision over a network" counts as "distribution" for GPL-2.0 §3 purposes.
4. **Stellaeum considers distributing a client-side app** (mobile native binaries, desktop installers). Physical binary distribution triggers GPL-2.0 source-disclosure even under mainstream interpretation — this is textbook GPL-2.0 coverage, not ASP-loophole-dependent.
5. **Stellaeum adds any `sweph`-dependent code to the client-side (mobile) surface** for the same reason as (4). The current architecture keeps `sweph` server-side only — any change there re-opens the license question.

### Upgrade path

When a revisit trigger fires:

1. Download the Swiss Ephemeris Professional License contract from [astro.com/swisseph/secont_e.pdf](http://www.astro.com/swisseph/secont_e.pdf).
2. Sign the contract; email to `webmaster@astro.ch` per Astrodienst's stated process.
3. Pay via [astro.com/swisseph/swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm) (CHF 750 one-time as of 2026-04-20).
4. Bump `sweph` to the latest version (`2.10.3-5` or later) in three places, in one atomic commit: `packages/astrology/package.json`, `packages/core/package.json`, and the root `package.json`'s `pnpm.overrides.sweph` entry. Run `pnpm install` to regenerate the lockfile; verify the override no longer holds older versions in place.
5. Update this file: replace the GPL-2.0 reasoning section with a Professional License record (contract location, signature date, license holder name). Update the Enforcement mechanism section above if the override pattern changes (likely stays the same with a different target version).
6. Update `.planning/POST_LAUNCH_UPGRADES.md` item 1 to `[done]`.
7. Optional: update any README credibility copy ("professionally-licensed Swiss Ephemeris" if desired — not required, not user-visible).

Professional License contract storage: **to be decided at purchase time** — default to encrypted cloud storage, not the repo. Add a line here pointing to the location once the contract is signed.

### Reference data generation under this license

The Moshier-vs-SE-files empirical-precision-floor check described in `packages/astrology/test/validation/reference-data/README.md` uses AGPL-licensed `.se1` ephemeris files (downloaded locally, not committed) to generate numeric output (committed as reference data). This follows the working-assumption interpretation that AGPL/GPL obligations apply to the software and data, not to numeric outputs computed by them (analogous to compiler output not inheriting GPL from the compiler). If this interpretation is ever challenged, the reference data can be regenerated from JPL Horizons alone without `.se1` files, losing the empirical Moshier floor check but preserving §9.2's primary validation path. See `packages/astrology/test/validation/reference-data/README.md` for the full protocol.

---

## Other third-party dependencies

Third-party dependencies whose licenses are standard permissive (MIT, ISC, Apache-2.0) and do not require explicit analysis are not enumerated here. This file records only dependencies whose license choice is a load-bearing decision or non-trivial to verify.

**Pending founder review** (not automatable): Clerk TOS, Supabase TOS, Stripe TOS, OpenRouter TOS. These are service-provider Terms of Service, not software licenses, but compose with GDPR obligations (see `.planning/PRE_LAUNCH_PREREQS.md` item 7). Tracked in `.planning/PRE_LAUNCH_PREREQS.md` item 9.
