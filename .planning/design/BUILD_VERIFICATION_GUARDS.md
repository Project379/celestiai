# Build verification guards — thirteen-screen design set

**Status: design LOCKED.** This document is the checklist enforced on every screen as it's wired during the (not-yet-started) build. It does not change the design — see the published artifact (warm/cool full redesign, thirteen screens + navbar) for the approved reference. These three guards were found as real bugs during the design pass itself, which is why they're guards and not just good intentions.

---

## Guard 1 — no overlaps: lead-lines and the navbar

**What happened once, why it's now a standing check:** Днес's bronze spine used to cut through the payoff text because the payoff broke free via a negative margin that pulled it past the spine's own x-position. The spine was fixed by bounding it to a dedicated wrapper (`spine-body`) containing only the lead+dev block, with the payoff entirely outside that wrapper in normal flow — geometrically impossible to collide, not just visually adjusted to look right at one content length.

**The check, per screen, at wiring time:**
- Every eye-lead device (Днес's spine, Ритъм's beam, Карта's/Guide's threads, any future one) must be bounded to a wrapper containing only the content it leads *through* — never a wrapper that also contains the content it leads *to* (a payoff, a break-free moment). If a line and a "stepped forward" element are siblings inside the same relatively-positioned parent, verify there's no coordinate range where an absolutely-positioned line's box and the stepped-forward element's box can overlap, at any content length — not just the placeholder text used in the mockup.
- Check against the **longest real Bulgarian string** for that slot, pulled from source, not invented:
  - Lunar-phase name (Днес hero, and Ритъм/diary wherever it recurs): **19 chars** — `Изгряващ полумесец` / `Залязващ полумесец` (`tokens.ts`'s own measured-width comment).
  - Combined sign summary (Карта's Big Three plaque line): **25 chars** — `Слънце · Луна · Асцендент`.
  - Card/list subtitle-length strings (crystals, recommendations, `you.tsx`-adjacent copy): **37 chars** observed elsewhere (`история, планети, аспекти, лунни фази`) — treat as the working ceiling until each screen's actual longest string is pulled from its real copy source.
  - **Not yet measured — pull from source before wiring, don't assume:** Кръг's invite copy, crystal names/subtitles, recommendation sentence lengths, diary entry lengads (these are free-text, so the check is "does the layout survive a long entry gracefully," not a fixed max), wizard prompts, auth copy. Flag any screen wired against a guessed length instead of a real one.
- **Navbar clearance**, every screen: the persistent bottom navbar (temperature-neutral, docked) must never overlap the last piece of content. Every screen needs real bottom safe-area/padding sized to the navbar's actual height (72px in the reference render) plus the device safe-area inset — verified per screen, not assumed inherited, since some screens (Settings, Auth if it ever shows the bar) may not use the same shell component as Днес/Карта.

---

## Guard 2 — moon brightness: verify on device, don't trust the mockup fix

**Diagnosis (found directly in code, not guessed):** the lit-face gradient's bright stops cut off earlier than a real crescent needs, and a strong inset box-shadow glazed a dark wash over a large share of the sphere regardless of the gradient underneath. Both were loosened in the reference render (brighter stops carried further out, lighter/tighter shadow).

**Why this isn't closed:** the reference is a static sRGB render in a desktop browser. Two things only exist correctly on-device:
- Reanimated's actual glow-pulse opacity range (0.5–0.85) compositing in real time, not a CSS approximation.
- The real `feTurbulence` grain compositing against the phone's actual display (color management, brightness/contrast response differs from a browser screenshot).

**The check:** when Днес is wired, render the moon on a real device (not just the simulator, if simulator color rendering is known to differ) and confirm it reads as *lit* — not dim, not blown out — before calling this settled. If it's still under-lit on device, the fix is further gradient/shadow tuning on the real component, not another mockup pass.

---

## Guard 3 — Ритъм ignition point: vertical fixed, horizontal stays data-driven

**Bug, root cause, fix (done in the reference artifact):** `.track-point` centers itself on the track line via `transform: translate(-50%,-50%)`. The ignited "now" point borrowed a shared breathing animation (`breathe2`, also used by the ember and the wizard star) whose keyframes only specify `transform: scale(...)`. An animation's keyframes fully replace the animated property for the entire cycle — so for as long as the dot was breathing, its centering translate was silently dropped, seating it off the line. Fixed with a dedicated keyframe (`ignitePulse`) that keeps the translate at every step. Confirmed `ember-hero-glow` and `wiz-star`'s use of the same shared `breathe2` animation don't have this problem — both are positioned via `inset`, not translate-centering, so they were never exposed to it.

**Horizontal position is unrelated and correct as-is:** the ignited point sits wherever today's real date falls across the week's track — off-center on most days, by design. Do not center it; that would misrepresent the calendar.

**The check, at wiring time:** any future element that (a) needs `translate(...)`-based centering on an axis AND (b) gets an opacity/scale breathing animation must combine both in one keyframe's `transform` declaration (as `ignitePulse` does), never layer a bare-`scale` animation on top of a separately-centered element. This is the general form of the bug — worth a quick audit of every animated mark in the set (ember, wizard star, tab-bar active indicator if it ever animates) before wiring, not just a one-off fix on Ритъм.

---

## What this document does not do

Does not change any visual design decision — the thirteen-screen set stands as approved. Does not wire anything. These three items are re-checked as each screen moves from design to code, and this file is the record of what to check and why, not a new proposal.
