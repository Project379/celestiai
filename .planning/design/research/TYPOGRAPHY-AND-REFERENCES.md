---
title: Phase 1b research — Bulgarian typography, reference products, desktop presentation
created: 2026-10-07
status: research for founder decision. No font has been chosen or installed in the app.
tags: "[verified] = I ran or read it today · [sourced] = external, link given · [inferred] = my reasoning, step named"
---

# A. Bulgarian typography

## A.1 The finding that changes the question

**[verified] The two fonts the mobile app ships — Playfair Display and EB Garamond — contain no Bulgarian localized forms.** I opened the font files in `apps/mobile/assets/fonts/` with fontTools and read their GSUB tables (script `probe-bgr-locl.py`, kept beside the images):

| Font file (shipped) | Cyrillic letters (U+0410–044F) | `cyrl` language systems | Bulgarian (`BGR`) |
|---|---|---|---|
| PlayfairDisplay-Regular / SemiBold / Bold | 64/64 | none | **No** |
| EBGaramond-Regular / Medium | 64/64 | `MKD`, `SRB` only | **No** (Macedonian/Serbian only) |
| EBGaramond-Italic | 64/64 | none | **No** |
| Cinzel-Regular / SemiBold | 0/64 | — | no Cyrillic at all |

`images`: `typography/italic-ru-vs-bg.png`, `typography/upright-ru-vs-bg.png` — same font file, only `lang="ru"` vs `lang="bg"`. For EB Garamond the two columns are identical. So **today every Cyrillic letter in the app is drawn in the Russian-style form**, including the italic leads, which are the app's main voice. The web is only half better: its display font Manrope has `BGR` (so headings can show Bulgarian forms once `lang="bg"` is honoured — the root `<html>` already carries it), but its body font Inter has none.

