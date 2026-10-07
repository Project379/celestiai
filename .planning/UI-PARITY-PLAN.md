---
title: UI parity plan
created: 2026-10-07
status: living plan. Founder rulings 2026-10-07 recorded here: order of work (mobile first, web afterwards) and design size (384x832 primary, 360x780 floor).
---

# What this is

The plan for bringing the app to the design brief (`.planning/design/DESIGN-BRIEF.md`) on the short-lived `ui-parity` branch (preview deploys only; merged to `main` only on the founder's say; `main` is merged into it daily).

# Order of work

1. **Mobile first, all screens, then web.** All mobile screens are designed and built before any web layout work:
   1. Page 1: **Днес + nav bar**, all states (loading, empty, error, success) and animations.
   2. **Карта**.
   3. **Reveal flow** (wizard result → horoscope → chart).
   4. **Ти**.
   5. **Оракул**.
   6. The rest (Кръг, Ритъм, Кристал, Лунен дневник, Настройки, auth, wizard, ...).
2. **Web afterwards, screen by screen, once mobile is approved.** Until then web receives only the **shared tokens, the font (Spectral BG) and copy-file changes** — no layout work. The ~80 web files that use the old class names (`font-cinzel` etc.) keep working as aliases (register FONT-CLASS-ALIASES).

# Design size

- **Primary 384×832 dp**, **floor 360×780 dp** (nothing may break, clip or overflow there). Mock-ups are drawn at 384×832 and **also show the 360×780 state**. Source and review devices: register DESIGN-SIZE, `DEVICE-SUPPORT-POLICY.md`.
- **Mobile layout is judged only by the founder on a device or emulator.** Renders (web, harness, mock-up frames) are used for type and colour only.

# Per-screen definition of done (mobile)

- Mock-up approved (384×832 + 360×780), upright type only, tokens from `tokens.ts`, copy from content-home files with founder-approved Bulgarian (voice rule: DESIGN-BRIEF §2.7).
- No size below 12 px, no weight classes (`stellaeum/no-font-weight` count for the screen's files at 0), no italics, no mono.
- Verified by the founder on the 384×832 emulator, the 360×780 emulator and Expo Go on iPhone.
- `pnpm run check:all` green on the branch.

# Open items feeding this plan

Register: FONT-DEVICE-VERIFY, FONT-SUB12-SIZES, FONT-CLASS-ALIASES, EMULATOR-CLEARTEXT-PLUGIN, and `.planning/FONT-WEIGHT-VIOLATIONS-2026-10-07.md` (341 weight-class uses in 55 mobile files).
