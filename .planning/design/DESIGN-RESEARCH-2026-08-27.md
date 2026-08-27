---
title: Batch 8 Design Research — audit, craft references, user psychology
status: research only. Designs nothing. Read before the first Batch 8 mockup.
created: 2026-08-27
method: grep of apps/mobile + committed mockups + web reference screens for §A; web search with sources for §B/§C; WCAG contrast computed from real token hex for §D
epistemic: every claim tagged VERIFIED (I ran the grep / read the file / computed the number) or SOURCED (external research, citation given) or INFERRED (reasoned, confirming step named). Contradictions to our current design are stated flat, per instruction — not softened.
---

# Batch 8 Design Research

Three parts, as briefed: **A** audits the codebase and mockups against the
"vibe-coded" tells; **B** pulls craft references worth learning from; **C**
is the user-psychology research, with each finding marked CONFIRMS /
CONTRADICTS / GAP against what we already do. **D** is a contrast
measurement (the one place §C can produce a hard number). **E** proposes
changes, ranked by impact on intuitiveness, not visual novelty. Nothing
here abandons the design language or adds a dependency.

---

## A. Audit against the vibe-coded tells

**Framing:** this is an audit, not a redesign brief. The design language
already prohibits most of the list. The question is what crept in anyway.
The answer splits cleanly: **the shipped mobile core (Днес, Карта, the
design-system primitives, AppLoadingScreen) is clean.** **The paywall
surfaces — mobile `you/premium.tsx` and the web `/pricing` page it links
to — are where nearly every tell on the list lives.**

### A.1 What we genuinely avoid — VERIFIED clean

| Tell | Evidence it's absent |
|---|---|
| Lucide / icon-library glyphs | `grep` for `lucide`, `@expo/vector-icons`, `vector-icons`, `Ionicons`, `Feather`, `MaterialIcons` across `apps/mobile` → **zero hits**. The only glyphs are Unicode astronomical/astrological characters (`☽ ☾ ✦ ✕ ↑`) rendered as text in the serif families. |
| Inter / Geist / Space Grotesk | `grep` → zero hits (the "Inter" matches are all `interval` / `Interpretation`). Families are Playfair Display, EB Garamond, Cinzel (Latin only), system mono. |
| Emojis | zero in any user-facing string. |
| Pure-white backgrounds, neon, rainbow, basic pastel | palette is 3 near-black surfaces + one violet + one bronze + one steel-blue + neutral greys (`tokens.ts`). No white surface anywhere. |
| Three feature cards in a row / bento grid | no card grid in the shipped core; the design language's R6 ("card shape chosen by real string length") and §5 ("no cards") hold in Днес / Карта / Ритъм. |
| Soft corner radius everywhere | `grep borderRadius` in `apps/mobile` → largest value is **16**, most are 1–3px hairlines. Not a soft-corner app. |
| "It's not X it's Y" copy, checkmark bullets, fake testimonials, terminal windows | zero hits in mobile strings. |
| Coloured left stripes, dot grids, sparkle icons | none in the shipped core. |
| No ToS / no privacy policy | web `/privacy` route **exists** (VERIFIED — `apps/web/app/privacy/page.tsx`). `/terms` does **not** exist (VERIFIED — no route). Carried in the sweep doc §9.5 as an Apple 3.1.2 rejection risk; noting here only so §A is complete. |

### A.2 What crept in anyway — VERIFIED present

**A.2.1 — The mobile paywall screen (`apps/mobile/app/(authed)/you/premium.tsx`) is off the design language entirely.**
It is written in Tailwind-utility soup against `slate-*` / `violet-*` /
`rose-*` / `emerald-*` / `amber-*` classes, not design tokens, and every
structural choice is one the language prohibits:

- **Pill badges.** A `Badge` component (`premium.tsx:379`) — `rounded-full
  border px-3 py-1` tinted plaques with tracked-caps labels. §5 of the
  design language names "no pill badges" as a hard, if inferred,
  convention. There are four tone variants.
