# Celestia Mobile UX Research

**Written:** 2026-04-18
**Scope:** IA + layout recommendations for the web→mobile transition
**Status:** Opinionated proposal. Evidence follows the recommendation.
**Complements:** `SUMMARY.md`, `ARCHITECTURE.md`, `COMPETITOR_ANALYSIS.md` (strategic); this doc is UX-specific.

---

## TL;DR — Do this

**New IA:** 5-tab bottom nav + floating Oracle FAB + hybrid dashboard.

```
┌─────────────────────────────────────┐
│  ✦  Днес                            │  ← scan-in-2s header
│     [lunar] [streak] [meteor?]      │     (Oura-borrowed)
│                                      │
│  Hero reading (editorial)            │  ← keep Chani voice
│  ━━━━━━━━━━━━━━━━━━━━━━             │
│                                      │
│  [Moon]  [Crystal]                   │  ← bento launchpad
│  [Transit] [Кръг update]             │     2×2
│                                      │
│  · streak indicator ·                │  ← subtle footer
└─────────────────────────────────────┘
      ◎ ◎ ◎ ◎ ◎         🔮        ← FAB
   Днес Карта Кръг Ритъм Ти      Оракул
```

**The five tabs:**

| Tab | Bulgarian | Role | What lives here |
|---|---|---|---|
| 1 | **Днес** | Daily destination | Hybrid dashboard — ambient scan + hero reading + bento launchpad |
| 2 | **Карта** | Your chart | Natal wheel, Big Three, houses, aspects, planetary detail. The "correct science" tab. |
| 3 | **Кръг** | **People graph** (NEW) | Compatibility, partner, crush, friends, other people's charts. Premium wedge lives here. |
| 4 | **Ритъм** | Time-based | Transits, lunar cycle, yearly forecast, meteor showers. The "when" tab. |
| 5 | **Ти** | You + collections | Profile, manifest diary, crystal collection, premium status, settings |

**Oracle (persistent, contextual):** One tap from anywhere, pre-loads context of the current screen. *Expression is platform-specific — FAB on Android/web, nav-bar glyph on iOS (§2.6).*

**One load-bearing insight:** 5 of 6 upcoming features are relational. Celestia is becoming a **people-graph product**, not a bigger solo app. `Кръг` is not just another tab — it is the product's new spine and the entire premium wedge. Monetization, virality, and retention all live in that one tab. Everything else in this doc derives from that fact.

---

## 1. The load-bearing insight — why the people graph reframes everything

You described the six upcoming features almost as a laundry list:
- Compatibility + personality reports (premium)
- Analyze other people's charts (premium)
- Crush reports (premium)
- Yearly forecasts (premium)
- Couples with linked charts (premium)
- Friends with linked charts (premium)

**Five of six are relational.** One is time-based.

Today, Celestia is a solo-user product: *your* chart, *your* horoscope, *your* crystal. The current IA (`/dashboard /chart /transits /crystals /manifest /recommendations /astrology-guide`) has **zero slots for other people**. If you bolt compatibility into the nav as one more top-level label, you've added label #8 to a nav already breaking on 7 Cyrillic words. If you hide it in a sub-page, you've buried the monetization wedge — 100% of these features are paid.

Nebula does **$516k/month US revenue** as a "one-stop mainstream hub." The feature carrying that revenue is compatibility. Co-Star's biggest redesign push was *"putting more focus on how you compare with friends."* This is not coincidence — the people graph is the proven astrology monetization lever because:

1. **Viral coefficient > 1.** Every compatibility reading requires a second person → inbound share.
2. **Recurring curiosity.** New crush → new read → new paid unlock. Solo readings plateau.
3. **Sticky data.** Once you've entered three friends' birth data, leaving costs you a mini CRM.
4. **Pricing permission.** People will pay $7.99/week for relationship insight who won't pay $2.99/month for personal horoscopes.

The architectural move: **promote the people graph from "feature" to primary destination.** Make `Кръг` a bottom tab. Design the whole premium funnel inside it. The solo experience (Днес, Карта, Ритъм, Ти) stays mostly free; the relational experience is where money changes hands.

**Why "Кръг" (Circle) and not "Хора" (People) or "Приятели" (Friends):**
- `Хора` = cold, social-graph-y, reads like Facebook
- `Приятели` = platonic only; doesn't cover partners, crushes, ex-partners for closure-reading
- `Кръг` = has the mystical weight Celestia's voice needs. A circle is an inner circle, a sacred circle, a planetary orbit. The metaphor carries the editorial tone and matches the existing Cinzel/hairline aesthetic. Also pairs naturally with the Instagram "Close Friends" pattern (200-person cap, mutual consent) for the linked-charts feature.

**Why "Ти" (You) and not "Аз" (I / Me):**
- `Аз` is aggressive, SaaS, American tab-bar speak
- `Ти` is the app addressing you in the second person — consistent with the Celestia oracle voice ("Слънцето е в твоя ъгъл"). The app speaks *to* you, not *for* you.

---

## 2. Recommended IA — the full map

### 2.1 Днес (Today) — hybrid dashboard

**The problem you flagged:** current dashboard is too linear, every block has equal weight, nothing leads.

**Fix:** three-layer structure — ambient scan, editorial hero, bento launchpad.

**Layer A — Ambient header (first 120dp from top, scan in 2s):**
```
  [ 18 април · понеделник ]
  ☾ Растяща луна · ден 7
  🔥 streak 12    ☄ Лириди
```
Borrowed from Oura: users open the app in the morning and expect 0-2 sec scan — lunar phase, streak, meteor-if-active. **No sign-quip here**, no greeting. That moves below. This top strip becomes the "I opened the app, what's the weather?" answer.

**Layer B — Hero reading (editorial, unchanged voice):**
One block. The current `welcome.summary` + sign quip, bundled. This is the Chani/Apple Journal layer — the reading you came here to read. Full-width, breathing space, no card chrome. Keep Cinzel eyebrow, keep the hairline, keep the existing prose.

**Layer C — Bento launchpad (2×2 grid, where features surface):**
```
┌──────────────┬──────────────┐
│  Кристал     │  Лунна фаза  │
│  Розов кварц │  Ден 7/29    │
├──────────────┼──────────────┤
│  Транзит     │  Кръг  ← NEW │
│  Venus △ Sat │  Емма · ♀□♂  │
└──────────────┴──────────────┘
```
Each card is ~140×140dp, has one stat + one line of context, taps through. **The fourth card is the people-graph teaser** — a rotating "daily compatibility touch" against someone in your Кръг. This is the monetization hook on the home screen: non-users see a locked card → upsell.

**Layer D — Streak footer:**
Small, desaturated row. "Ти идваш тук вече 12 дни подред. Продължавай." Duolingo-style but whispered, not shouted.

**What this replaces in the current dashboard:**
- DailyHoroscope → moves into Hero as one expandable block
- LunarPhaseCard → shrinks to bento tile
- CrystalOfTheDayCard → shrinks to bento tile
- Sign quip → moves into Hero

**Total vertical height reduction: ~30%.** Current dashboard at 375×812 needs 3.5 scrolls; new target is 1.5.

### 2.2 Карта (Chart) — the "correct science" tab

This is where the user's "in-depth and correct science" requirement gets paid off. Current `/chart` page is already editorial and good — keep the voice, but restructure for mobile:

