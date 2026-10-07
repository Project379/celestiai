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

**Mechanism [verified]:** the browser (and React Native on iOS/Android with the right `lang`/locale) picks Bulgarian forms through OpenType `locl` when the text is tagged `bg`. A font without a `cyrl/BGR` language system silently ignores the tag. **CSS cannot add forms a font lacks.** *(Correction 2026-10-07, founder: on the **web**, Bulgarian forms CAN be switched off per element with `font-feature-settings: "locl" 0` while keeping `lang="bg"`, so "Bulgarian forms in display only" is achievable on the web. Never tag Bulgarian text `lang="ru"` — screen readers would read it with a Russian voice. For React Native see A.9.)* On the web the fix is `lang="bg"` (already set on `<html>`) plus fonts that have them. On React Native this needs a separate check — I did not test whether RN applies `locl` for a `bg` locale; **that is an open risk for any font choice on mobile.**

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

**Honest caveat — this is exactly the thing I cannot judge and you can.** In Bulgarian book typography the *italic* forms are the strongly different ones; how far the *upright* forms should differ is a matter of taste and tradition, and these four fonts all choose the strong version when `lang="bg"` is set. If roman `т` as `m` looks wrong to you, the choices are: use these fonts with `lang="bg"` only on italics/display; use a font with a milder roman set (Lora/Vollkorn are candidates I did not render); or accept Russian-style roman forms and only localise italics — which — correction 2026-10-07 — **on the web CAN be split per element** with `font-feature-settings: "locl" 0` under `lang="bg"` (never tag text `lang="ru"`); in React Native it cannot (A.9).

## A.4 Three pairings (display + body), rendered with real app strings

**[Superseded 2026-10-07 — see A.6; the image was deleted because it used italic leads.]** Image was: `typography/pairings-in-app-sizes.png` — four phone-width columns, same copy (real strings from `index.tsx`, `moon-detail`, `compliance-copy.ts`), sizes from `tokens.ts` (body 17/27, lead italic 19, caption 12, CTA 22). Column A is the shipped combination for comparison.

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

## A.6 Upright renders, Bulgarian forms vs Russian-style forms (2026-10-07, replaces the old pairings render)

Each pairing rendered twice, **fully upright (no italic anywhere)**, same 390 px column, same sizes (app type scale), same strings: the Днес reading (three beats + sign quip), greeting, moon block and long paragraph (shipped `physicalAppearance`), Карта labels (name, Big Three rows, «Детайли», hint), the Bulgarian-distinctive letters in a row, and long words. Left `lang="bg"`, right `lang="ru"`. The old `pairings-in-app-sizes.png` (italic leads) was deleted as superseded.

| Pairing | Render |
|---|---|
| A · shipped today (Playfair Display + EB Garamond; static files from the app) | `typography/pairing-A-upright-bg-vs-ru.png` |
| B · Playfair 2 + Source Serif 4 | `typography/pairing-B-upright-bg-vs-ru.png` |
| C · Cormorant Garamond + Spectral | `typography/pairing-C-upright-bg-vs-ru.png` |
| D · Spectral only | `typography/pairing-D-upright-bg-vs-ru.png` |
| All four, `lang="bg"` only, side by side | `typography/pairings-upright-glance-bg.png` |

What the renders show [verified by looking, not by metrics]:
- **A:** the two columns are identical. Both shipped fonts ignore `lang="bg"`.
- **B, C, D:** with `lang="bg"` the **upright** letters change a lot, and all three fonts choose the same strong style: в like a rounded «в», д like a **g**-shape, и like a **u**, к like a **k**, л like **Λ**, т like an **m**, п like **n**. That is the Bulgarian-italic-derived roman set. Whether that is how you want upright Bulgarian body text to look is the question the renders exist to answer; CSS cannot give the Russian-style roman with Bulgarian italics from the same font (`locl` is per language).
- Paragraph lengths differ between the columns because the Bulgarian forms are wider.
- Caveats unchanged from A.1/A.5: React Native may not apply `locl` from the device locale (untested); Playfair 2 / Source Serif 4 / Cormorant are variable fonts (static instances may be needed); Cormorant is thin at 17–19 px on dark.

## A.7 Italics — RULED 2026-10-07: none; the italic face is dropped from the plan (original proposal below)

