# Post-launch upgrades tracker

Items deliberately deferred from pre-launch for cost, scope, or cash-flow reasons. Revisit when revenue or circumstances justify.

**Status tags:**
- `[deferred]` — decision made to defer; revisit trigger defined
- `[revisit-pending]` — a revisit trigger has fired; upgrade not yet executed
- `[in progress]` — upgrade actively being executed
- `[done]` — upgrade shipped; move entry to the trail at the bottom

---

## 1. `sweph` licensing upgrade — GPL-2.0 → Swiss Ephemeris Professional License

**Status:** `[deferred]`
**Deferred:** 2026-04-20 (§9.1); reconfirmed 2026-08-05 against the live June 2026 contract PDF.
**Current state:** `sweph` pinned to `2.10.0-11` under GPL-2.0-or-later. See `docs/licensing.md`.
**Price (corrected 2026-08-05):** **CHF 700 one-time, unlimited licence, valid 99 years.** The April 2026 figure (CHF 750 first product / CHF 400 additional) is stale — this contract edition dropped the tiering for a single flat fee. Purchase URL: [astro.com/swisseph/swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm).

**Upgrade action:**

1. Purchase Swiss Ephemeris Professional License from Astrodienst (CHF 700 one-time as of the June 2026 contract).
2. Process per `docs/licensing.md § Upgrade path`:
   - Contract: [astro.com/swisseph/secont_e.pdf](http://www.astro.com/swisseph/secont_e.pdf)
   - Sign and email to `webmaster@astro.ch`
   - Pay via [astro.com/swisseph/swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm) — **forward-only (contract clause 13): no retroactive coverage, so pay promptly once the trigger fires, not eventually.**
3. Bump `sweph` to latest in all three pinned locations (`packages/astrology/package.json`, `packages/core/package.json`, root `pnpm.overrides.sweph`) and update the CI version-pin gate in `.github/workflows/ci.yml`.
4. Update `docs/licensing.md`: replace GPL-2.0 reasoning section with a Professional License record.
5. Mark this item `[done]` and move to the trail at the bottom.

**Triggers (any one means reconsider):**

- **First genuine paying premium subscriber — real traction, not friends/testers.** This is the actual trigger, not a revenue-threshold heuristic. Automated detection is wired: `apps/web/lib/stripe/subscription.ts` and `apps/web/lib/revenuecat/webhook-events.ts` log loudly (`[Licensing]`-prefixed `console.warn`) the first time a premium grant lands with no prior premium row in `users`.
- Astrodienst publicly challenges GPL-2.0 ASP interpretation or pursues similar cases. (Contract clause 2's own definition of "an app containing Swiss Ephemeris" — see `docs/licensing.md § Contract terms, verified 2026-08-05` — is a factor that weakens confidence in the ASP-loophole reading, though it doesn't change GPL-2.0's text.)
- Bulgarian/EU jurisdiction case law shifts on GPL-2.0 "distribution" for SaaS.
- Stellaeum considers distributing a client-side app (mobile native, desktop). **Hard constraint:** any on-device/client-side Swiss Ephemeris calculation converts this from an interpretive position into plain GPL-2.0 distribution — applies to any future offline work and specifically to a native port of the Кръг chart-wheel feature.
- Stellaeum adds any `sweph`-dependent code to the client-side (mobile) surface.

**Why wait:**

CHF 700 pre-launch is cash-flow pressure at a stage where every CHF matters; post-launch it is noise. GPL-2.0 path is mainstream-interpreted as compliant for network-only SaaS. Small tail risk explicitly accepted in `docs/licensing.md § Known uncertainty`. Pre-revenue spend on an unlaunched product is the wrong priority right now — deliberately deferred, not ignored.

**Post-upgrade tasks:**

- Bump `sweph` to latest version, unpin from `2.10.0-11`; update the CI gate in `.github/workflows/ci.yml` to match.
- Delete the GPL-2.0 reasoning section in `docs/licensing.md`; replace with Professional License record (contract location, signature date, license holder name).
- Remove or update the automated first-subscriber trigger logging in the Stripe/RevenueCat webhook handlers — it's a one-time signal, not needed post-purchase.
- Update any README credibility copy to "professionally-licensed Swiss Ephemeris" if desired (optional, not user-visible) — still subject to contract clause 9's no-mention-without-permission restriction on naming Astrodienst or the Swiss Ephemeris authors.
- Close any lingering `.planning/PRE_LAUNCH_PREREQS.md` item 9 sub-items that reference `sweph` licensing.

---

## 2. Ритъм — transit correlation across journal entries (premium feature)

**Status:** `[deferred]`
**Deferred:** 2026-09-01 (founder amendment to the frozen tier definition — `.planning/TIER-DEFINITION-2026-09-01.md` §3, amendment 2).
**Current state:** does not exist. Ритъм (the lunar journal) is **fully free** — unlimited entries, moon-phase prompts, history, Markdown export. No premium layer, no tier gate.

**What it would be:** a premium-only view that relates a user's journal entries to the astrological transits that were active on the day each entry was written — e.g. "you tend to write about endings under Saturn transits", or a timeline overlay of entries against transit events.

**Why deferred:** it is the single largest net-new build in the frozen tier definition (~1.5–2.5 weeks for a deterministic version, more if AI-assisted), it has **no product spec**, and an AI-assisted version would feed user-written free text to the LLM for the first time anywhere in the app — a new privacy and content-safety surface. Not worth blocking launch on.

**Build scope when picked up (from TIER-DEFINITION-2026-09-01.md §3):**

1. **Data capture** — at entry-write time, compute + store the active transits for that date against the user's natal chart (`buildTransitOverview` / `calculateTransitAspects` already exist server-side). New JSONB column on the diary table or a sibling table + a migration. ~0.5–1 day.
2. **Backfill** — existing entries have no transit snapshot; compute retroactively from stored `date` + the user's chart. ~0.5 day.
3. **The correlation** — undefined; needs a design pass. Deterministic (bucket entries by active transit) ~2–3 days; AI-summarised ~1 week + prompt + the new safety surface.
4. **UI** — premium-only section on the Ритъм screen, both platforms, with a locked-state treatment for free. ~2–3 days.

**Trigger:** post-launch, once there is a premium user base and a product decision on what "correlation" surfaces. No automated trigger.

---

## Trail (completed upgrades)

*Empty. Move entries here after upgrade ships.*