**Three sub-sections, accessible via horizontal scroll-chips at top:**
```
[ Същност ] [ Детайли ] [ Аспекти ] [ Къщи ]
```
- **Същност** (Essence): Big Three (Sun/Moon/Rising) — the editorial rows you already shipped with BigThreeCards, unchanged
- **Детайли** (Detail): All 10 planets + sign + house + degree + retrograde. Tappable rows open PlanetDetail sheet.
- **Аспекти** (Aspects): The aspect grid (major + minor toggle). Orb controls in settings.
- **Къщи** (Houses): House cusps + ruler + planets-in-house. Placidus default per existing ADR.

The natal wheel sits at the top, full-width, collapsible. On tap → full-screen interactive.

**What "correct science" means concretely here:**
1. **Expose real degrees.** Not "Lion Sun." Show "Sun 12°34' Leo, H5, direct." Co-Star gets dunked on by real astrologers for hiding this. Your users want it *and* they want it pretty.
2. **Orb settings accessible.** Default tight (6° conj/opp, 4° square/trine, 2° sextile). Advanced users can widen.
3. **House system visible.** Current plan is Placidus-only. Show it (small badge). Don't pretend it's neutral.
4. **Retrograde marked, not hidden.** Your existing `R` in Cinzel is good — keep it.
5. **Aspect patterns highlighted.** Grand trine, T-square, yod, kite — these are the "aha" moments that make someone screenshot and share.

The goal: an amateur astrologer opens Celestia and finds *more precision* than Co-Star, *less density* than Astro.com, all in Bulgarian. That's the wedge.

### 2.3 Кръг (Circle) — the people graph + premium spine

**Top-level view:**
```
  Твоят кръг
  ─────────────
  [ avatar ]  [ avatar ]  [ avatar ]  [ + ]
  Емма       Мартин      Ива       Добави
  ♀-♀ 94%   ♂-♀ 72%    ♀-♀ 81%

  ┌──────────────────────────────┐
  │  Днес в твоя кръг            │
  │  ♀ минава през Марса на Емма│
  │  Напрежение в комуникацията.│
  │  Пази се да не избухнеш.    │
  │  → премиум разбор (2.99лв)  │
  └──────────────────────────────┘

  ─── Отношения ───
  [ Партньор: Мартин ]    linked chart ⓘ
  [ Crush: Иван ]         soft radar
  [ Приятели: 4 ]         group reads

  ─── Прогнози ───
  [ Годишна прогноза ]    premium lock
  [ Месечен любовен     ] premium lock
```

**The interaction patterns (borrowed from proven sources):**