**Proposal: no italic role at all.**
1. **The job italics did is already done by other means.** Today italics mark (a) the greeting, (b) the reading's lead line, (c) the two instruction hints, (d) the chart name, (e) the Oracle's placeholder/ask-line. With the voice rule (the Oracle is the speaker everywhere) italic can no longer mean "the Oracle speaking"; bronze, position and the display face (the payoff) already carry hierarchy.
2. **Bulgarian italic is the highest-risk glyph set.** Every italic shipped today (EB Garamond Italic) is the Russian-style form (A.1 table). Doing it right means a second family of italic files with Bulgarian forms, on a platform where `locl` is untested.
3. **Fewer files.** Upright-only drops the italic face from the bundle and removes the false-italic risk entirely (rule 8 in the brief).
4. **If you ever want one:** the only defensible role is the **Oracle's single opening line of a reading** — one line per screen, never a hint or label. I do not recommend it; I name it only because you asked for at most one.

## A.8 Monospace for dates and labels — RULED 2026-10-07: retired (body font, tabular figures, 12 px floor); evidence below

Render: `typography/mono-vs-body-font.png` — eight real strings (date lines, diary date, specimen label, moon facts, upcoming dates, week-track labels, legend caps, numbers that must align) at the sizes the mock-ups/code use, in ① the mono stack (Consolas stands in for Menlo / Android monospace), ② today's body font, ③ a candidate body font (Source Serif 4) — ② and ③ with tabular figures.

Where mono is specified today: the mock-ups use `--mono` for eyebrows, date stamps, specimen labels, week-track labels, and upcoming-list dates; shipped code uses `font.mono` only in `NatalWheelLegend` (2 labels) and `ManifestDiaryContent` (2 date lines) — Днес and Карта already moved off it as "too rigid" (recorded rejection, current-state #22).

Findings:
- **Mono wins at 8–10 px** in the render: at 9.5 px EB Garamond is hard to read and the mono line is not. That is a size problem, not a typeface problem — the brief's own floor is 12 px (§2.1 rule 9) and every mono use above is below it.
- **Mono is not one face.** iOS gets Menlo, Android gets whatever `monospace` resolves to, so the same Cyrillic string renders in two different faces; neither has Bulgarian forms. The body font is the one face with control.
- **Alignment** (the one real job of mono) is solved by tabular figures: the last row of the render aligns in ② and ③.
- A mono face is a fifth typeface in the bundle for four small usages.

**Recommendation:** no monospace anywhere. Dates and labels in the body font, sentence case, tabular figures on, **12 px minimum** (retire the 8–10.5 px sizes with it). The tracked-caps legend labels fall under R3, not under this ruling.

## A.9 React Native and Bulgarian forms — report only (2026-10-07)

**Not tested on a device.** This machine has no Android emulator, no `adb` and no iOS device, and you asked for a device build (not Expo web); an Expo-web result would say nothing about native shaping. What I could verify is the API surface in the installed React Native 0.81.5 source:

- **[verified in source]** `fontVariant` maps to a fixed list of OpenType features (`smcp`, `tnum`, `lnum`, `onum`, `pnum`, `ss01`–`ss05` …); there is **no way to pass an arbitrary feature such as `locl` 0**. So "Bulgarian forms off for one element" is, as far as the public API goes, **not available in React Native** without a native module or a second font file.
- **[verified in source]** the Android text code never sets a text locale (no `setTextLocale`/`LocaleList` in `views/text`), and `Text` has no `lang` prop. Shaping therefore uses the platform default locale (the device's), which means Bulgarian forms would appear **only on a device whose system locale resolves to Bulgarian** — and on every other device the same string would show Russian-style forms.
- **[verified]** `tabular-nums` (`tnum`) IS available through `fontVariant` — relevant to the monospace ruling.
- **Not known:** whether iOS CoreText picks `locl` from the preferred language, and whether a bundled custom font gets Bulgarian forms on either platform.

**Test I would run on a dev-client build (a one-screen harness):** render the same Bulgarian string in each candidate font on (a) a device set to Bulgarian, (b) the same device set to English, (c) set to Russian; photograph all three. Expected failure to look for: forms follow the *device* locale, not the content — which would make font choice B/C/D depend on the user's phone language. If so, the remedy is separate static font files (one with the Bulgarian forms baked in as the default glyphs), not CSS.

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