- **Cards / bordered-filled containers.** `rounded-2xl border
  border-slate-700/60 bg-[#0b0915]` (the cancel modal), `rounded-lg border
  ... bg-white/[0.03]` (`ActionButton`), `rounded-2xl border border-bronze/20
  bg-bronze/[0.05]` (the cancelling-state notice, `premium.tsx:225`). That
  last one is **bronze given a fill and a border** — the exact anti-pattern
  §5 calls out: "If a Batch 8 mockup gives bronze a filled shape, a border,
  or a pill/rounded-rect container, that's not this language."
- **A solid saturated button.** `bg-rose-600` (`premium.tsx:315`) — no
  other button in the app is a solid fill.
- **`font-cinzel` on Cyrillic**, at `premium.tsx:118` ("Профил"), `:141`
  ("Опитай отново"), `:368` ("Абонирай се на stellaeum.com"). This is the
  **REVISIT-42 HARD RULE** violation from `DESIGN-LANGUAGE-REFERENCE.md`
  §1 — Cinzel has no Cyrillic glyphs; it silently renders as a system
  serif. Already fixed 6+ times elsewhere; live here.
- **Feature-list diamond bullets.** `FeatureList` (`premium.tsx:341`)
  renders a `rotate-45` 1×1 bronze square before each of five feature
  strings — functionally the "checkmark bullets" tell.

**A.2.2 — The web `/pricing` page (`apps/web/app/pricing/PricingContent.tsx`) is the most vibe-coded screen in the repo, and it is the reference the three shipped mobile entry points point at.**
The mobile Кръг teaser CTA, the mobile `you/premium` free-state CTA, and
`getWebPricingUrl()` all resolve here. If the native paywall is ported from
this the way Кръг was ported from web, it inherits the following, all
VERIFIED by reading the file:

| Tell | Location |
|---|---|
| Harsh / decorative gradients | `bg-gradient-to-br from-white via-slate-100 to-amber-200/90 bg-clip-text text-transparent` (rainbow gradient headline text, `:108`, `:159`, `:215`); gradient card fills (`:191`); gradient button fills (`:260`) |
| Radial orbs | two `rounded-full ... blur-[120px]` / `blur-[100px]` ambient blobs, violet + amber (`:83`, `:87`) |
| Two pricing cards in a row + "Препоръчан" highlight badge | `md:grid-cols-2` (`:144`), floating recommended badge on the premium card (`:194`). This is the pricing-page cliché the brief asked to flag specifically. |
| Drop shadows / glow shadows | `shadow-[0_0_8px_rgba(251,191,36,0.6)]` on every diamond bullet, `shadow-[0_0_42px_rgba(167,139,250,0.14)]` on the card (`:191`), `drop-shadow-[0_0_28px...]` on text |
| Liquid glass | `backdrop-blur-sm` on both cards (`:151`, `:191`) |
| Animated shimmer sweep | CTA has a `-translate-x-full → group-hover:translate-x-full` gradient sweep (`:264`) |
| Checkmark bullets | `rotate-45 h-1 w-1 bg-amber-300` diamonds on `space-y-3` feature lists, both cards |
| Soft radius everywhere | `rounded-2xl` cards, `rounded-full` buttons |
| Blur-in staggered entrance motion | framer-motion `fadeUp` with `filter: blur(8px) → blur(0px)`, `delay: i * 0.08` (`:29`) — a common AI landing-page motion signature |
| Cinzel on Cyrillic | pervasive — "Цени", "Безплатен", "Премиум", "Твоят текущ план", footer (`:103`, `:154`, `:180`, `:202`, `:280`) |
| Roman numerals outside the Guide | `I · Безплатен`, `II · Премиум` (`:155`, `:204`) — violates R5 (numerals scoped to the Astrology Guide only) |
| Amber, not bronze | `amber-300` / `rgba(251,191,36)` throughout — web never got the Batch 6 amber→bronze migration |

This screen is web's, and web design is Petko's call — but it is flagged
here because **Batch 8's paywall mockup must be designed from scratch, not
ported from this**, and because the amber/Cinzel/numeral drift means web
`/pricing` is not a safe reference for anything.