1. **Adding people** — Instagram Close Friends pattern. Mutual opt-in for linked charts (both users see each other's data), or **one-sided entry** for people who aren't on the app (you enter their birth data, they're "ghost" users, their chart is private to you). This is how "Crush" works — you don't need their consent to analyze them.

2. **Compatibility scores** — Nebula's three-axis model (romance/friendship/work) but reframed into one synthetic score per relationship + a *reason* string. Don't fetishize the number. "94% — защото Луните ви са в един и същ елемент" beats "94%" alone.

3. **Synastry/composite** — accessible but one layer down. Default surface is the "today's touch" card: "Venus is crossing Emma's Mars today — here's what to expect." This is the Strava-followers-leaderboard pattern applied to celestial events: make the general feed personal by filtering it through your circle.

4. **Group reads** (couples + friends) — composite chart for the couple, dominant-element radar for the friend group. These are premium unlocks.

**Premium gate strategy inside Кръг:**
- **Free:** Adding people, seeing their Sun/Moon/Rising, basic one-line compatibility score
- **Premium:** Deep synastry (houses + aspects between charts), daily "today in your circle" personalized cards, crush reports, yearly forecasts, linked-chart notifications
- **Pricing permission reminder:** This is where you can charge $7.99/week. People pay for relationship insight they won't pay for solo readings.

**The monetization flywheel:**
- New user adds partner → sees free compatibility teaser → hits paywall at the juicy detail → converts → comes back daily to check "today in circle" → adds friend → paywall resets → word-of-mouth to friend → new install. This is exactly Co-Star's viral loop and Nebula's revenue engine.

### 2.4 Ритъм (Rhythm) — time-based tab

Transits, lunar cycle, yearly forecast, meteor showers. The "when" tab — everything time-scaled.

**Structure (chips at top, mirrors Chani's Today/Week/Year):**
```
[ Днес ] [ Седмица ] [ Месец ] [ Година ]
```
- **Днес**: Current transits to your natal (hot aspects, moon phase of the day, void-of-course hours)
- **Седмица**: 7-day ahead key dates timeline (vertical stream, Apple Journal-style date eyebrows)
- **Месец**: Full lunar cycle with manifest-diary touchpoints — integrates your existing `/manifest` feature, so it's no longer an orphan route
- **Година**: Annual forecast (premium, one of your new features). Solar return chart + 12 monthly themes + personal year number.

**Key decision:** `manifest` becomes a sub-destination of `Ритъм`, not a top-level tab. Rationale: it's time-based (tied to the lunar cycle) and it has low visit frequency. Buried one level = correct importance weight.

### 2.5 Ти (You) — profile + collections

This is the "me" tab without calling it "Аз." Everything about the user:

- **Profile header** — name, birth data, sun/moon/rising
- **Crystals collection** — your existing dual-track (monthly windows + daily streak). This is a *collection*, not a daily reading, so it lives here not on Днес.
- **Diary entries** — manifest diary + any oracle readings you've saved. Collection view.
- **Premium** — subscription tier, manage, upgrade (Stripe portal web / RevenueCat native per existing stack decision)
- **Settings** — on web, opens SettingsContent inside Clerk popover (per `MEMORY.md: settings route removed`). On native, there is no popover — settings opens as a standard sheet/screen. Same component, different container.
- **Help + Ръководство** — moved down from top nav. The existing `/astrology-guide` becomes a sub-page here. Nobody opens a help section daily.

### 2.6 Оракул — persistent contextual chat (platform-specific)

**Critical platform note:** "FAB" is Material Design idiom, not Apple HIG. Bulgarian urban audience is iPhone-dominant; a floating button reads as alien on iOS. None of Co-Star/Chani/Sanctuary/Nebula use FABs. So the pattern is *persistent access, but expressed differently per platform*:

- **iOS (native):** Top-right glyph in the navigation bar on every screen. Tapping opens Oracle as a sheet (half-screen modal that slides up, dismissible by drag-down). Matches iOS pattern — see Messages/Mail action buttons.
- **Android (native):** Bottom-right FAB — this is the correct Material idiom, so use it here.
- **Web (current + PWA phase):** Match the Android FAB pattern since web has no dominant platform convention. Bottom-right, 80dp above any bottom nav.

**Visual across platforms:** Small amber/violet glyph (your existing Oracle gradient). Breathing animation (2% scale loop, 4s) on Android/web; static on iOS nav bar (animation in iOS nav bar reads as bug).

**Context inheritance:** When user opens Oracle from:
- Днес → pre-prompt: "За днес, Алекс..."
- Карта > Planet detail → pre-prompt: "За твоята Венера в Лъв..."
- Кръг > Емма → pre-prompt: "За твоята връзка с Емма..."
- Ритъм > transit → pre-prompt: "За днешния аспект Venus △ Saturn..."

This is Sanctuary's live-chat pattern but async + AI — and the contextual pre-prompt is what makes the FAB *feel like the app can see what you're looking at*, not a generic chatbot.

**Oracle in the new IA is strictly premium.** Free tier gets 3 queries/month as a teaser. This is a second monetization lever independent of Кръг — users who don't care about relationships but want personalized interpretation pay for the oracle.

---

## 3. Feature placement — where every existing + upcoming feature lives

| Feature | Current location | New location | Notes |
|---|---|---|---|
| Daily horoscope | `/dashboard` → DailyHoroscope | **Днес** → Hero reading | Full-width editorial |
| Lunar phase | `/dashboard` → LunarPhaseCard | **Днес** → bento + **Ритъм** → Месец | Surface twice, detail once |
| Crystal of the day | `/dashboard` → CrystalOfTheDayCard | **Днес** → bento tile | Tap → crystal detail |
| Crystal collection | `/crystals` | **Ти** → Crystals | It's a collection, not a daily destination |
| Natal chart | `/chart` | **Карта** | Full redesign per section 2.2 |
| Transits | `/transits` | **Ритъм** → Днес/Седмица | |
| Manifest diary | `/manifest` | **Ритъм** → Месец (sub) | Tied to lunar cycle |
| Recommendations (daily pick) | `/recommendations` | **Днес** → rotating bento tile (4th slot) | Daily pick; low friction |
| Recommendations (monthly arcs) | `/recommendations` | **Ти → Препоръки** | Full collection; destination |
| Astrology guide | `/astrology-guide` | **Ти** → Ръководство | Reference material, low-frequency |
| Oracle chat | Global panel | **FAB** (everywhere) | Premium |
| **Compatibility** (new) | — | **Кръг** → relationship detail | Primary premium wedge |
| **Other people's charts** (new) | — | **Кръг** → person detail | One-sided entry allowed |
| **Crush reports** (new) | — | **Кръг** → Crush | Premium, emotional hook |
| **Yearly forecast** (new) | — | **Ритъм** → Година | Premium, annual ritual |
| **Couples linked charts** (new) | — | **Кръг** → Партньор | Mutual opt-in like IG Close Friends |
| **Friends linked charts** (new) | — | **Кръг** → Приятели group | Max ~20 per group |
| **Sharing** (new, §11.4) | — | **Карта** share button, **Кръг** relationship share, **Днес** daily-read share | Viral lever; watermark on free, clean on premium |

**Every paid feature lives in Кръг or Ритъм→Година or behind the Oracle FAB.** This is intentional — the premium funnel has exactly three entry points, not scattered lock icons across the app.

---

## 4. Premium wedge placement — non-negotiable rules

Advisor called this load-bearing; it is. Three rules:

**Rule 1 — Premium is visible on the home screen every day.**
The Кръг bento tile on Днес is always populated. Free users see "Днес: Venus пресича Мартса на Емма" with a soft lock icon. One tap → upgrade flow. Не-платени потребители *see* the value daily.

**Rule 2 — The paywall is inside the reading, not before it.**
Nebula's mistake: hard lock on the whole compatibility screen. Co-Star's move: show the first sentence, blur the rest. Do the latter. Let them read "Luna-ta ti e v kvadrat s Marsa na Emma — напрежение в домашното" → blur → "Виж защо (premium)." The cliffhanger does the selling.

**Rule 3 — Price in лева, annual default.**
Bulgarian users aren't seeing $ prices well. Show лв. Default the CTA to annual (best value, lowest churn, matches the "yearly forecast" premium feature rhythm — people pay once a year for the year's forecast). Nebula's weekly price ($7.99) is predatory; don't copy it. Monthly + annual only.

**Pricing — DO NOT SHIP WITHOUT BULGARIAN MARKET TESTING.** Any numbers in this doc are placeholders for discussion. Actual pricing needs:
- Willingness-to-pay benchmarks from Bulgarian app-purchase data (not US dollar-based Nebula comparisons)
- Decoy pricing analysis (the annual plan anchors the monthly)
- A/B test on at least three price tiers before committing
- Local VAT + Bulgarian Stripe/RevenueCat currency support (BGN)
Structure should be **monthly + annual, annual default, no weekly plan** — that's the principle. Exact numbers: validate separately.

---

## 5. Competitor teardown — what each got right/wrong FOR US

Advisor trimmed this to three astrology + two adjacent. Here's what we can steal and what to avoid.

### 5.1 Co-Star — steal the voice, not the layout

**Steal:**
- Single-sentence advice principle. One hero reading, not five cards. Scarcity = luxury.
- Greyscale + whitespace restraint. Your editorial aesthetic already does this.
- "Content that feels like only your closest friends could say it" — this is exactly the tone your sign-quips reach for. Keep pushing that.

**Don't steal:**
- Their push-notification voice (aggressive, often mean). Bulgarian users trust authority figures, not snark.
- Their chart UI — it's confessedly hard to read. Their own designers (Fabien Cartal case study) call this out.
- Their questionable science. Real astrologers dunk on Co-Star for shallow interpretations. Your "correct science" requirement is the anti-Co-Star wedge.

**One direct pattern borrow:** their latest redesign moved daily horoscope to the primary home and added "more focus on how you compare with friends." We're doing exactly this — daily reading dominates Днес, compatibility dominates Кръг.

### 5.2 Chani — steal the structure, elevate the authority

**Steal:**
- Today/Week/Year home structure → our Ритъм tab chips are Днес/Седмица/Месец/Година
- "Me" tab for chart → we go one better with "Карта" (specific, not vague)
- Human-written voice over AI tone. Your sign-quips are written; your horoscope stream is LLM. Keep the hybrid but make sure the LLM doesn't drift into corporate-neutral prose.
- Annual horoscope as a premium hook. Chani charges $11.99/mo partly for Chani's own annual readings. Our "Yearly forecast" premium feature is the same play.

**Don't steal:**
- Chani's meditation/sleep-stories/audio integration. That's their wedge (queer feminist wellness brand), not yours. You're science-precise + Bulgarian cultural fit. Audio would be a distraction.
- Chani's queer/feminist explicit positioning. Your market (Bulgaria, 22-40 women, mixed progressive/traditional) reads this differently than LA. Celestia's voice is knowing-older-sister, not activist.

### 5.3 Nebula — steal the funnel, soften the greed

**Steal:**
- Compatibility-first IA. Their compatibility tab is top-tier nav. Our Кръг mirrors this.
- Three-axis model (romance/friendship/work). We can offer this as a "mode" toggle inside a relationship detail screen.
- $516k/mo revenue validates the wedge. This is *proof* the people graph monetizes — not a guess.
- Mainstream accessibility. Nebula is beginner-friendly. Celestia should be too, then reveal depth.

**Don't steal:**
- $7.99/week pricing. It's predatory and churns hard.
- Hard paywalls before any value. Soft-blur in-reading converts better.
- "One-stop hub" positioning — that's generic. Celestia's position is sharper: *premium precision, Bulgarian-first.*

### 5.4 Sanctuary — borrow the Oracle FAB metaphor, not the human astrologers

**Steal:**
- Live-chat as primary interaction. The Oracle FAB is our async-LLM-powered version of Sanctuary's "tap button, professional replies in minutes."
- Playful welcoming onboarding. Sanctuary's colors are warmer than Chani's — Celestia's current palette is deep violet/amber, which is on the cold side. Consider warming onboarding specifically (not the rest of the app).

**Don't steal:**
- Human astrologer marketplace. That's a whole operations layer (payments to pros, scheduling, quality control) that's not in your stack. Stick with AI.

### 5.5 Apple Journal — steal editorial-on-mobile mechanics

**Steal:**
- Fullscreen entry view. Your manifest diary should lean into this — no chrome, no nav visible, just text + hairline + date eyebrow.
- Insights page (streaks, word count, locations). Add to **Ти** — "Ти идваш тук вече 47 дни. Написа 12 записа в дневника. Марс в твоя Скорпион вече 9 седмици." Ambient narrative summary of usage.
- Minimalist search as an afterthought. Apple shipped Journal without search and added it in iOS 18 — proof you can defer it to v2.

**Don't steal:**
- Their suggestion engine (based on photos, workouts, locations). That's a whole iOS permission stack. Your suggestion engine is celestial (lunar phases, transits, meteor showers) — less invasive, more aligned with the product.

### 5.6 Duolingo — steal streak mechanics, not the frog

**Steal:**
- **23.5-hour reminder** after last session. The reason: users return at the same time they practiced the day before. For Celestia: send "Небесен ритъм за днес" at the time the user opened the app yesterday, not 8AM for everyone.
- **Streak freezes** as a subscription perk. Premium users get 3 free freezes/month (Duolingo's model). This adds a small ongoing reason to stay subscribed beyond feature access.
- **Home-screen widget** drove 60% retention increase at Duolingo. For Celestia: iOS/Android widget showing today's lunar phase + streak + first sentence of horoscope. Absolute priority for mobile launch.
- **7-day streak as psychological threshold.** Design specifically for surviving the first week. Day 3 and day 5 are the drop-off points; give them a small celebration.

**Don't steal:**
- The shame mechanic. Duo the owl's passive-aggressive tone. Bulgarian users trust seriousness, not guilt-trips.
- The cartoon visual vocabulary. Completely off-tone for Celestia.

### 5.7 Oura — steal the Today tab pattern

This is the clearest single pattern borrow in the whole doc.

**Steal directly:**
- **3-tab bottom + scan-in-2s top row.** Oura's structure is (Today / Vitals / My Health) with circular scores at the top. We adapt: 5-tab bottom (Днес/Карта/Кръг/Ритъм/Ти) with a small ambient strip at top of Днес.
- **Morning-first assumption.** Users open astrology apps in the morning just like Oura. Design the first-scroll content for that moment.
- **Rolling-window metrics over single-day scores.** Oura's Resilience Metric is a 14-day trend. For Celestia: a "Небесно настроение" trend over 7 or 14 days, showing aggregate intensity of transits. This is a real differentiator vs Co-Star's single-day snapshots.
- **Trend framing.** "Твоят ритъм е по-плавен от седмица назад" beats "Днес: 73%." Words over numbers, especially for a mystical product.

---

## 6. Non-astrology patterns — additional borrows

**Instagram Close Friends (people graph onboarding):**
- Mutual opt-in for linked charts. Both users must consent to see each other's data.
- Visual indicator for in-circle vs out-of-circle (your amber hairline could signal "in your Кръг" on a person card).
- 200-person cap is too many for astrology — cap at 50 people total (Dunbar-adjacent).

**Strava followers + segments (people + data):**
- Strava's segment leaderboards ranked by followers. For Celestia: a transit feed filtered by Кръг ("Venus square Mars is hot today — 3 people in your circle feel it strongest: Емма, Мартин, Иван").
- Free tier shows top 10 only; paid shows full list. Our parallel: free tier shows Sun/Moon/Rising for Кръг members; paid shows full synastry.

**Calm's Daily Calm (10-min themed session):**
- Opens with ambient sound (rain/crickets), not a menu. For Celestia: consider a first-open-of-the-day animation (slow fade-in with a single star, 2 seconds) before revealing the dashboard. Cheap, creates daily ritual feeling.
- Themed daily content (Gratitude / Anxiety / Patience). Your horoscope could have a daily theme drawn from dominant transit — "Днешната тема: преход."

**Spotify bento grid (discovery):**
- 2×2 / 2×3 card grids with contextual personalization. Our Днес bento layer implements this directly.
- Personalized prompts generating playlists. Our Oracle FAB's contextual pre-prompts are the parallel pattern.

---

## 7. Bulgarian market angle

Research found **no major Bulgarian-native mobile astrology app.** The Bulgarian astrology scene lives in:
- Old-school websites (bg-astrology.net, astropro.blog.bg, zodiac.dir.bg, astrohoroskopi.com, mira-kuneva.com)
- Named authority astrologers with personal brands (Николай Дойнов, Мира Кунева, Валентина Радиева-Маренова, Божидар Ръсовски, Мирела Лазарова)
- BG-Mamma forum threads
- Facebook pages

**Implications for Celestia:**

1. **The gap is real.** Bulgarian users currently either (a) use English-language Co-Star/Chani/Nebula with translation friction, or (b) visit dated Bulgarian websites with no chart visualization. There is no modern native mobile astrology app in Bulgarian. This is a greenfield.

2. **Authority figures matter.** Bulgarian users trust named astrologers. The Celestia brand itself doesn't have a face. Consider a future content pillar: collaborations with established Bulgarian astrologers (monthly forecast written by Мира Кунева, voiced-over transit explanation by Божидар Ръсовски). This is how you acquire trust in Bulgaria — borrow it from existing authorities. See `COMPETITOR_ANALYSIS.md` for more.

3. **Cyrillic text density affects layouts.** Bulgarian words are ~15-20% longer than English equivalents on average (Ръководство = 11 chars, Guide = 5). Your current nav already shows the strain. Specific implications:
   - **Tab labels:** "Днес / Карта / Кръг / Ритъм / Ти" — all ≤5 chars. This works. Avoid 7+ char labels in tab bar.
   - **Bento cards:** Keep to 2 lines max, ~14 chars/line at current Cinzel sizing.
   - **Buttons:** "Добави в Кръг" works; "Добави човек към твоя кръг" doesn't fit. Shorten.
   - **Test your hero typography on long Bulgarian words.** "Доброжелателност" will break your current 2.75rem Cinzel at h1.

4. **Localization-only markets (Romania, Serbia, Greece).** The same stack that wins Bulgaria can expand to nearby non-English markets with the same "no modern native app" gap. Post-MVP growth path.

5. **Cultural fit — astrology + Orthodox tradition.** Bulgarian culture blends Orthodox Christianity with folk mysticism (баби/врачки, self-identified psychics). Don't position against or in conflict with faith — Celestia sits next to, not instead of. Avoid aggressive Western-wellness language ("manifest your abundance" etc.).

---

## 8. "Correct science" — what it means on mobile

You flagged this explicitly. It's positioning, not just UX. Co-Star gets dunked on by professional astrologers for being shallow; Celestia's wedge is *precision-plus-beauty*.

Concrete mobile implications:

**On the Карта tab:**
1. Show raw astrological data — degrees, minutes, house, retrograde status, speed (for moon/faster planets).
2. Expose house system used (Placidus per ADR). Small badge, tappable for "why this system."
3. Show aspect orbs numerically when tapped ("Venus ☌ Sun — orb 2°14'").
4. Include minor planets that matter for Bulgarian astrology (Chiron at minimum; Lilith is popular too).
5. Aspect patterns (Grand Trine, T-Square, Yod, Mystic Rectangle, Kite) auto-detected and highlighted.

**On the Ритъм tab:**
1. Void-of-course Moon hours (Chani has this; it signals seriousness).
2. Out-of-bounds declination (obscure but real; zero competitors show it in Bulgarian).
3. Mutual receptions + aspect exactness to the minute.
4. Return charts (solar return, lunar return) as yearly/monthly premium unlock.

**On Oracle FAB:**
The LLM must not hallucinate astrology. System prompt should include:
- The user's exact chart data
- Current transit calculations from `/api/transits`
- Rules against predictions that contradict the chart (e.g., don't tell a Capricorn they're emotionally flighty)

**What this buys:** social proof from the Bulgarian astrology community. If Мира Кунева or Николай Дойнов publicly endorses Celestia because "accuracy is real," you've won the hardest customers in the market.

---

## 9. Aesthetic translation — Cinzel editorial → mobile

Your current aesthetic (Cinzel uppercase + hairline dividers + deep violet/amber + single-column long-form) is distinctly editorial-mystical — close to Chani, not Nebula. On mobile, some of this survives, some doesn't.

**Survives:**
- Cinzel eyebrows (10-11px, tracked, uppercase) — these are iconic, keep them
- Hairline dividers between sections — they're low-fi and beautiful
- Amber-on-violet accent — mystical without being tacky
- Long-form reading blocks on Днес hero + Кръг reading screens
- The sign-quip voice — funny, knowing, short. This voice IS the brand.

**Dies:**
- 2.75rem Cinzel headings at mobile widths — too big, breaks on Bulgarian words
- mb-12 vertical rhythm — wastes screen on mobile (reduce to mb-8 / 32dp)
- Max-w-2xl containers — designed for desktop reading, drop on mobile
- Italic (already stripped per last commit — good)
- Heavy drop-shadows (drop-shadow-28px) — performance cost on native; use opacity + glow layer

**New additions the mobile pattern needs:**
- **Bottom tab bar** — needs clean icon vocabulary. Your existing `CelestialIcons` library is the starting point. 5 tabs need 5 consistent glyphs: crescent moon (Днес), wheel/chart (Карта), concentric circles (Кръг), spiral/cycle (Ритъм), single star (Ти).
- **FAB** — Oracle glyph with breathing animation. Must read as "magical + action" not "chatbot."
- **Card chrome** — for bento tiles, you need card edges. Current app has zero card edges (hairlines only). Introduce a subtle card style: 1px violet border, 16px radius, no fill. Consistent across the whole app.
- **Active tab indicator** — keep the sliding amber hairline from current nav, port it to the bottom tab bar. This detail is signature.
- **Scroll-chips** (top of Карта, Ритъм) — Cinzel 10px, tracked, pill-shaped with amber active state. Reuses nav language.

---

## 10. Phased rollout — mobile-led, web-as-parallel-channel

> **Epistemic tags in this document:** [verified] from files read; [inferred] from files; [planned] not yet implemented; [assumed] conventional wisdom / placeholder.

**Decided 2026-04-18:** Mobile is end-goal and 80%+ of current web traffic is mobile [assumed — awaiting analytics]. Reframe:

- **Mobile-led** [planned] = native is the primary surface we design, test, and ship to
- **Web-as-parallel-channel** [planned] = stays alive as (a) a faster iteration sandbox (no App Store cycle), (b) Bulgarian SEO acquisition funnel ("хороскоп", "натална карта"), (c) desktop/shareable surface for free-tier content
- **Not web-first:** push, home-screen widgets, and OS-level notification scheduling are native-only. Every week spent on web-only features is a week those wedges don't exist. [verified: web push works but lacks widgets and OS scheduling; Duolingo 23.5hr pattern requires background scheduling unavailable on web]
- **Not web-throwaway — but "Solito code share" is narrower than it sounds.** [verified from codebase audit 2026-04-18] Solito provides universal `Link`, `useRouter`, and `useParams` primitives that wrap `next/link` on web and `expo-router` on native. That's its surface area. Everything else is per-component work.

- **What does NOT port automatically** — concrete list, with current usage counts across `apps/web/components/` + `apps/web/app/` [verified via grep 2026-04-18]:
  | Non-portable surface | Files affected | Migration path |
  |---|---|---|
  | HTML elements (`<div>`, `<span>`, `<button>`, `<a>`, `<img>`, `<input>`, `<form>`) | 83 | Rewrite as `View`/`Text`/`Pressable`/`Image`/`TextInput` |
  | `next/link`, `next/image`, `next/navigation`, `next/headers`, `next/server` | 32 | `solito/link`, `expo-image`, `expo-router` hooks |
  | `framer-motion` | 36 | `react-native-reanimated` — different API (worklets, shared values); Moti is a thin portable wrapper but not 1:1 |
  | `window.*` / `document.*` / `localStorage` / `navigator.*` | 16 | `AsyncStorage`, `expo-device`, platform checks |
  | D3 / Canvas (`NatalWheel`, `CelestialCanvas`) | 8 | `react-native-skia` — completely different rendering primitives; this is real rewrite work, not port |
  | NativeWind v4 gaps vs Tailwind | all styled files | No `grid` utilities, partial pseudo-selectors (`:hover` is non-sensical on touch anyway), no complex `linear-gradient` via class — use `expo-linear-gradient` component or Skia |
  | Form file uploads (`<input type="file">`) | unverified — check before Кръг photo-avatar flow | Expo: `expo-image-picker` + `expo-document-picker`; different event model |

- **What DOES port** (write once, used on both): [planned for `packages/ui`]
  - `react-hook-form` (6 files today) — works on both surfaces with shared validation
  - Zod schemas (no `packages/zod-schemas/` exists yet — [planned])
  - Pure business logic (`packages/astrology` — [verified platform-agnostic])
  - Components authored with `View`/`Text` + NativeWind from day one
  - `solito/link` if used instead of `next/link` — [planned]

- **What actually shares cross-platform** — corrected framing [planned]: API routes are consumed over HTTP by any client, independent of Solito. Both clients hit `apps/web/app/api/*` endpoints. Cross-surface *contract* sharing needs explicit scaffolding: a `packages/api-types/` with Zod schemas, or tRPC/oRPC for RPC-level typing. Neither exists today.

- **Honest Phase B expectation:** "Web gets it free once native exists" is **false for any screen that touches the audited non-portable surfaces**. Realistic plan: new premium screens (Кръг add-person flow, synastry detail, subscription paywall UI) are built universal-first in `packages/ui`; existing web-only components stay web-only until explicitly ported. Budget per-component: 0.5 day to universalize a small card; 2-5 days to rewrite a wheel/canvas component.

### Phase A — Scaffold in parallel (2-3 weeks)

Work two tracks simultaneously. Small team can parallelize because these touch different parts of the stack.

**Web track (finish in-flight IA work):**
1. Bottom-nav-as-top-nav for mobile viewport on web (≤768px: hide horizontal scroll, show 5-tab bottom bar with same structure)
2. Desktop keeps horizontal top nav but reduces to 5 labels (Днес, Карта, Кръг placeholder, Ритъм, Ти + Oracle button)
3. Consolidate routes: `/manifest → /rhythm/journal`, `/crystals → /you/crystals`, `/recommendations → /today/featured` (daily pick) + `/you/recommendations` (monthly arcs), `/astrology-guide → /you/guide`
4. Ship the Днес hybrid dashboard (three-layer: ambient / hero / bento)
5. Implement Карта scroll-chips restructure

**Native track (start Expo scaffold):**
1. Initialize `apps/mobile` with Expo SDK 53, NativeWind v4, expo-router (Solito's routing primitives wrap expo-router on native + next/router on web) [verified — chosen stack in `SUMMARY.md`; scaffold shipped in commit `db8a3e4`]
2. Clerk expo SDK integration + Supabase native client with `accessToken()` pattern [planned — per stack ADR; not yet wired]
3. **Shared components in `packages/ui`** — any new component intended for both surfaces must be written against universal primitives (RN `View`/`Text` + NativeWind). Existing `apps/web/components/` uses `next/link`, framer-motion, and HTML elements — those will NOT automatically port. Expect per-component decisions: universalize it in `packages/ui`, or write platform-specific versions. [planned]
4. First native build = shell only: 5 tabs + iOS nav-bar Oracle glyph (Android FAB) + empty screens, navigable. TestFlight internal build. [planned — Expo Go works today; TestFlight requires EAS build config]
5. RevenueCat setup (before paywall code — it takes App Store product config that has lead time) [planned]
6. Push notification permission flow scaffold (no notifications yet, just the plumbing) [planned]

**Phase A exit criteria:** TestFlight build navigates all 5 tabs, renders the user's chart, opens Oracle. Web has the new IA live for existing users. No premium features yet — this is infrastructure.

### Phase B — Кръг on native-primary (4-6 weeks)

This is where the mobile-led bet pays off. `Кръг` is built on native FIRST because it needs push + IAP + the full relationship UX. Web gets it in parallel — but the "free from Solito" framing is misleading: only code written against universal primitives ports for free. Plan for per-screen decisions: share the data/API layer via `packages/astrology` and Zod schemas [planned], share screen components only if they're authored universal in `packages/ui` [planned].

1. Add-person flow (ghost-user mode only; mutual consent deferred to Phase C)
2. Synastry calculation API route (`packages/astrology` extends for two-chart aspect grids)
3. Free tier: Sun/Moon/Rising compatibility + one-line score
4. First paid feature: "Днешен ден в твоя кръг" (daily transit feed filtered by Кръг members)
5. **RevenueCat paywall flow on native** [planned]. Stripe web paywall in parallel — both clients hit shared `/api/webhooks/*` endpoints on the Next.js server; payment UIs are platform-specific. Not a "Solito thing."
6. Push notification: daily horoscope at user's pattern-time (23.5hr rule)
7. Soft launch — 50-100 Bulgarian users via TestFlight + Google Play internal track. Collect real push/widget/paywall data before GA.

**Phase B exit criteria:** A user can install the native app, enter their birth data, add Emma to their Кръг, read the free Sun/Moon/Rising compatibility, hit the paywall on "Днешен ден в твоя кръг," convert to premium via RevenueCat, and receive a push at 9:47 AM the next day. Same flow works on web via Stripe. That's one complete revenue loop validated.

### Phase C — Remaining 5 premium features, native-primary going forward (~8-12 weeks)

Iteration pattern inverts here: ship to web first (faster — no App Store), validate, release on native.

1. Crush reports (one-sided ghost profile, emotional hook)
2. Couples linked charts (mutual opt-in, Instagram Close Friends pattern from §6)
3. Friends group reads (composite + dominant-element radar for groups of 3-8)
4. Yearly forecast (Ритъм → Година — solar return + monthly themes + personal year number)
5. Deep synastry (houses + aspects + composite charts — premium tier 2 if price-tiering)

Native-only during this phase:
- Home-screen widgets (iOS Live Activities + Android widget) — Duolingo-style streak + today's lunar phase + first sentence of horoscope
- Biometric auth via Clerk
- Notification taxonomy expansion (exact transit, Кръг member events, Oracle follow-ups) per §12.3

### Phase D — Web reposition, native as the product

Web stops receiving new features and becomes:
1. **Acquisition funnel.** Bulgarian SEO content pages — guides on "какво е натална карта," "лунни фази за манифестиране," etc. These pages convert visitors to app installs, not web signups.
2. **Shareable chart surface.** "Виж моята натална карта" link works in the browser for people who don't have the app. OpenGraph previews for Instagram/Viber shares.
3. **Desktop read-only-ish.** Logged-in web users can read their chart, Днес, Ритъм. Кръг is redirected to "За пълното преживяване, изтегли приложението" with App Store / Google Play buttons.
4. **Oracle chat on web** — remains available because it's a genuine use case (researching something on a laptop). But widgets, push, IAP never come to web.

### Cadence + release notes

- **Native releases: bi-weekly max** (App Store approval is 7-14 days, TestFlight faster but internal only)
- **Web releases: daily/continuous** — web is the canary for new feature validation
- **Version parity drift:** when a feature exists on web before native, hide it behind a remote-config flag server-side until native ships. Users never see web screenshots of features the native app doesn't have.
- **Bulgarian iOS/Android split:** ~55-65% iOS per Statcounter (verify with your own analytics). TestFlight is your primary canary; Google Play internal testing is secondary.

---

## 11. Decisions applied (2026-04-18)

Open questions resolved in conversation. Kept as a record so nobody re-asks.

### 11.1 Recommendations — SPLIT (hybrid)
**Decided:** Both options, split across two surfaces.
- **Днес** → rotating "Препоръчано днес" card appears in the bento grid as the *rotating fourth tile* (alongside Crystal / Moon / Transit / — now: Recommendation). Surfaces daily pick with low friction.
- **Ти → Препоръки** → holds the full monthly arc (12 arcs × book/film pairs) as a scrollable collection. Daily pick is a tap-out from Днес; monthly arc is a destination.

Implementation: existing `/recommendations` page splits into `/today/featured` (surfaced via bento) + `/you/recommendations` (full collection).

### 11.2 Manifest diary — Ритъм sub + Oracle shortcut
**Decided:** Diary lives under Ритъм → Месец. Oracle FAB adds "Запиши в дневника" as a contextual action so writing stays one tap away without consuming a tab slot.

### 11.3 Astrology guide — HYBRID (demote + embed)
**Decided:** Both. The dedicated guide demotes to `Ти → Ръководство` (low-frequency reference material). Inline tooltips ("научи повече" → bottom-sheet) appear everywhere a technical term is used — planet detail, sign, house, aspect rows in Карта, and transit explanations in Ритъм. Learning happens where the question is asked; the full guide remains for curious users who want to read end-to-end.

### 11.4 Sharing — YES, promoted to a feature
**Decided:** Add natal-chart share + compatibility share as explicit features. Viral lever.

Implementation surfaces:
- **Карта → share button** — exports natal wheel + Big Three as a shareable image (OpenGraph preview for Instagram/Viber stories, aspect ratio 9:16 for Stories, 1:1 for feed)
- **Кръг → relationship share** — "Емма и аз — 94%" card with teaser synastry line and a CTA link. Recipient sees preview in browser; tapping CTA opens app install or web login
- **Днес → share daily reading** — horoscope text + lunar glyph + sign, same editorial aesthetic

All share images generated server-side via a `/api/og/*` route (Next.js handles this natively). Free-tier share includes Celestia watermark; premium removes it — secondary upsell lever beyond Кръг.

### 11.5 Ghost profile merge — YES, viral vector
**Decided:** Ghost profiles are implemented. Merge prompt when the email/phone of a ghost matches a new signup: "Emma на Celestia ли е? Свържи." Every ghost profile becomes a pending acquisition — this is the inbound referral mechanism.

Technical: ghost profile stored with `owner_user_id` (you) + email/phone for future matching. On new signup, backend checks ghost profile matches and prompts both users for linked-chart consent.

### 11.6 Native vs web push — parallel, native-primary
**Decided:** Mobile-led rollout per §10. Web runs in parallel via universal components in `packages/ui` + shared API routes [planned], but the three retention wedges (background push scheduling, home-screen widgets, Duolingo-style pattern-time notifications) are native-only [verified — web Push API doesn't support background scheduling or widgets]. Phase B ships Кръг native-first.

### 11.7 Oracle context cost — BgGPT primary, frontier fallback, cache + hardcap
**Decided:** AI stack already locked in `Celestia_AI_Reference.md §5` — BgGPT API (INSAIT, Bulgarian-native, EU-resident) as primary, Claude Sonnet or GPT-4o as fallback behind Vercel AI SDK. Wired from day one so switching is an env variable.

Specifically for the Oracle FAB:
- **Cache aggressively.** Pre-computed chart explanations (Sun in Leo, Moon in Cancer, Asc in Virgo, etc.) are shared across users. ~100 combinations × base placements fits in Supabase with 30-day TTL. First user pays the generation cost; subsequent users hit cache.
- **Pre-generate daily horoscopes.** Per reference doc: one per (sun-sign × moon-phase) × day = <100 unique combinations per day. Generate via Vercel Cron at midnight Sofia time. Днес hero reading is a *lookup*, not a per-user LLM call. Massive cost saver.
- **Free-tier hardcap.** 3 Oracle queries/month for free users. Clear UX when hit: "Изчерпа свободните си разговори с Оракула. Премиум?" Premium = unlimited but still rate-limited (20/day) to prevent abuse.
- **Unit economics check:** €9.99/mo Premium must cost <€3 in AI per user per month. Track monthly. Reference doc §5 codifies this.

### 11.8 Bulgarian TTS for meditations / audio — deferred, not canceled
**Decided:** Not MVP. Reconsider after authority-figure partnerships land (§7). Voiced forecasts by Мира Кунева or Николай Дойнов becomes a genuine differentiator later; text-only for now.

---

## 12. Addendum — three critical specs that can't wait

### 12.1 Onboarding flow — first 60 seconds

The people-graph wedge only works if new users are primed to add relationships before they bounce. Every delay between install and first-relationship-added drops conversion.

**Recommended sequence:**

1. **Sign-up** (Clerk, existing) — 10 sec
2. **Birth data — only essentials** — name, date, time ("не знам точно" allowed), place (city search from existing CitySearch component). 20 sec. Don't ask for anything optional here.
3. **Chart reveal as theater** — animated fill of the natal wheel with sound (if permitted). First paid-feeling moment. 5 sec.
4. **One-line personal verdict** — "Слънце в Лъв, Луна в Рак, Асцендент Дева. Ти си човек, който свети навън и усеща навътре." This is the sign-quip voice applied to full Big Three. 5 sec read.
5. **Relationship prompt — THIS IS THE WEDGE** — "Кой друг ти е важен?" Three visual cards: `Партньор` / `Приятел` / `Crush`. Tapping any one opens the add-person flow directly. "Пропусни" is available but de-emphasized (grey, small, bottom). 15 sec.
6. **Dashboard** — Днес renders with whatever they added (or empty bento card if skipped).

Total: ~60 sec to dashboard, with one relationship already in the Кръг for ~70%+ of users (realistic target based on conversion funnels in similar apps). This single flow decision determines whether Celestia is a solo-app or a people-graph app at day-1 retention.

### 12.2 Кръг empty state — the highest-leverage screen in the app

If a new user skipped the onboarding relationship prompt (§12.1) and later taps `Кръг`, what they see here determines whether they ever come back.

**Don't do:**
- Generic "+ Add person" button with empty space
- Marketing copy about "discover compatibility"
- Feature list or tutorial

**Do:**
- **Single emotional prompt** at the top: "Кого мислиш в момента?"
- **Three visual cards below** — same as onboarding §12.1 step 5:
  - `Партньор` — violet gradient, ♂♀ composite glyph
  - `Приятел` — amber hairline frame, paired star glyph
  - `Crush` — soft rose tint, single-arrow glyph
- Each card is ~40% of screen width, tappable area large. Each opens the add-person flow with that relationship type pre-selected.
- Below the three cards, one subtle line: "Или добави някой, когото искаш да разбереш по-добре." Links to generic-add flow.
- **No pricing shown here.** The paywall is downstream, after they've entered the person and seen the teaser reading. Premium pitch before any free value = bounced user.

### 12.3 Notification taxonomy — what, when, to whom

§11.6 flagged push as the mobile wedge. Here are the specific notification types to build:

| Type | Who gets it | Timing | Tone |
|---|---|---|---|
| **Daily horoscope** | All users | User's own pattern-time (23.5hr after last session, per Duolingo data) | Editorial, 1-line teaser → tap to read |
| **Lunar phase change** | All users, opt-out | New moon + full moon only (not all 8 phases — too noisy) | Ritual, short. "Новолуние в Телец. Ден за намерения." |
| **Exact transit** | Premium only | When a major transit is exact to user's natal (0° orb) | "Венера пресича Слънцето ти. Почувствай го." |
| **Кръг member event** | Premium only | Linked-chart member's solar return, major progressed aspect | "Емма влиза в новата си година. Прочети какво означава за двама ви." |
| **Streak risk** | All users, opt-out | 20 hours since last session if streak ≥ 3 days | Soft, not guilt. "Твоята линия е на 12 дни. Една минута днес?" |
| **Weekly digest** | All users, opt-out | Sunday evening (per Chani's weekly reading pattern) | "Седмицата напред: Меркурий ретрограден в последната си фаза." |
| **Oracle follow-up** | Premium only | 24-48hr after user asked Oracle about a specific topic | "Питаше за Плутон в Къща 8 вчера. Ново прозрение." |

**Rules:**
- Max 2 notifications per day per user (hard cap). Astrology notifications are easy to hate.
- All types opt-outable individually from settings — granular, not a single toggle.
- Bulgarian-first copy. No auto-translation; every notification type has hand-written templates per lunar phase / aspect / event.
- Premium-gated notifications (exact transit, Кръг event, Oracle follow-up) are themselves a retention lever — churning means losing the notifications you trained to trust.

---

## 13. Integration notes — cross-reference with `Celestia_AI_Reference.md`

The reference doc covers architecture, GDPR, AI strategy, and webhooks. This UX doc covers IA and layout. They're complementary. Four insights from the reference doc change how Phase A/B should be executed — they aren't just infra concerns, they shape the product.

### 13.1 Днес hero is a cached lookup, not a live LLM call

Reference doc §3.1: daily horoscopes are pre-generated once per (sun-sign × moon-phase) combination per day — **<100 unique combinations**. Cached in Supabase, served from the cache, generated via Vercel Cron at midnight Sofia time.

**What this changes for UX:**
- **Днес loads instantly.** No loading spinner on hero reading. Treat it as known-at-render-time.
- **No "generating your horoscope" state.** Bad pattern in competitor apps (Nebula shows one). Skip it.
- **Opens the door to prefetch.** Today's horoscope for the whole user's Кръг can be prefetched in one batch at cron time — no N+1 problem surfacing "today in your circle."
- **Personalization is local composition.** The hero reading is sun-sign × moon-phase generic; the *sign quip* and *name* are user-specific. Compose at render, don't LLM-call.

Means the hero reading copy is more "editorial column" than "personal letter." Correct tone for the Celestia voice anyway.

### 13.2 BgGPT primary = the Bulgarian voice is actually Bulgarian

Reference doc §5: BgGPT (INSAIT) is primary, not fallback. This is a quality + residency decision that has tone implications.

**What this changes for UX:**
- **The editorial voice won't drift.** Frontier models hallucinate Russian-flavored phrasing, wrong gendered forms, awkward formality — especially bad in astrology copy where register matters. BgGPT is native.
- **But: Oracle FAB responses must be eval'd in Bulgarian.** Per reference doc §5, run 20 real prompts through BgGPT + Claude + GPT-4o with native speakers before picking. Oracle quality hinges on this.
- **Fallback is a real failure mode, not a config option.** When BgGPT goes down and Claude takes over, tone *will* shift. Design a "оракулът е днес по-малко в своята стихия" disclaimer or silent-degrade gracefully — don't let users see Russian-tinged Bulgarian without context.
- **Premium unit economics.** Reference doc §5: €9.99/user/month must cost <€3 in AI. BgGPT pricing isn't public yet (verify before commit). If BgGPT is more expensive than frontier models, cache harder.

### 13.3 Кръг ghost profiles have GDPR implications the design must handle

Reference doc §4 is explicit: birth data is borderline Article 9 (philosophical/belief practice). When a user adds Emma as a ghost profile, Emma's birth data is now in the database **without Emma's consent**. This is a real issue.

**What this changes for UX:**
- **Privacy policy must disclose ghost profiles.** Standard consent language isn't enough. "When you add a person to your Кръг, their birth data is stored for the purpose of astrological comparison. You are responsible for having a valid reason to process their data."
- **Ghost profile UX must frame it correctly.** When adding Emma, the confirmation step should say something like: "Ти си отговорен да обясниш на Емма, че използваш данните ѝ." Not a checkbox, a sentence. Transfers responsibility where it legally sits.
- **Ghost-to-real merge must re-consent.** When Emma later signs up and the merge prompt fires (§11.5), Emma must explicitly consent to having her ghost data merged — "Константин запази твоя рожден ден в приложението. Да запазим ли и да свържем ли картите?" Not auto-merge.
- **Right-to-deletion cascades through ghost profiles.** If Emma contacts Celestia asking to be deleted (yes, Emma who isn't even a user can do this under GDPR), the deletion must reach every user's Кръг who has her as a ghost. Reference doc §4 checklist item on right-to-deletion applies here.
- **This is premium-only for a reason.** Ghost profile creation should arguably be gated behind premium — serious GDPR exposure shouldn't live in the free tier where abuse risk is higher. Revisit in §4 premium wedge strategy.

### 13.4 Webhook reliability determines Кръг's viral quality

Reference doc §6 gives a battle-tested webhook pattern (signature verification, raw body, idempotency, log-then-process). The connection to UX:

**If a paid user's RevenueCat webhook fails silently, they don't get Premium → they can't add a second person to Кръг → they don't share → viral loop breaks.**

Every failed webhook is a lost viral node, not just a support ticket. This raises webhook reliability from "engineering hygiene" to "growth metric."

**What this changes for UX:**
- **Premium activation needs a visible signal inside Кръг.** "Добре дошъл в Премиум" banner that persists for 24hr after first payment, within the Кръг tab specifically. Tells the user "you can now do the relational reading you just paid for" at the exact surface where they'll act.
- **Failed payment / failed webhook UX must be designed.** If Stripe charges and RevenueCat webhook fails, the user should see "Плащането успя, но достъпът ти се подготвя. Ако не се отключи до 5 мин, пиши ни." — not a silent lock.
- **Support CTA inside Кръг settings.** Not generic help — "Плащането ми не се регистрира" as a dedicated surface with one-click email that includes user ID + last transaction.

### 13.5 Phase A additions from the reference doc

These aren't UX but they gate Phase A completion per reference doc §7 launch readiness:
- Supavisor connection pooling (transaction mode) on Supabase — or Drizzle queries will exhaust Postgres connections under load
- Vercel region pin to `fra1` in `vercel.json`
- Supabase project in `eu-central-1` — reminder: **can't be changed after creation**, verify now
- Sentry wired on web and Expo
- Feature-flag kill switches for every AI feature (Днес hero, Oracle, notifications) — if costs spike, turn it off without redeploying
- Bulgarian Privacy Policy + Terms of Service live before any paying user

These are part of Phase A's definition-of-done alongside the IA work.

---

## 14. What I recommend reading next

- `Celestia_AI_Reference.md` — architecture, GDPR, AI provider, webhook patterns. Directly shapes Phase A/B per §13 above.
- `COMPETITOR_ANALYSIS.md` and `COMPETITOR_FIELD_GUIDE.md` — existing strategic research that pairs with this doc
- `PITFALLS.md` — know the failure modes before Phase B
- Fabien Cartal's Co-Star redesign case study (external) — shortest version of the same IA reasoning applied to the competitor we're borrowing most from

---

## Appendix A — sources

**Astrology competitors:**
- Co-Star: [Apptunix guide](https://www.apptunix.com/blog/how-to-develop-an-astrology-app-like-co-star/), [Medium — astro-nerds dominated design](https://medium.com/@jpinkos/co-star-astrology-how-astro-nerds-dominated-design-e04f705e96dc), [Fabien Cartal redesign](https://www.fabiencartal.com/work/new-portfolio-co-star)
- Chani: [App tour](https://chaninicholas.zendesk.com/hc/en-us/articles/8711720295187-A-Tour-of-the-CHANI-App), [Official app page](https://www.chani.com/app)
- Nebula: [Lunar Guide review 2026](https://www.lunarguideapp.com/blog/nebula-astrology-app-review-2026), [Yearly horoscope review](https://www.yearly-horoscope.org/articles/nebula-app-review/)
- Sanctuary: [Our app page](https://shop.sanctuaryworld.co/pages/our-app), [Wikipedia](https://en.wikipedia.org/wiki/Sanctuary_(app))

**Non-astrology patterns:**
- Apple Journal: [iOS 18 Journal guide](https://www.tomsguide.com/phones/iphones/ios-18-journal-whats-new-in-the-iphones-diary-app), [Wikipedia](https://en.wikipedia.org/wiki/Journal_(Apple))
- Duolingo: [Customer retention strategy](https://www.trypropel.ai/resources/duolingo-customer-retention-strategy), [Streak design flow](https://medium.com/@salamprem49/duolingo-streak-system-detailed-breakdown-design-flow-886f591c953f), [Widget feature](https://blog.duolingo.com/widget-feature/)
- Oura: [Oura Ring 4 review](https://wearablexp.com/smart-rings/oura-ring-4-review/), [Sleep Foundation review](https://www.sleepfoundation.org/best-sleep-trackers/oura-ring-review), [Readiness Score explainer](https://ouraring.com/blog/readiness-score/)
- Instagram Close Friends: [Inro guide 2026](https://www.inro.social/blog/what-are-instagram-close-friends-how-instagram-close-friends-list-work)
- Strava: [Trophy engagement writeup](https://trophy.so/blog/how-strava-uses-segmented-leaderboards-to-drive-engagement)
- Spotify bento: [Landdding guide 2026](https://landdding.com/blog/blog-bento-grid-design-guide)
- Calm/Headspace: [LyncMe 2026 review](https://www.lync.me/learning/799/mental-health-apps-review-2026-headspace-calm)

**Bulgarian market:**
- [Bg-Astrology](https://bg-astrology.net/)
- [AstroPro.bg](https://astropro.blog.bg/)
- [Мира Кунева](https://www.mira-kuneva.com/)
- [АстроИмпулс (Божидар Ръсовски)](https://www.astroimpulse.com/)

**Market data:**
- [Statista — horoscope & astrology apps](https://www.statista.com/topics/12325/horoscope-and-astrology-apps/)
- [Market Growth Reports — horoscope apps market](https://www.marketgrowthreports.com/market-reports/horoscope-and-astrology-apps-market-118691)
- [Auraе 2026 AI horoscope apps ranking](https://www.auraeastrology.com/blog/top-10-ai-horoscope-apps-2026-ranked-and-reviewed)
