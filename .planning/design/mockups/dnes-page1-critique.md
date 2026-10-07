---
title: Page 1 (Днес + nav bar) — two directions, self-critique
created: 2026-10-07
status: FOR FOUNDER REVIEW. Mock-ups only, nothing wired, nothing committed. Open `dnes-page1-A.html` and `dnes-page1-B.html` in a browser (they load shared `_page1-common.css/js/boot.js` and the Spectral BG fonts from `apps/mobile/assets/fonts`).
rules: stellaeum-design skill, DESIGN-BRIEF.md (APPROVED 2026-10-07), R1–R7. Mock-ups are renders by design, so this critique covers layout and structure as well as type and colour. Built-code layout stays the founder's call on device.
---

# What is in the two files

Each file renders 12 states × 2 sizes (384×832 and 360×780 floor, with insets: top 32, bottom 24, tab bar 56, so the nav top is at 752 / 700), five nav active states, a pressed state, a live "first open" demo with a Replay button and a reduced-motion toggle, the motion table, the copy table with status per string, and automatic DOM measurements. `?group=a,b`, `?frame=…&size=…`, `?navs=1`, `?fs=1.3` (font-scale simulation), `?inset=48` (bottom inset for three-button navigation) and `?motion=1` give review views.

States: normal · scrolled to end · loading at 0 / 1.5 / 3.0 / 10 s · failure · offline with cache · offline without cache · regen cap reached · no chart · longest-real-strings stress. **Free vs premium and time-unknown are not separate states, verified in code:** tier only changes the Oracle topic padlocks (`oracle.tsx:66`), and `birth_time` only feeds houses/ASC (Днес uses the sun sign and the horoscope). First open after the reveal = arrival motion plus the Ти glyph lighting once.

# The one thing that differs: how Днес answers "what do I do next" when the 20 px reading is 677–739 px tall

Measured first on the shipped order (reading, then exit): **the exit sat 162 px (384) / 276 px (360) below the fold**. That is the problem both directions solve differently.

**Both directions reverse the shipped order.** Shipped Днес ends “reading, sign beat, moon, details link, then the single exit” (the result of a founder correction batch, see the `index.tsx` comments). In both A and B the exit now comes *before* the sign beat and the moon. That is a choice the founder is making by picking either, not a neutral change.

| | A "Първо изводът" | B "Един екран" |
|---|---|---|
| Move | payoff (dominant, C5) leads, then disclosure, then the lit exit; the **full** reading follows below the exit | opener + payoff only; development folded behind existing «Прочети повече»; moon becomes a 40 px tappable masthead object; sky section removed from Днес |
| Exit position, normal, 384 / 360 | y 321–377 / 321–377 (slack to nav 375 / 323 px) | y 582–638 / 613–669 (slack **114 / 31** px) |
| Worst case at 360, gesture inset 24 | slack 291 (offline with cache) / 292 (longest strings) | **offline with cache −1 px (the neutral retry exit is 3 px taller than the Oracle one), longest strings 0 px** |
| Same, three-button inset 48 (common on Samsung A-series; about 24 px less room) | slack 267 / 268 | normal **7 px**, offline with cache **−25 px**, longest strings **−24 px**: the exit is under the nav fade |
| System font scale 1.15× (normal, 384 / 360; inset 24) | exit bottom 434 / 471: fine | **756 / 828: below the fold at both sizes** |
| System font scale 1.3× (stress, 360) | 679 vs nav 700: fits, 21 px slack | 1138 vs 700: far below |
| Trade-off for the founder | payoff moves from the end of the reading to the top; the model writes it as a conclusion, shown once | the daily reading is no longer fully on first sight (one tap); the planet-by-planet paragraph is hidden by default |
| Moon | 148 px below the exit, secondary | 40 px masthead, doubles as the entry to the lunar profile (no «Повече детайли» link) |
| Nav | shipped device: violet point under the active label | violet horizon hairline lights above the active tab (more visible than a 3 px point) |

**Font scaling is not capped in the app (VERIFIED by grep of `apps/mobile`: no `allowFontScaling={false}` and no `maxFontSizeMultiplier` anywhere; the only hit is a comment in `Plaque.tsx`), so React Native's default scaling applies on Днес.** The 1.15× / 1.3× rows therefore describe what happens at larger system font scales. They come from a CSS simulation, not Android's real scaling.

**My read, stated plainly:** B's "fits one screen by construction" holds only at font scale 1.0 with gesture navigation, and even there it has 31 px of slack at 360 and is 1 px over in the offline-with-cache state. With three-button navigation it fails at the floor in two states, and at larger system font scales it fails at both sizes. A keeps the exit in the first viewport with 260+ px of slack at both insets and survives 1.3× (21 px slack at the floor in the stress case), at the cost of reordering the reading. If the founder rules out moving the payoff, B needs a fallback for large font scales (not designed here), or the fold has to be accepted. The two are not mixed: the nav treatments are independent of this choice and can be swapped (A's nav in B's page or the reverse).

