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
**Deferred:** 2026-04-20 (§9.1)
**Current state:** `sweph` pinned to `2.10.0-11` under GPL-2.0-or-later. See `docs/licensing.md`.

**Upgrade action:**

1. Purchase Swiss Ephemeris Professional License from Astrodienst (CHF 750 one-time as of 2026-04-20).
2. Process per `docs/licensing.md § Upgrade path`:
   - Contract: [astro.com/swisseph/secont_e.pdf](http://www.astro.com/swisseph/secont_e.pdf)
   - Sign and email to `webmaster@astro.ch`
   - Pay via [astro.com/swisseph/swephprice_e.htm](https://www.astro.com/swisseph/swephprice_e.htm)
3. Bump `packages/astrology/package.json` `sweph` to latest (`2.10.3-5` or newer).
4. Update `docs/licensing.md`: replace GPL-2.0 reasoning section with a Professional License record.
5. Mark this item `[done]` and move to the trail at the bottom.

**Triggers (any one means reconsider):**

- Monthly revenue > CHF 5,000 (rough heuristic — CHF 750 becomes noise).
- Astrodienst publicly challenges GPL-2.0 ASP interpretation or pursues similar cases.
- Bulgarian/EU jurisdiction case law shifts on GPL-2.0 "distribution" for SaaS.
- Stellaeum considers distributing a client-side app (mobile native, desktop).
- Stellaeum adds any `sweph`-dependent code to the client-side (mobile) surface.

**Why wait:**

CHF 750 pre-launch is cash-flow pressure at a stage where every CHF matters; post-launch it is noise. GPL-2.0 path is mainstream-interpreted as compliant for network-only SaaS. Small tail risk explicitly accepted in `docs/licensing.md § Known uncertainty`.

**Post-upgrade tasks:**

- Bump `sweph` to latest version, unpin from `2.10.0-11`.
- Delete the GPL-2.0 reasoning section in `docs/licensing.md`; replace with Professional License record (contract location, signature date, license holder name).
- Update any README credibility copy to "professionally-licensed Swiss Ephemeris" if desired (optional, not user-visible).
- Close any lingering `.planning/PRE_LAUNCH_PREREQS.md` item 9 sub-items that reference `sweph` licensing.

---

## Trail (completed upgrades)

*Empty. Move entries here after upgrade ships.*