**A.2.3 — Drop-shadow-as-elevation on the pre-redesign wizard.**
`grep shadowColor` shows `shadowColor: 'rgb(184,118,62)'` + `elevation: 4`
on the primary buttons in `wizard/confirm.tsx`, `wizard/location.tsx`,
`wizard/time.tsx`, and `components/circle/SavedProfileForm.tsx`. These are
bronze-tinted material-elevation shadows on rounded-rect buttons — the
pre-design-language button pattern. The wizard is explicitly in Batch 8
scope; noting it so the redesign replaces the shadow-elevation button with
`CtaPanel`'s glow-containment mechanism, not a restyled box.
(`CtaPanel.tsx:193` and `Pedestal.tsx:102` also set `shadowColor` — there
it is the iOS-only supplement to the SVG ember glow, ratified in §5, not
the same thing.)

### A.3 The two the brief pre-flagged — CONFIRMED

**A.3.1 — Skeleton loaders: we have none. VERIFIED.**
`grep -i skeleton|shimmer|Placeholder` across `apps/mobile` → one hit, a
comment in `rhythm.tsx` using the word metaphorically. Every loading state
in the app is a bare `ActivityIndicator` spinner (12 screens +
`components/design-system/States.tsx` `LoadingState`, which is a centred
`ActivityIndicator` + caption). The design-system comment on `States.tsx`
is explicit that this is deliberate: *"no tracked-caps eyebrow ... cuts
ornament hard in favor of conventional, unadorned states a first-time user
has seen a hundred times before."* So the absence is a considered choice,
not an oversight — but see §B.2 and §C for whether that choice holds up.

**A.3.2 — The pricing-tier shape for the upcoming paywall.**
Covered in A.2.2. The nearest existing artifact (web `/pricing`) is the
two-cards-in-a-row + recommended-badge + feature-bullet-list shape. The
mobile paywall does not exist yet — this is the moment to decide it is
*not* that shape. Concrete proposal in §E.

### A.4 Mockup-vs-reference divergences found in passing

Per the standing rule (mockups win over docs; divergences get reported,
not silently reconciled):

- The committed mockup HTML files carry an export wrapper that injects
  Claude-design-system CSS (`--cds-font-sans`, `Anthropic Sans/Serif`,
  `Anthropicons-Variable`). A naïve `grep font-family` on those files
  returns the wrapper's fonts, not the mockup's. The mockups' real
  families are `var(--body)` / `var(--serif-d)` / `var(--mono)` /
  `var(--numeral)`. Not a design problem — a caution for anyone auditing
  the mockups by grep.
- Web `/pricing` uses **amber** (`rgba(251,191,36)`); the current token
  is **bronze** (`#b8763e` / `#d9a06a`). `DESIGN-LANGUAGE-REFERENCE.md`
  §8 already records that the retired research doc still names amber; web
  `/pricing` is a second live amber holdout, not previously tracked here.

---

## B. Craft references — patterns to learn from, not adopt

### B.1 Vercel Web Interface Guidelines — the items that apply to us

Fetched from `vercel.com/design/guidelines` (SOURCED). We are on
react-native-svg; these are principles, not code to import. The ones that
map to a gap or a decision we have not made:

- **Loading indicators: add a show-delay (~150–300 ms) and a minimum
  visible time (~300–500 ms).** Prevents a spinner flashing for one frame
  on a fast response, which reads as a glitch. We have no such delay
  anywhere — `LoadingState` renders the instant `isLoading` is true.
  This is a small, dependency-free change (§E).
- **Loading copy keeps the original label + ellipsis** ("Генериране…",
  not swapping to a spinner with no words). `you/premium.tsx`'s
  `ActionButton` already does this (`'Зареждане...'`); most other screens
  do not.
- **"Every screen offers a next step or recovery path."** This is the
  empty/error-state rule. `States.tsx` `EmptyState` takes a `ctaLabel`
  + `onPressCta` — the primitive is right. The gap is that most screens
  don't use it and have no considered empty state at all (§C.5).
- **Design empty, sparse, dense, and error states as distinct things.**
  We design the populated state and bolt on a spinner. Named in §E.