# Self-critique checklist (evidence from renders and the DOM metrics; ✓ pass, ~ judgement call, ✗ fail)

Identical in both (ruled items kept identical so the comparison is real):

| Check | Result | Evidence |
|---|---|---|
| Font actually Spectral BG, Bulgarian forms | ✓ | `document.fonts.check` true for 400 and 700; renders show Cyrillic «т» as an "m" form, «д» as a "g" form |
| ≤ 4 sizes (R2), 12 px floor | ✓ | only 12 / 20 / 22 / 26 used; nav labels 12 (shipped code is 10.5, fixed here) |
| Tracked caps 0 (R3), no italics, no mono | ✓ | no uppercase, no letter-spacing in either file |
| Bronze = the Oracle speaking only (C8) | ✓ | bronze: payoff, «Питай Оракула» + its ember, lit placement glyphs in loading, A's lead line; captions and labels are faint/muted/starlight; the neutral lit exit (retry, empty) is starlight + violet, not bronze |
| One loop only (the ember); static stars | ✓ | probe: `.ember=breathe 2.6s`, everything else one-shot |
| Reduced motion | ✓ | probe with `rm`: every animation `none`; page defaults to the OS setting (this machine reports reduce) |
| Opacity + transform only, no overshoot, no stagger, no shimmer | ✓ | motion table; moon resolves with opacity only |
| No pills, cards, bordered boxes, chevrons, glass, gradients-as-fill | ✓ | failure/offline are plain text lines, not boxes |
| Loading: words, no bar/percentage, 0/1.5/3.0 s, slow line at 10 s | ✓ | placements light with their line (colour + glow + label, R7); captions fixed to two lines after the first render showed them running together at 384 |
| No horizontal overflow / clipping at 360, longest strings | ✓ | metrics `overflowX` none for all 24 frames; full-name greeting wraps to 2 lines; worst moon sub-label fits one line at 12 px |
| AI disclosure wherever AI text shows | ✓ B, ~ A | B: one disclosure under the payoff covers the text, including the expanded paragraph. **A: the full reading below the exit is AI text but the single disclosure sits above the exit, under the payoff.** One line covers the same generated reading, but whether that satisfies Art. 50 is the lawyer's question (already a lawyer-brief item); the alternative is repeating the line under the full reading. Absent (correctly) where the text is not AI: fail, offline-none, cap fallback, empty |
| Nav: 5 tabs, mixed case, no bronze, press = opacity + scale | ✓ | nav strips rendered at both widths |
| Nav fade | ✓ after iteration | first render let scrolled text bleed through the tab labels; the fade is now solid under the tab row and ramps out over 40 px above it |
| Moon not blown out | ✓ after iteration | first render was near-white and hard-edged (violated "no pure white", competed with the payoff); toned down and edge softened |
| Moon drawn at 62 % in every frame | ~ | static drawing; real phase shape is the real MoonHero's job; the moon/wheel material is a designer task (brief §5) |
| Ти tab icon legible | ✗ both | the placeholder Libra glyph at 20 px reads as an "equals" sign; needs the designer's glyph set or a bolder treatment. The no-chart frame uses the generic person icon (no chart means no sign). Not decided here |

Direction A: 1-second test ✓ (greeting + bronze payoff dominate); 2-second test ✓ (exit visible without scrolling at both sizes); continuation cue ✓ (the full reading starts right at the fold with its bronze lead line hanging in the gutter, so text keeps full width); R1 per C5 ✓ (payoff dominant). ~ The payoff reads as 5 lines of 26 px bronze at 360, a large block; ~ «Повече детайли» is a second tappable phrase (starlight + violet point, deliberately not bronze), kept to avoid a second competing ember; ✗ nothing fails outright, but the content-order change is a founder call.