Why it matters [sourced from the project's own research + common knowledge of the script]: Bulgarian italic differs most from Russian italic (г, д, и, й, к, л, п, т, ц, ч, ш, щ, ю), and some roman forms (д, л, ж…) differ too. A Bulgarian reader sees a Russian-form italic as slightly foreign — and `DESIGN-RESEARCH` §C.1 says the burden of "warm" sits on the writing and its look.

**Mechanism [verified]:** the browser (and React Native on iOS/Android with the right `lang`/locale) picks Bulgarian forms through OpenType `locl` when the text is tagged `bg`. A font without a `cyrl/BGR` language system silently ignores the tag. **CSS cannot add forms a font lacks.** On the web the fix is `lang="bg"` (already set on `<html>`) plus fonts that have them. On React Native this needs a separate check — I did not test whether RN applies `locl` for a `bg` locale; **that is an open risk for any font choice on mobile.**

## A.2 What I screened (all from Google Fonts, SIL OFL)

Probed with fontTools, 40+ font files. Results that matter [verified]:

| Font | Has Cyrillic | `BGR` in roman | `BGR` in italic | Character |
|---|---|---|---|---|
| **Playfair** (v2, *not* "Playfair Display"; axes opsz/wdth/wght) | yes | **yes** (also `SRB`, `UKR`) | **yes** | high-contrast display serif, same family spirit as today's display |
| **Cormorant Garamond** / Cormorant | yes | **yes** | **yes** | delicate Garamond; very light at small sizes (display and large italic only) |
| **Spectral** | yes | **yes** | **yes** (Italic file) | screen-first text serif (Production Type), calm, slightly calligraphic |
| **Source Serif 4** | yes | **yes** | **yes** | robust text serif with optical sizes 8–60 |
| Lora | yes | yes | yes | calligraphic, wider; reads friendlier than mystical |
| Vollkorn | yes | yes | yes | sturdy, bookish |
| Merriweather | yes | yes | — (not probed) | wide, heavy, newsy |
| Roboto Serif | yes | yes | — | neutral |
| Manrope (web display today) | yes | **yes** | n/a (sans) | geometric sans; has BGR |
| EB Garamond | yes | **no** | **no** | what the app uses |
| Playfair Display (v1) | yes | **no** | n/a | what the app uses |
| Inter (web body today) | yes | **no** | n/a | |
| Noto Serif / Noto Serif Display, Gentium Book Plus, PT Serif, Prata, Alegreya, Old Standard TT, Fira Sans | yes | **no** (MKD/SRB/BSH/CHU only or none) | — | |
| Forum, Philosopher | yes | no GSUB / no locl | — | |
| Cinzel, Marcellus, Newsreader, Fraunces, Bellefair, Cormorant Upright | **no Cyrillic** | — | — | cannot carry Bulgarian |

(Notable: Playfair **v2** fixes exactly what Playfair Display v1 lacks. It is a different font file with the same name stem; adopting it is not "keep what we have".)

## A.3 Rendering evidence — what the Bulgarian forms look like

`typography/upright-ru-vs-bg.png` (large, ru left / bg right; rows: EB Garamond, Source Serif 4, Spectral, Playfair 2, Cormorant Garamond):

- **EB Garamond:** left and right identical — no Bulgarian forms.
- **Source Serif 4, Spectral, Playfair 2, Cormorant Garamond:** with `lang="bg"` the **upright** text changes a lot: `т` is drawn in an `m`-like form, `д` grows a foot/looped form, `л` becomes a pointed Λ, `ж`, `и`, `ш` change.

**Honest caveat — this is exactly the thing I cannot judge and you can.** In Bulgarian book typography the *italic* forms are the strongly different ones; how far the *upright* forms should differ is a matter of taste and tradition, and these four fonts all choose the strong version when `lang="bg"` is set. If roman `т` as `m` looks wrong to you, the choices are: use these fonts with `lang="bg"` only on italics/display; use a font with a milder roman set (Lora/Vollkorn are candidates I did not render); or accept Russian-style roman forms and only localise italics — which no tested font allows to be split by CSS alone (`locl` is on or off per language).

## A.4 Three pairings (display + body), rendered with real app strings

Image: `typography/pairings-in-app-sizes.png` — four phone-width columns, same copy (real strings from `index.tsx`, `moon-detail`, `compliance-copy.ts`), sizes from `tokens.ts` (body 17/27, lead italic 19, caption 12, CTA 22). Column A is the shipped combination for comparison.

| | Display | Body + italic voice | What it keeps | What changes | Risk |
|---|---|---|---|---|---|
| **B** | **Playfair 2** | **Source Serif 4** (roman + italic, opsz) | Today's display look, now with Bulgarian forms | EB Garamond's old-style warmth is gone; Source Serif is sturdier, cooler | Mild loss of the "candlelit" body colour; Source Serif is the plainest of the three |
| **C** | **Cormorant Garamond** (display + italic lead) | **Spectral** (body) | The Garamond lineage the italic leads rely on; most "mystical" | Cormorant is thin — fine at 21 px+ italic, fragile as UI text | Needs a minimum size (≈ 17 px italic on dark OLED); thin strokes + dark bg = halation risk (`DESIGN-RESEARCH` §C.4) |
| **D** | Spectral (Medium) | Spectral (Regular/Italic) | One family everywhere; calm, screen-first | Gives up the display/body contrast; fewer weights than a pair | Least distinctive; safest |

[inferred] reading of the render: **A** looks right in Latin and numbers but its Cyrillic is the Russian style; **B** has the most contrast and the clearest hierarchy; **C** is the closest in feel to what the mock-ups imagine; **D** is calm but flat. I am not recommending one yet — the Bulgarian-letterform question (A.3) comes first, and it is yours.

## A.5 Other constraints a font choice must satisfy

1. **Cinzel decision (contradiction C3 in the brief).** Cinzel has no Cyrillic. The per-glyph Playfair fallback on web is already built; the mobile rule says never. A font with Bulgarian forms for display could make Cinzel unnecessary altogether (Latin-only needs: Roman numerals in the Guide, "R" retrograde mark).
2. **Italic availability.** Mobile loads `EBGaramond-Italic`; Playfair (v1 and v2) italic exists on the web side but the app's italic voice has been EB Garamond. Any pairing must supply a real italic (all of B, C, D do) — `fontStyle: 'italic'` on a font without an italic face is synthesised (false italic), which would also lose Bulgarian italic forms.
3. **Variable fonts on React Native:** B and parts of C are variable (`opsz`/`wght`). Expo/RN handling of variable axes is limited; static instances would be needed. **Not tested.** Spectral ships as static files and is the lowest-risk for native.
4. **Self-hosting:** all candidates are OFL; the web already self-hosts via `next/font/local` (ui-parity foundation). Subsets: latin + latin-ext + cyrillic.
5. **Tabular figures** for degrees/percentages (`DESIGN-RESEARCH` §B.1): check `tnum` per font — present in Source Serif 4, Spectral, Cormorant (listed in GSUB); not verified in rendering.

---

# B. Reference products

Selection: astrology, wellness, editorial, as asked. For each: what structure/guidance pattern works, what to take, what to avoid. Sources are cited; where a claim comes from the repo's existing research I say so.

## B.1 Co-Star (astrology)

- **What it is structurally [sourced]:** a text-first home of themed sections, two-option top navigation (Chart / Friends) that stays fixed while scrolling, "Fetching NASA data" as the loading state. Pratt IxD's critique praises the cut-off text at the bottom (it signals scrolling) and the low cognitive load of two options, and **criticises tiny section labels — users cannot tell which block is the actual horoscope.** [Pratt IxD critique](https://ixd.prattsi.org/2022/02/design-critique-co-star-iphone-app/); [Design critique summary page](https://ixd.prattsi.org/?p=23845).
- **Take:** one thing per scroll position; text as the interface; the loading line that states what is being computed (the project already does this in oracle-loading-v2); a bottom edge that visibly continues.
- **Avoid:** small, unlabelled section labels (the same defect the critic names), the voice (the repo's research already rules out roasting for the Bulgarian market).
- **Relevance to Stellaeum's current Днес:** the critique's complaint is the failure we have too — five small bronze captions make users work out which block is the reading.

## B.2 The Pattern (astrology)

- **Structure [sourced]:** the dashboard presents insights as themed cards ("Trusting Yourself", "Fears or Hesitation") with personal audio per trait; tabs for your Pattern, Timing, and Bonds; Bonds lets you try compatibility with public figures before inviting friends; paywalls appear contextually on locked chapters; users complain of aggressive paywalls. [ScreensDesign](https://screensdesign.com/apps/the-pattern/), [Pratt IxD critique](https://ixd.prattsi.org/2023/02/design-critique-the-pattern/), [Bustle comparison](https://www.bustle.com/life/pattern-co-star-astrology-apps-comparison).
- **Take:** the **guided** pattern — a named trait leads into one reading; Bonds' "try it on a public figure" is a free demonstration of the paid thing (a frictionless first step).
- **Avoid:** the card-per-trait stack (our language bans cards), the paywall shape.

## B.3 Chani (astrology — from the repo's research, not re-fetched)

- `MOBILE_UX_RESEARCH.md` §5.2 (**[sourced there]**, tour: [Chani help centre](https://chaninicholas.zendesk.com/hc/en-us/articles/8711720295187-A-Tour-of-the-CHANI-App)): Today / Week / Year structure; human-sounding voice over an editorial layout; an annual forecast as the premium hook.
- **Take:** time-scale as the organising idea (Ритъм's week/month/year); voice carries warmth, chrome stays quiet.

## B.4 Oura (wellness)

- **Structure [sourced]:** the redesign collapsed five tabs to three (Today / Vitals / My Health). The Today tab is described as "the 'Top Stories' page of a news app" — the most timely, relevant update first, surfaced by time of day; at-a-glance rings/bars on top, detail below; the company reports Today-tab click-through of 42% (+7 pts) after the relaunch. [Oura blog](https://ouraring.com/blog/new-oura-app-experience/), [Droid Life](https://www.droid-life.com/2025/11/13/oura-ring-app-gets-big-facelift-ai-gets-more-access-to-your-metrics/), [Instrument case study](https://www.instrument.com/work/oura-app).
- **Take:** **"what matters now, first"** as the rule for Днес; the first screen answers one question; detail is one tap away, not stacked beneath.
- **Avoid:** score-and-ring dashboard idiom (numbers over words; `MOBILE_UX_RESEARCH` §5.7 already prefers words).

## B.5 Calm (wellness)

- **Structure [sourced]:** a home dominated by one primary action (the Daily Calm), atmosphere (image, sound) before any menu, a once-daily notification, no pop-ups. [InVision on calm design](https://invisionapp.com/inside-design/calm-design-technique-ui), [Pratt IxD critique](https://ixd.prattsi.org/2018/01/design-critique-calm-ios-app/).
- **Take:** **one primary action, atmosphere first** — the structure Днес's moon + single «Питай Оракула» was meant to have.
- **Avoid:** nothing specific; note Calm's atmosphere is photographic (needs assets Stellaeum does not have — see the brief's asset list).

## B.6 Editorial: Apple Journal / Apple News (from the repo's research)

- `MOBILE_UX_RESEARCH.md` §5.5 ([sourced there](https://www.tomsguide.com/phones/iphones/ios-18-journal-whats-new-in-the-iphones-diary-app)): full-screen entry view with no chrome, date eyebrow, insights page as an ambient narrative summary.
- **Take:** reading screens drop chrome; a single date eyebrow; the diary should be written like a page, not a form.

**Pattern across all five:** each opens on **one thing**, labelled legibly, with the next step visibly one gesture away; none stacks five equal-weight labelled blocks.

---

# C. How good mobile-first products present on desktop

Evidence is thinner here — I could not fetch behaviour of logged-in products, so I rely on guidance documents and say where I stop.

1. **Adaptive canonical layouts (Material 3 / Android) [sourced]:** three patterns — **list-detail**, **feed** (single column → multi-column grid), **supporting pane** (≈ 2/3 primary + ≈ 1/3 secondary). On compact widths content stacks; on expanded widths panes sit side by side. The document says nothing in favour of simply centring a phone layout; its answer to large screens is **more panes, not a wider column.** [Android Developers — canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts).
2. **Reading measure [sourced]:** ~50–75 characters per line (Baymard, WCAG 1.4.8 ≤ 80); users experience fatigue above ~100 characters. A 430 px column of 17 px serif is already ≈ 40–45 characters — i.e. **below** the comfortable measure, which argues for a column nearer 520–600 px for reading screens even before any pane. [Baymard — line length](https://baymard.com/blog/line-length-readability). [inferred: 17 px Bulgarian serif ≈ 8 px/char average → 430 px ≈ 50 chars minus padding; I did not measure.]
3. **Instagram web (unverified):** a search snippet says the feed is a centred column with max-width constraints and a side rail; I did not confirm it from a primary source, so I am not relying on it.
4. **What this means for Stellaeum [inferred]:** the "mobile layout in a centred column" plan is the minimum viable desktop; the stronger pattern the sources support is a **centred reading column plus a quiet supporting pane** (e.g. Карта: wheel left, planet detail right — list-detail; Днес: reading centre, sky/moon in a supporting pane). That is a design decision for you, and **the desktop-shell decisions are on hold per your instruction**; this section only records what the evidence says.

---

# D. What I could not verify

- Whether React Native applies `locl`/BGR from the device locale when rendering text with a custom font [not tested].
- Whether variable fonts (Playfair 2, Source Serif 4, Cormorant) load acceptably in Expo; static instances may be needed.
- How the Bulgarian roman forms of each font look to a Bulgarian reader (A.3) — that is yours.
- Behaviour of Instagram/Duolingo/Spotify web — no primary source fetched.
- Co-Star and The Pattern's current (2026) versions: critiques fetched are 2022 and 2023.