- **Animate only `opacity` and `transform`; list the properties
  explicitly; honour `prefers-reduced-motion`; animations cancelable by
  input.** Our motion hooks (`motion.ts`) already return opacity/scale
  only and never translate (Guard 3). We do **not** check
  `prefers-reduced-motion` / RN's `AccessibilityInfo.isReduceMotionEnabled`
  anywhere (VERIFIED — zero hits). Real gap for `useBreathe`,
  `useSpin`, `WheelArrivalContainer`, `AppLoadingScreen`.
- **Touch target ≥ 44px on mobile; label and control share one hit
  target.** Worth a spot-check on `Plaque`'s three tappable rows and
  `NavRow` during the redesign; not audited this pass.
- **APCA over WCAG 2 for perceptual contrast**, and **`:active` state has
  more contrast than rest.** Our `pressFeedback` *reduces* opacity to
  0.6 on press — dims rather than brightens. Defensible (it's a
  "pressed-in" metaphor, two-axis so it clears R7) but worth knowing it's
  the opposite of the Vercel guidance.
- **`font-variant-numeric: tabular-nums` for compared numbers** — RN
  equivalent is `fontVariant: ['tabular-nums']`. Applies to the Карта
  degree readouts and any date/percentage column. Not set anywhere
  (VERIFIED).
- **Curly quotes, not straight.** Bulgarian copy should use „ " anyway;
  spot-check during the copy pass.

### B.2 Loading states — skeletons vs spinners, the actual evidence

The popular claim ("skeletons feel 30–50% faster") traces to Facebook's
own advocacy and a chain of secondary UX blogs, not a controlled study
(SOURCED, but weak). The **countervailing primary-ish result is Viget's
2017 test (136 participants): the skeleton screen performed *worst* — on
completion time, on rated wait experience, and on estimated wait length —
behind both a spinner and a blank screen.** The reconciliation in the
literature: skeletons help **only** when they mirror the final layout
closely and animate a directional wipe (not a pulse); a generic grey-box
skeleton is worse than a spinner. Vercel's guideline says the same:
*"skeletons mirror final content exactly to avoid layout shift."*

**Takeaway for us:** "add skeletons" is not automatically an improvement,
and a half-considered one would regress. Where a skeleton is worth it, it
must be a per-screen bespoke shape matching that screen's real layout —
which is a Batch 8 per-screen design task, not a shared primitive. Where
content arrives fast or the layout is unpredictable, a delayed spinner
(§B.1) is the better call. This is a genuine "the obvious improvement is
not obviously an improvement" case.

