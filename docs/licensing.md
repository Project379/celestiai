# Licensing — third-party dependencies

Canonical record of licensing decisions for third-party libraries and services that require explicit compliance analysis beyond "standard MIT/Apache OK."

## Swiss Ephemeris (via `sweph` npm package)

**Decision:** GPL-2.0-or-later via workspace-wide `sweph@2.10.0-11` pin, enforced by a pnpm override at the monorepo root. **Staying on this path through launch** — final decision, revisited and reconfirmed 2026-08-05 against the live June 2026 contract PDF (see § Contract terms, verified 2026-08-05 below). Purchase the Professional License promptly once a revisit trigger fires (real paying subscribers, not friends/testers) — deliberately deferred, not ignored, given pre-revenue cash-flow priorities.
**Date of initial decision:** 2026-04-20 (§9.1, `.planning/phases/09-ephemeris-validation/09-01-PRECISION-FLOOR.md` round).
**Date of workspace-wide enforcement:** 2026-04-21 (§9A, `.planning/phases/09A-licensing-compliance/00-SUMMARY.md`). Prior to this date, only `packages/astrology` was pinned; `packages/core` had drifted to the AGPL-3.0-licensed `sweph@2.10.3-b-1` — see § Drift discovery and remediation below.
**Alternative considered:** Swiss Ephemeris Professional License — **CHF 700 one-time, unlimited licence, valid 99 years**, per the live contract PDF as of June 2026 (see § Contract terms, verified 2026-08-05). **Deferred post-launch** — see `.planning/POST_LAUNCH_UPGRADES.md` item 1.

### Contract terms, verified 2026-08-05