Direction B: 1-second ✓; 2-second ✓ at font scale 1.0 with gesture navigation only; ✗ **fails at 1.15× and 1.3× font scale (exit below the fold)**; ✗ **fails at the 360 floor with three-button navigation (offline with cache −25 px, longest strings −24 px) and by 1 px offline-with-cache even with gesture navigation**; ~ zero slack at 360 for the longest strings with gesture navigation (the exit's last pixel lands on the nav top, its bottom edge inside the fade zone); ~ the 1 px violet ring marking the tappable moon is the closest thing to a border in either design (outline of an object, not a container; judgement call); ~ discoverability of the moon as a tap target has no label by design (no instruction text), which I cannot prove from a render.

# Findings in the shipped code (not fixed here; for the register)

1. **Offline shows the wrong message.** `index.tsx` sets `chart = null` when `/api/birth-data` fails for any reason, so an offline user sees «Картата ти още не е настроена…» (the no-chart empty state). The designed offline states assume the chart is known. Needs a separate "unknown" vs "none" state. VERIFIED by reading the code, not run on a device.
2. **Two failure strings.** Code: «Звездите мълчат - опитай отново след миг.» (hyphen, `index.tsx:400`); ratified: «Звездите са временно недостъпни. Опитай отново след малко.» The mock-ups use the ratified one; recommend retiring the other.
3. **Regen cap falls through to the composed fallback** and the code still prints the AI disclosure above non-AI text. The mock-ups drop the disclosure there.
4. `ErrorState` is a bordered rose box and `LoadingState` is a spinner (both banned here); tab labels are 10.5 px (under the 12 px floor); three bronze tracked-caps captions + caps on «Повече детайли» + the moon eyebrow (R3/C8); two instruction lines («Плъзни надолу…», «За целия лунен профил — докосни…»); moon entrance uses overshoot + rotate. All replaced in these mock-ups.
5. **Existing copy that breaks the voice rule (not reworded, rewordings are on hold):** sign quips for Лъв («трябва да признаем») and Скорпион («да крием») use «ние»; the Везни quip I used is clean but has a spaced hyphen where a dash is meant.

# Copy: every string and its status (full table with sources is in each HTML file)

Per your instruction, **everything is PLACEHOLDER_COPY except the founder-approved list** in the Bulgarian skill: «Питай Оракула», the five tab labels, and the ratified unavailable message. Reuse stays visible in the source column of the HTML table (“reused, existing in the app: file:line”). Copy-lock and shipped status are not approval.

**Approved:** «Питай Оракула» · «Днес» «Карта» «Кръг» «Ритъм» «Ти» · «Звездите са временно недостъпни. Опитай отново след малко.»

**PLACEHOLDER_COPY, reused unchanged from the app:** date line, greeting (including the full-name stress case), AI disclosure, «Повече детайли», «Прочети повече», phase names and the moon sub-label, meteor note, the Везни sign quip, the no-chart body and button, the composed fallback sentence for the regen cap.

**PLACEHOLDER_COPY, reused from the oracle-loading-v2 mock-up** (which itself marks them PLACEHOLDER_COPY; the brief only judged them voice-compliant): «Чета небето над теб…», «Свързвам местата, които се светват…», «Подреждам думите…», «Отнема по-дълго от обикновено…».

**PLACEHOLDER_COPY, new (each checked against the voice rule: neutral UI has no first person; Oracle lines are present tense and genderless):**

| String | Where | Voice |
|---|---|---|
| «Опитай отново» | retry button, failure / offline | neutral imperative |
| «Няма връзка. Показва се запазеното от днес.» | offline with cache | neutral, impersonal reflexive |
| «Няма връзка с интернет.» | offline, nothing cached | neutral |
| «Новото ти четене те чака утре.» | regen cap reached | Oracle, present tense, no gender |
| «Слънце във Везни» · «Луна в Скорпион» · «Асцендент в Лъв» | loading captions «<планета> в <знак>» (sample chart; в→във per bg-grammar) | neutral label |

# Open questions for the founder

1. **A or B** (or a different answer to the fold problem). This is the decision. Moving the payoff to the top (A) vs folding the development paragraph (B), knowing B does not survive larger font scales.
2. Nav: violet point under the label (A) or lit horizon segment (B)? Independent of the choice above.
3. Planet mentions inside the reading: shipped code highlights them in bronze; these mock-ups use weight only (C8: bronze is not a label colour). Keep?
4. The planet anchor row («♃ Юпитер») above the development paragraph is kept in A as shipped; B hides it with the paragraph. Keep?
5. «Повече детайли»: in A it is a second quiet link under the moon; in B the moon itself is the entry. Is the starlight + violet-point link device acceptable, and is an unlabeled tappable moon acceptable?
6. Offline: both offline frames withhold «Питай Оракула» (the Oracle needs the network) and make the neutral retry the single lit exit, including when a cached reading is shown. Is that the right behaviour?
7. The Ти tab icon placeholder (see checklist).

# Not verified / limits

- Layout was judged from renders of drawings, not on a device. Real fonts and densities differ; the founder's device review is the test.
- Font-scale results come from scaling the four tiers and their line heights in CSS (a simulation), not from Android's actual scaling. The bottom inset values (24 gesture, 48 three-button) are my assumptions for typical devices, not measured on the founder's emulators.
- Real model text was used (4 captured 2026-10-07, `gemini-3.7-flash`), with the server-filled placeholders (`[taspect:…]`, `[house:…]`) filled by hand ("тригон", "седмия дом"). One reading was used for all frames; shorter or longer readings change the numbers (the measured band was 58–77 words).
- Moon, wheel and glyph artwork are code approximations, as the brief says; the lit-glyph and moon rendering are not the final material.
- Animations were verified by computed styles (names and durations) and by the reduced-motion paths, not by recorded playback.