Sources: [Viget — A Bone to Pick with Skeleton Screens](https://www.viget.com/articles/a-bone-to-pick-with-skeleton-screens),
[Bill Chung — Everything you need to know about skeleton screens](https://uxdesign.cc/what-you-should-know-about-skeleton-screens-a820c45a571a),
[LogRocket — Skeleton loading screen design](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/),
[Vercel — Web Interface Guidelines](https://vercel.com/design/guidelines).

### B.3 Component libraries (Aceternity / Skiper / similar) — what's transferable

These are effect libraries (React + Framer Motion + Tailwind + often WebGL).
Nothing is adoptable — no dependency, and RN has no DOM. The *patterns*
worth lifting as principles, all of which our glow-containment mechanism
is already a version of:

- **Light as the highlight, not a box.** Aceternity's "spotlight" / "glowing
  border" effects work because the emphasis is a gradient of light with a
  transparent edge, not a filled shape. This is exactly
  `DESIGN-LANGUAGE-REFERENCE.md` §5–6. It confirms our instinct; it does
  not extend it.
- **Motion tied to a single continuous value.** Their scroll-linked and
  pointer-linked effects derive everything from one driver. Our
  `WheelArrivalContainer` already composes one timeline; the principle to
  carry into Batch 8 is *one driver per screen's entrance*, not several
  independent `useEffect` animations.
- **What to explicitly reject from them:** the aesthetic that got them
  popular — heavy blur, backdrop-filter glass, animated gradient borders,
  sparkle fields, `conic-gradient` spinners — is the vibe-coded list. They
  are a catalogue of what *not* to do as much as what to do.

---

## C. User psychology — how people actually use astrology / occult apps

Each finding tagged against our current design. Contradictions first-class
and unsoftened, per instruction.

### C.1 "Cold instrument, warm answers" — CONFIRMED, with a caveat

Our premise is a cold instrument that produces warm answers. The
comparative reception of Co-Star vs The Pattern supports the *instrument*
half directly: Co-Star is repeatedly described as feeling authoritative
*because* it foregrounds "NASA data," "your chart to the minute," and
technical astrological vocabulary — the machinery is visible, and that
visibility is what buys credibility in the category. The Pattern, which
hides the mechanism behind poetic language, is read as more approachable
but "less formally authoritative."

**Caveat (mild CONTRADICTION):** the warmth in successful apps lives in
the *writing*, not the chrome. Co-Star's interface is austere; its
personality is entirely in the sentence-level voice of the daily text.
Our design correctly keeps the chrome cold — but this says the burden of
"warm" falls almost entirely on the AI copy, which is currently the
Llama-placeholder that "produces non-words and drifts into Russian"
(known-open). The design cannot compensate for that. Worth naming: the
instrument is in good shape; the "warm answers" are not yet real, and no
amount of Batch 8 work changes that.

Sources: [The Pattern vs Co-Star (Bustle)](https://www.bustle.com/life/pattern-co-star-astrology-apps-comparison),
[Co-Star review (Aurae)](https://www.auraeastrology.com/blog/co-star-app-review-2026-an-astrologers-honest-opinion),
[Astrology apps ranked (Unstar)](https://unstar.app/blog/co-star-sanctuary-pattern-nebula-stellium-astrology-apps-ranked-2026).

### C.2 Onboarding before first value — CONTRADICTS our wizard

This is the one the brief expected, and the research backs the worry.

- Progressive-disclosure research (Nielsen Norman Group, cited widely):
  deferring non-essential input to later stages improves learnability,
  efficiency, and error rate, and cuts initial task time materially. The
  general onboarding principle across every source: **ask only what is
  needed to deliver the first unit of value, then ask for more as
  investment grows.**
- Form research (Baymard): a large majority of form abandonment is
  usability-driven, and each additional field measurably drops
  completion.
- Time-to-first-value: retention correlates strongly with users hitting
  a first meaningful result in the first few minutes rather than after a
  long setup.

**Our wizard is four steps — date, location, time, confirm — and shows
nothing until all four are done** (VERIFIED: `wizard/` has `date`,
`location`, `time`, `confirm`; `grep` for preview/teaser in the wizard →
nothing). The user gives up their birth date, a city search, and a time
(or an approximate-range choice) before the app has shown a single
sentence of output.

**What the research does *not* say, and where our instinct is partly
right:** astrology apps are a special case. The birth date + time + place
*is* the product's input — Co-Star, The Pattern, Sanctuary all collect the
full triple up front, and users tolerate it there because the value
proposition ("your personalised chart") makes the ask legible. The
mitigations that actually apply to us:

1. The wizard already has a **"time unknown → approximate range"** branch
   (VERIFIED, `wizard/time.tsx:222`). That matches the documented
   best-practice (always offer "time unknown"). Keep it, and make it more
   prominent — it is the single biggest friction reliever on the step
   most likely to stall someone.
2. Show **partial value before the time step.** Date + a rough location
   is enough to render sun sign, a provisional chart shell, "we can
   already tell you X — add your birth time to unlock the rest." That
   converts step 3 from a toll gate into an upgrade.
3. State *why* each field is needed inline (why exact time matters). One
   source in the app-dev literature names this explicitly for astrology
   onboarding.

**This is the highest-impact item in the whole report and it is a
contradiction: our wizard's "collect everything, then reveal" structure
is the shape the onboarding research most consistently warns against.**

Sources: [NN/g progressive disclosure (via secondary summaries)](https://lollypop.design/blog/2025/may/progressive-disclosure/),
[Baymard form abandonment (via summary)](https://www.alfdesigngroup.com/post/form-ux-best-practices),
[SaaS onboarding drop-off synthesis](https://www.saasfactor.co/blogs/why-users-drop-off-during-onboarding-and-how-to-fix-it),
[Develop an astrology app like Co-Star (birth-data UX)](https://www.code-brew.com/develop-an-astrology-app-like-co-star/).
Note: the specific percentages in these secondary pieces vary and are not
primary research — treat the *direction* as sound and the numbers as
indicative only.

### C.3 Ritual and return behaviour — CONFIRMS direction, GAP in execution

What brings people back daily in this category, consistently across
sources:

- **Exactly one push per day, at a consistent time** — Co-Star's "Day at
  a Glance." The scarcity (one, then wait until tomorrow) is the
  mechanism; when Co-Star's cadence crept to 2–3/day with upsells inside
  them, reviews turned. **CONFIRMS** the conservative-defaults posture and
  the sweep's push-cron design; the design implication is that the daily
  notification's *content* is a first-class surface, not an afterthought.
- **A single fixed daily moment in-app.** The thing users return *to* is
  one small, changing artifact — today's reading — in the same place
  every day. Днес is exactly this. **CONFIRMS** the 5-tab + Днес-as-home
  structure.
- **Social comparison is the retention multiplier**, not the core loop.
  Co-Star's chart-comparison / friends layer is what made it viral and
  sticky. Кръг is our version. **CONFIRMS** treating Кръг as the premium
  spine (mobile UX direction, locked 2026-04-18) — but the research says
  the comparison has to feel *fast and social*, and our ported Кръг is a
  form-heavy flow (saved-profile forms, invite links opening a browser).
  GAP for the Кръг redesign: the emotional core is "compare us in two
  taps," and the port is not that yet.

Sources: [How the design of Co-Star is conquering the masses (Design Matters)](https://recordings.designmatters.io/how-the-design-of-the-astrology-app-co-star-is-conquering-the-masses/),
[Co-Star review (Aurae)](https://www.auraeastrology.com/blog/co-star-app-review-2026-an-astrologers-honest-opinion),
[Astrology apps ranked (Unstar)](https://unstar.app/blog/co-star-sanctuary-pattern-nebula-stellium-astrology-apps-ranked-2026).

### C.4 Very dark, low-contrast, restrained type — PARTIAL CONTRADICTION

Our design is very dark (`base #08060f`, essentially black), low-contrast
in its tertiary tiers, and typographically restrained. The research:

- **Near-black backgrounds cause halation** — light text on
  near-#000 appears to bloom/blur, and it is materially worse for readers
  with astigmatism (a large minority). The consistent recommendation is a
  *dark grey* floor, ~`#121212` or lighter, not true black. **Our
  `#08060f` is darker than that recommendation.** With EB Garamond (a
  comparatively fine-stroked serif) at 17px as body, halation is a real
  risk, not a theoretical one.
- **~1/3 of users use light mode or switch by context/lighting** (NN/g,
  cited). We are dark-only with no light option and no plan for one. Not
  necessarily wrong for an atmospheric night-sky product, but it is a
  deliberate exclusion worth stating.
- Dark mode does **not** reduce contrast obligations — WCAG AA (4.5:1
  normal text, 3:1 large) applies identically. See §D for where we
  actually stand.

**Verdict:** the *darkness* is defensible as brand and category fit
(night sky, ritual, atmosphere) but sits past the comfort recommendation,
and the low-contrast tertiary tier is measurably under standard (§D). The
contradiction is narrow and fixable without abandoning the aesthetic:
lift the near-black floor a few points and raise the two weakest text
colours. It does not require making the app "lighter" in feel.

Sources: [Dark mode accessibility (Accessibility Checker)](https://www.accessibilitychecker.org/blog/dark-mode-accessibility/),
[Offering a dark mode doesn't satisfy WCAG contrast (BOIA)](https://www.boia.org/blog/offering-a-dark-mode-doesnt-satisfy-wcag-color-contrast-requirements),
[Dark mode & accessibility (MontanaB, citing NN/g)](https://montanab.com/2025/03/dark-mode-and-accessibility-is-it-really-better-for-everyone/).

### C.5 Empty and first-run states — GAP (this is where the app will feel cheap)

The brief already flagged we have "neither skeletons nor considered empty
states." Confirmed: `States.tsx` has an `EmptyState` primitive (body +
one `NavRow` CTA) but it is minimal and under-used, and there is no
first-run state design for Кръг (empty), the diary (no entries), or
recommendations. The category-specific point from the research: an
astrology app's empty states are **prime ritual-priming real estate** —
"you haven't saved anyone yet" is a chance to explain the compare loop, not
an apology. Co-Star's onboarding is praised for feeling "sacred"; the
inverse failure (a blank screen with one grey line) is exactly where an
app reads as a template.

### C.6 General intuitiveness principles — mostly CONFIRMS

- **Affordance:** our press feedback is universal (`pressFeedback` on
  every Pressable) and two-axis — good. The one weak spot: `NavRow` is
  the *only* primitive with a chevron, so "is this tappable" relies on
  the reader knowing that rule. Fine for a settings list; risky if a
  reading's "повече детайли" link doesn't read as tappable. Spot-check
  during redesign.
- **Progressive disclosure:** applied well *within* screens (Днес → moon
  detail; Карта → planet detail). Applied badly at the *onboarding*
  level (§C.2).
- **Error recovery:** `ErrorState` exists and every mutation hook
  invalidates its own key (verified in prior batches). The gap is the
  delayed-spinner / minimum-visible-time polish (§B.1), and that a
  generic 503 on the premium cap is deliberately indistinguishable from
  an outage (sweep #4 ruling) — correct for that case, but it means the
  error copy elsewhere has to carry more weight.

---

## D. Contrast measurement — the hard number

WCAG 2.1 relative-luminance formula, computed from the real hex values in
`apps/mobile/components/design-system/tokens.ts`, against `base`
`#08060f`. VERIFIED (computed, not estimated).

| Token | Hex | Contrast on `#08060f` | WCAG AA normal (4.5:1) | Notes |
|---|---|---|---|---|
| `text` | `#e2e8f0` | **16.3 : 1** | pass (AAA) | body / default label — excellent |
| `coolText` | `#bcd6ef` | **13.4 : 1** | pass (AAA) | |
| `bronzeText` | `#d9a06a` | **8.8 : 1** | pass (AAA) | |
| `muted` | `#94a3b8` | **7.85 : 1** | pass (AAA) | secondary text — fine |
| `faint` | `#64748b` | **4.23 : 1** | **FAIL** (passes large-text 3:1 only) | tertiary / caption / eyebrow colour |

**The finding:** four of five text roles clear AAA comfortably — the "low
contrast" worry does **not** hold for body copy, which is genuinely
high-contrast. But **`faint` (`#64748b`) is 4.23:1, below the 4.5:1 AA
floor for normal text** — and it is specifically the colour used for the
smallest type in the system: `type.caption` (12px, e.g. `LoadingState`'s
status line) and `type.eyebrow` (9.5px tracked caps). Sub-AA contrast at
9.5px is the worst combination of the two variables. This is the concrete,
measured version of "does our dark restraint hurt comprehension": not for
reading text, yes for the label tier, exactly where type is smallest.

Cheapest fix: nudge `faint` lighter to clear 4.5:1 on `#08060f` — roughly
`#6b7c94`–`#708096` gets there; needs the same computation to confirm the
exact value. Independent of any decision about the background floor.

---

## E. Proposed changes — ranked by impact on intuitiveness

Nothing here abandons the design language or adds a dependency. Ordered by
how much each moves "can a first-time user get it," not by visual novelty.

**1. Wizard: show partial value before the birth-time step — PRODUCT
QUESTION, needs a ruling before it can be scoped. (§C.2)**
Highest potential impact, but it is not a design change. Rendering "sun
sign / provisional chart after date + location" requires deciding: what
the chart engine can compute from partial input, whether a provisional
chart is persisted or thrown away, and what the flow does if the time
step is skipped outright. The `approximateTimeRange` branch already in
`wizard/time.tsx` means the data model already has opinions here. So
this needs a **scoping answer from you**, not just mockup approval —
approving "redesign the wizard" without settling it means discovering
the backend question at build time. The cheap, unambiguous part that
needs no ruling: make "time unknown → approximate range" a first-class
visible option on that step rather than a secondary toggle, and add one
line per field on why it's needed.

**2. Paywall: design it from scratch, explicitly not as the web `/pricing` shape. (§A.2.2, §C.1)**
This is the next actual mockup — and it is already the founder-approved
next screen (Ти-premium + paywall first).
No two-cards-in-a-row, no "recommended" badge, no gradient headline, no
shimmer CTA, no diamond-bullet feature list, no backdrop-blur. One screen,
one dominant element (per R1), the value stated as prose in the app's
voice, one `CtaPanel`-class invitation. The comparison that sells premium
in this category is emotional ("unlock your love / career / health
reading"), not a feature matrix. This is the next mockup after the wizard
question is settled.

**3. Rebuild `you/premium.tsx` on the design language. (§A.2.1)**
It is currently the most off-language shipped screen. Kill the `Badge`
pills, the `rounded-*` cards, the `bg-rose-600` button, the Tailwind
colour classes, and the three `font-cinzel`-on-Cyrillic sites. Status
becomes typographic hierarchy, not tinted plaques; actions become
`NavRow` / `CtaPanel`. Part of the same Batch 8 paywall/premium screen
group.

**4. Loading polish: delayed spinner + minimum visible time. (§B.1)**
Add a ~200ms show-delay and ~400ms minimum-visible to `LoadingState` (and
ideally a shared `useDelayedLoading` hook). Dependency-free, ~20 lines,
removes the one-frame spinner flash on every fast query. Do this before
investing in any skeleton.

**5. Skeletons: only per-screen, only where layout is stable, only if bespoke. (§B.2)**
Do **not** add a generic skeleton primitive — the evidence says a generic
one regresses. Candidates where a layout-matching skeleton is worth the
per-screen design cost: Днес (fixed hero + reading shape), Карта (wheel +
plaque). Everywhere else, the delayed spinner from item 4 is the answer.
Decide per screen during its own mockup.

**6. Considered empty / first-run states for Кръг, diary, recommendations. (§C.5)**
Treat each empty state as ritual-priming copy + one invitation, designed
with the screen, not a shared `EmptyState` afterthought. Кръг's empty
state in particular should teach the compare-in-two-taps loop.

**7. Contrast + background floor. (§C.4, §D)**
Lift `faint` to clear 4.5:1 (≈`#6b7c94`, confirm by computation). Consider
lifting `base` from `#08060f` toward `#0d0b16`–`#121016` to reduce
halation on the serif body text. Both are token-value changes; the second
touches every screen so it needs a device check. Low effort, real
comprehension payoff, no aesthetic cost.

**8. `prefers-reduced-motion` support. (§B.1)**
Gate `useBreathe`, `useSpin`, `WheelArrivalContainer`, and
`AppLoadingScreen`'s spin on `AccessibilityInfo.isReduceMotionEnabled()`.
Accessibility correctness; not user-visible for most, required for some.

**9. Kill the amber holdout in web `/pricing`, or at least don't reference it. (§A.4)**
Web is Petko's; the ask here is only that Batch 8 never treats web
`/pricing` as a design reference — it is on retired amber, Roman
numerals, and Cinzel-on-Cyrillic.

**Not proposed** (deliberately): a light mode, a skeleton primitive, any
new primitive, any motion library, any change to the Днес / Карта
foundation. The base is the base.

---

## Appendix — what was searched

Onboarding / time-to-first-value / progressive disclosure; astrology-app
authoritativeness (Co-Star vs The Pattern reception); daily-ritual and
push-notification retention in the category; dark-mode / near-black
legibility and halation; skeleton-vs-spinner perceived-performance
evidence (including the countervailing Viget result); Vercel Web Interface
Guidelines. Codebase greps and file reads for §A and §D are cited inline.