Checked directly against the live contract PDF at [astro.com/swisseph/secont_e.pdf](http://www.astro.com/swisseph/secont_e.pdf), June 2026 edition. This supersedes the April 2026 figures used in the § Reasoning / § Upgrade path sections below, which cited a stale price list.

- **Price:** CHF 700 one-time, for an **unlimited licence valid 99 years**. The old CHF 750-first-product / CHF 400-additional-product tiering from the April 2026 price list is gone from this edition — it's a single flat fee now, not a per-product schedule.
- **Server-side coverage confirmed:** the contract explicitly covers server-side use where end users connect via a browser. Our architecture (Swiss Ephemeris called from `apps/web/app/api/*`, never bundled client-side) is squarely inside what the Professional License covers.
- **Clause 2 — Astrodienst's own definition of "containing Swiss Ephemeris":** *"Even when the distributed app contains no calculation code itself but requests calculation from a server providing it, this is considered an app containing Swiss Ephemeris."* This is the rightsholder's own definition, stated in the contract we'd sign — not a third party's reading. It does not change what GPL-2.0 itself requires (GPL-2.0 has no network-interaction clause; that's still the basis of the ASP-loophole reading in § Reasoning below). But it is Astrodienst explicitly rejecting the "server-side calculation means the client app isn't distributing Swiss Ephemeris" framing. Recorded here as **a factor that weakens confidence in the ASP-loophole position**, not as a legal conclusion — see § Known uncertainty, updated below.
- **Clause 13 — no retroactivity:** the licence becomes valid only after complete payment is received. Forward-only; it does not backdate to cover any period before purchase. Practical implication: when a revisit trigger fires, buy promptly — there's no "we'll get to it eventually" grace window once genuine paying revenue starts.
- **Clause 9 — no-mention restriction:** the contract forbids mentioning Astrodienst or the Swiss Ephemeris authors in our docs, app, or promotional material without their written permission. This is the **opposite of a normal attribution requirement** (most licenses require crediting the author; this one restricts it) and is easy to breach by accident — e.g. a marketing page citing "powered by Swiss Ephemeris" or a README crediting Astrodienst by name. Applies regardless of which license path (GPL-2.0 or Professional) we're on, since it's a Professional License contract term but reflects Astrodienst's general posture. Flag any copy referencing Astrodienst or the Swiss Ephemeris authors for review before it ships.

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
- Pre-launch cash constraints make CHF 700 non-negligible; post-launch revenue makes it trivial.

**Updated 2026-08-05:** the Professional License contract's clause 2 (§ Contract terms, verified 2026-08-05) is a factor that weakens this position specifically — Astrodienst's own definition treats server-side-calculation-behind-a-browser as "an app containing Swiss Ephemeris," which is the exact shape of the "server-side only isn't distribution" argument GPL-2.0's ASP loophole depends on. This does not change GPL-2.0's actual text (still no network-interaction clause), and it is not a legal conclusion — it is the rightsholder signaling how they'd characterize our architecture if asked, which is relevant context for how much weight to put on the tail-risk acceptance below.

This is a tail-risk acceptance, not a legal opinion.

### Revisit triggers

Reconsider the GPL-2.0 path and move to Professional License if any of the following:

1. **First genuine paying premium subscriber — real traction, not friends/testers.** This is the actual trigger, not a revenue-threshold heuristic. As soon as it fires, buy promptly: clause 13 (§ Contract terms, verified 2026-08-05) means the licence is **forward-only**, valid only from the date of complete payment — there is no grace window or backdating once real revenue starts. Automated detection: `apps/web/lib/stripe/subscription.ts` and `apps/web/lib/revenuecat/webhook-events.ts` both log loudly the first time a premium grant lands with no prior premium row in `users` — see § Automated first-subscriber trigger below.
2. **Astrodienst publicly challenges GPL-2.0 ASP interpretation** or pursues similar cases against any SaaS product using `sweph@gpl`.
3. **Bulgarian/EU jurisdiction case law shifts** on GPL-2.0 "distribution" interpretation — specifically any ruling that "provision over a network" counts as "distribution" for GPL-2.0 §3 purposes.
4. **Stellaeum considers distributing a client-side app** (mobile native binaries, desktop installers). Physical binary distribution triggers GPL-2.0 source-disclosure even under mainstream interpretation — this is textbook GPL-2.0 coverage, not ASP-loophole-dependent. **Hard constraint, not a judgment call:** any on-device or client-side Swiss Ephemeris calculation converts this from an interpretive ASP-loophole position into plain GPL-2.0 distribution of the library itself. This applies to any future offline-mode work and specifically to any native port of the Кръг chart-wheel feature that would run ephemeris math on-device instead of calling the server API — such a port cannot ship under the current GPL-2.0-server-side reasoning and must either stay server-backed or wait for the Professional License.
5. **Stellaeum adds any `sweph`-dependent code to the client-side (mobile) surface** for the same reason as (4). The current architecture keeps `sweph` server-side only — any change there re-opens the license question.

### Automated first-subscriber trigger

Both payment webhook handlers check `users` for an existing `subscription_tier = 'premium'` row immediately before granting premium access; if none exists, they log loudly (`console.warn` with a `[Licensing]` prefix) noting the trigger has fired and pointing at this section and the purchase URL. This surfaces the moment without relying on anyone remembering to check. See `apps/web/lib/stripe/subscription.ts` (`logIfFirstPremiumSubscription`) and `apps/web/lib/revenuecat/webhook-events.ts` (`grantPremium`). The check is a simple existence query, not a distributed lock — a theoretical simultaneous-first-grant race could log twice, which is harmless for a one-time human-actioned trigger.

### Upgrade path

When a revisit trigger fires:

1. Download the Swiss Ephemeris Professional License contract from [astro.com/swisseph/secont_e.pdf](http://www.astro.com/swisseph/secont_e.pdf).
2. Sign the contract; email to `webmaster@astro.ch` per Astrodienst's stated process.
3. Pay via [astro.com/swisseph/swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm) — **CHF 700 one-time, unlimited licence, valid 99 years**, per the live contract PDF verified 2026-08-05 (supersedes the CHF 750-first/CHF 400-additional figures from the 2026-04-20 price list, which no longer apply in this contract edition). Pay promptly once the trigger fires — clause 13 makes the licence forward-only, no retroactive coverage.
4. Bump `sweph` to the latest version (`2.10.3-5` or later) in three places, in one atomic commit: `packages/astrology/package.json`, `packages/core/package.json`, and the root `package.json`'s `pnpm.overrides.sweph` entry. Run `pnpm install` to regenerate the lockfile; verify the override no longer holds older versions in place. Update the CI gate in `.github/workflows/ci.yml` (§ CI enforcement below) to allow the new pinned version.
5. Update this file: replace the GPL-2.0 reasoning section with a Professional License record (contract location, signature date, license holder name). Update the Enforcement mechanism section above if the override pattern changes (likely stays the same with a different target version).
6. Update `.planning/POST_LAUNCH_UPGRADES.md` item 1 to `[done]`.
7. Remove or update the automated first-subscriber trigger logging (§ Automated first-subscriber trigger) — it's a one-time signal, not needed once the license is purchased.
8. **Do not add any Astrodienst / Swiss Ephemeris author mentions to docs, app copy, or promotion** without their written permission — clause 9 forbids it regardless of which license path we're on (§ Contract terms, verified 2026-08-05).
9. Optional: update any README credibility copy ("professionally-licensed Swiss Ephemeris" if desired — not required, not user-visible; still subject to item 8's no-mention restriction if it names Astrodienst).

Professional License contract storage: **to be decided at purchase time** — default to encrypted cloud storage, not the repo. Add a line here pointing to the location once the contract is signed.

### CI enforcement

`.github/workflows/ci.yml` runs a `sweph` license-pin verification step on every push/PR to `main`: it inspects `pnpm-lock.yaml` after a frozen-lockfile install and fails the build if any `sweph` resolves to a version other than `2.10.0-11`. This catches the same class of drift that caused the §9A incident (§ Drift discovery and remediation above) automatically, rather than relying on a manual audit to catch it again. Update the pinned version string in that step alongside step 4 of § Upgrade path when the Professional License is purchased.

### Reference data generation under this license

The Moshier-vs-SE-files empirical-precision-floor check described in `packages/astrology/test/validation/reference-data/README.md` uses AGPL-licensed `.se1` ephemeris files (downloaded locally, not committed) to generate numeric output (committed as reference data). This follows the working-assumption interpretation that AGPL/GPL obligations apply to the software and data, not to numeric outputs computed by them (analogous to compiler output not inheriting GPL from the compiler). If this interpretation is ever challenged, the reference data can be regenerated from JPL Horizons alone without `.se1` files, losing the empirical Moshier floor check but preserving §9.2's primary validation path. See `packages/astrology/test/validation/reference-data/README.md` for the full protocol.

---

## Other third-party dependencies

Third-party dependencies whose licenses are standard permissive (MIT, ISC, Apache-2.0) and do not require explicit analysis are not enumerated here. This file records only dependencies whose license choice is a load-bearing decision or non-trivial to verify.

**Pending founder review** (not automatable): Clerk TOS, Supabase TOS, Stripe TOS, OpenRouter TOS. These are service-provider Terms of Service, not software licenses, but compose with GDPR obligations (see `.planning/PRE_LAUNCH_PREREQS.md` item 7). Tracked in `.planning/PRE_LAUNCH_PREREQS.md` item 9.
