---
title: Oracle pre-reading questions & support screen — design spec
status: DESIGN COMPLETE — approved 2026-09-05. Parked pending the mobile/web merges and the paywall; not scheduled for build yet. See §12 for what's open (implementation only, no remaining design decisions).
created: 2026-09-05
---

# Oracle pre-reading questions & support screen

This spec was reconstructed from two prior-session reports after the source
conversation was cleared before anything was written to disk. Everything in
here reflects decisions those reports record — one reconciliation was
necessary where the two reports described what looked like two different
shapes for Q2 (see "Reconciliation note" below); that call was flagged and
has since been implicitly accepted (no correction came back on it).

All design decisions in this document are now **approved**. Nothing is
gated on further sign-off. §12 lists what's still open — all of it is
*implementation* work (build it), not *design* work (decide it).

---

## 0. The feature

Before generating an Oracle reading, the user answers **two** multiple-choice
questions. Answers are appended to the prompt as context so the reading
adapts to circumstance. With consent, answers persist so future readings
adapt further over time.

**Multiple choice only. No free text, anywhere.** This is a deliberate,
registered decision (see §10, ORACLE-INPUT-STRUCTURED), not an oversight —
free text would require prompt-injection defence, Bulgarian crisis-language
detection, validator rework, and a fresh legal review. Do not add a text
field without reopening that decision explicitly.

**There is no crisis option, anywhere, in any topic.** Putting "I don't want
to be here" in front of a user as a tappable button is a suggestion, not a
detection mechanism — it can upset someone who is fine and it will not be
tapped by someone who genuinely isn't. Every topic's lowest tier describes
an ordinary hard stretch, not a disclosure.

---

## 1. Reconciliation note (read this first)

The lost session produced two reports. The first proposed **two static
questions per topic**: Q1 (mood) and Q2 (topic-scoped circumstance, stem
"Кое е най-точно за теб точно сега?", four topic-specific options). The
second report — written later, after testing the idea against the real
generation pipeline — proposed replacing the static Q2 with a **chart-derived,
house-keyed question**, and explicitly recommended staying at two questions
total rather than adding a third: *"keep it at 2 questions total — one
static mood/state question..., one chart-derived question... Don't add a 3rd
or 4th."*

Both reports call the second question "Q2," which reads as if they're the
same design evolving — not two features stacking. I've treated the
chart-derived question as the final, canonical Q2, and the earlier
topic-scoped circumstance options (§A's GENERAL/LOVE/CAREER Q2 lists) as
superseded draft material, folded in only as the source for each topic's
**fallback default house** (§4.3) rather than as user-facing option text.

**If your intent was additive** — three questions, or Q2 staying
topic-scoped text with the house-keyed set feeding the *reading* rather than
a *question* — say so and this section gets rewritten. Everything below
assumes the two-questions-total, chart-derived-Q2 reading is correct,
because it's the one that was actually tested against live output (§6).

---

## 2. Q1 — static, per topic, locked copy

Confirmed corrections applied: "любовен живот" not "сърдечно състояние"
(the latter reads as cardiac, not romantic); clitic word order fixed
("Какво **ти** тежи" — second-position rule, not post-verb); gender pairs
spelled out in full everywhere, no compact "/а" (fleeting-vowel adjectives
like "доволен"/"несигурен" don't compact evenly — a mixed convention reads
as an error more than a full pair does). A Bulgarian tester may still
override any line here; nothing below is asserted as unimprovable.

### GENERAL
**"Как се чувстваш в живота си точно сега?"**
- В относително равновесие съм
- Несигурен/несигурна съм накъде вървя
- Търся яснота за следващата си стъпка
- Трудно ми е в момента

### LOVE
**"Как е любовният ти живот точно сега?"**
- Щастлив/щастлива съм в стабилна връзка
- Сам/сама съм, отворен/отворена съм за нови срещи
- Във връзка съм, но минаваме през труден период
- Трудно ми е в момента

### CAREER
**"Как е професионалното ти състояние точно сега?"**
- Доволен/доволна съм от посоката си
- Търся промяна или нова възможност
- Под сериозен натиск съм — прегаряне, несигурност
- Трудно ми е в момента

### HEALTH
Stem proposed fresh (none existed before). Deliberately asks about the body
in mood terms, not clinical terms — "как е здравето ти" invites a literal
health answer, which is exactly the Art. 9 exposure the redesign closes out.

**"Как се чувстваш в тялото си точно сега?"**
- Чувствам се добре и в баланс с тялото си
- Донякъде съм разсеян/разсеяна за грижата за себе си
- Търся начин да се погрижа по-добре за себе си
- Не се чувствам на себе си напоследък

Note: Health's floor option is deliberately *not* "Трудно ми е в момента"
(unlike the other three topics) — it's the specific §E-approved rewording,
because "не се чувствам на себе си" is what makes this option a mood rather
than a diagnosis. The earlier draft here read "здравословен проблем — мой
или на близък — тежи върху мен," which is a direct disclosure of a health
condition (the user's own, or — a separate problem — a third party's who
never consented to anything). That option is gone, not softened.

---

## 3. Q2 — chart-derived, house-keyed

### 3.1 Mechanism

`buildTransitOverview` (`packages/core/src/horoscope/transit-analysis.ts`)
already computes, per active transit: `transitPlanet`, `natalPlanet`,
`aspect`, `orb`, `applying`, `speedBand` (`'fast' | 'slow'`), and `house`
(via the private `getHouseForLongitude`). This is the same computation the
daily horoscope already runs — no new astronomy needed for the house-keying
itself.

**Missing piece: transit-to-angle.** `calculateActiveTransitDetails` (same
file, line ~177) only compares transiting planets against `natalPlanets`.
It never checks a transiting planet against the Ascendant or Midheaven.
Those exist already: `ChartData.ascendant` and `ChartData.mc` are
`PointData` (`{ longitude, sign, degree }`), cached in the
`chart_calculations` table alongside `planet_positions` and `house_cusps`
(`packages/core/src/charts/calculate.ts` lines 56-61, 80-85) — so every
caller that has a chart already has these values, no extra query.

Correction to the earlier report: the field is `ascendant.longitude` /
`mc.longitude` (absolute ecliptic longitude, 0-360), not `.degree`
(`.degree` is degree-within-sign, 0-30 — the wrong number for an orb
comparison).

### 3.2 Spec: the transit-to-angle addition

In `transit-analysis.ts`:

1. Extend `NatalCalculationData` with two optional fields:
   ```ts
   interface NatalCalculationData {
     planet_positions: PlanetPosition[]
     house_cusps?: HouseData[]
     birth_time_known?: boolean
     ascendant?: PointData   // new
     mc?: PointData          // new
   }
   ```
2. Add `calculateAngleTransits(transitPlanets, ascendant, mc)`, reusing the
   existing `TRANSIT_ASPECT_DEFINITIONS` orb table and `shortestAngle`
   helper — same pattern as `calculateActiveTransitDetails`, just two extra
   comparison targets instead of iterating `natalPlanets`. Angle transits
   only need the conjunction case (planet crossing the angle) — squares/
   oppositions to angles exist astrologically but aren't part of this
   feature's salience model; don't add them speculatively.
3. Don't widen the `Planet` union to include `'ascendant' | 'mc'` — that
   type is used everywhere and doesn't need angle-awareness leaking into
   it. Instead add a small dedicated shape:
   ```ts
   interface AngleTransitDetail {
     id: string
     transitPlanet: Planet
     angle: 'ascendant' | 'mc'
     orb: number
     applying: boolean
     speedBand: 'fast' | 'slow'
   }
   ```
4. Add `angleTransits: AngleTransitDetail[]` to `TransitOverview`, populated
   in `buildTransitOverview` alongside `activeTransits`. Threading
   `ascendant`/`mc` into the two call sites
   (`packages/core/src/horoscope/transits.ts:99`,
   `apps/web/app/api/horoscope/generate/route.ts:218`) is a one-line change
   at each — `calculation` already carries both columns from the DB row.

### 3.3 Salience — picking the one question for this month

Combine `activeTransits` and `angleTransits` into one candidate list and
rank by:
1. Category: angle conjunction > outer-planet aspect > inner-planet aspect
2. Within a category: tightest orb wins

Take the top candidate. If its category is an angle conjunction, use the
ASC or MC template (§3.5). Otherwise use its `house`, looked up against the
house-keyed template table.

**No monthly rotation config is needed.** Transits genuinely change month
to month — that's the entire premise of a daily horoscope — so the
chart-derived question varies on its own as a side effect of using real
data, not something to build separately.

### 3.4 Fallback floor

Three-tier fallback, in order:

1. **Strong transit this month** → use it (§3.3).
2. **No strong transit** (a quiet month — nothing clears the salience bar)
   → fall back to the house-theme of the user's most recent *non-stable*
   Q2 answer (i.e., whichever house-keyed question they last answered with
   something other than the top tier).
3. **Never varied** (every past Q2 answer was the top tier, or this is the
   user's first reading) → fall back to the current topic's home-house
   default, authored once per topic:
   - GENERAL → house 1 (self-direction)
   - LOVE → house 5 (the only house whose theme literally says "любовта")
   - CAREER → house 10 (career/ambition — exact match)
   - HEALTH → house 6 ("грижата за тялото" — exact match)

This never leaves the branch undefined: Q2 has no "nothing to report"
option, so there's always something to fall back to, even from a maximally
"fine" user.

### 3.5 The ~26 templates

Each house gets two registers — a **fast** stem ("recently," for
inner-planet transits: sun/moon/mercury/venus/mars) and a **slow** stem
("for a while now," for outer-planet transits: jupiter/saturn/uranus/
neptune/pluto/northNode) — plus two angle-conjunction specials. 12×2+2 = 26.

**Hard constraint (see §5): no stem below may name a planet, a natal point,
or an aspect type.** Every stem names the life domain only, in plain human
language, derived from (but not copy-pasted from) `houseTheme()`'s
narrative phrasing.

Shared answer scale — generic across all 26 stems, same four-tier shape as
Q1, but scoped to "this area" rather than "your life":
- Тук се чувствам стабилно
- Има известна несигурност, но се справям
- Точно тук търся повече яснота
- Трудно ми е точно в тази област

| House | Domain (from `houseTheme`) | Fast stem ("напоследък") | Slow stem ("от известно време") |
|---|---|---|---|
| 1 | себеусещане и лична посока | Как е при теб със себеусещането и посоката ти напоследък? | От известно време, как е при теб със себеусещането и посоката ти? |
| 2 | финанси и усещане за стабилност | Как е при теб с финансите и усещането ти за стабилност напоследък? | От известно време, как е при теб с финансите и усещането ти за стабилност? |
| 3 | комуникация и ежедневие | Как е при теб с общуването и ежедневието ти напоследък? | От известно време, как е при теб с общуването и ежедневието ти? |
| 4 | дом и семейство | Как е при теб с дома и семейството ти напоследък? | От известно време, как е при теб с дома и семейството ти? |
| 5 | любов и творческо изразяване | Как е при теб с любовта и творческото ти изразяване напоследък? | От известно време, как е при теб с любовта и творческото ти изразяване? |
| 6 | работен ритъм и грижа за тялото | Как е при теб с работния ти ритъм и грижата за тялото напоследък? | От известно време, как е при теб с работния ти ритъм и грижата за тялото? |
| 7 | близки партньорства | Как е при теб с близките ти партньорства напоследък? | От известно време, как е при теб с близките ти партньорства? |
| 8 | дълбоки връзки и споделени ресурси | Как е при теб с по-дълбоките ти връзки и споделените отговорности напоследък? | От известно време, как е при теб с по-дълбоките ти връзки и споделените отговорности? |
| 9 | смисъл и по-широка перспектива | Как е при теб с усещането за смисъл и посока в по-широк план напоследък? | От известно време, как е при теб с усещането за смисъл и посока в по-широк план? |
| 10 | кариера и посока на амбицията | Как е при теб с кариерата и посоката на амбицията ти напоследък? | От известно време, как е при теб с кариерата и посоката на амбицията ти? |
| 11 | приятелства и общност | Как е при теб с приятелствата и общността ти напоследък? | От известно време, как е при теб с приятелствата и общността ти? |
| 12 | вътрешен свят и почивка | Как е при теб с почивката и вътрешния ти свят напоследък? | От известно време, как е при теб с почивката и вътрешния ти свят? |

**Angle conjunctions:**
- **ASC** — "Усещаш ли, че напоследък влизаш в нов период — сякаш нещо в теб самия/самата се пренарежда?"
- **MC** — "Как е при теб с посоката на пътя ти и с това как те виждат другите точно сега?"

(ASC uses "себе си/самия/самата" gender-paired the same way as Q1; MC
doesn't need gendering.)

These read mechanically similar to each other by design — a fixed template
with the domain phrase substituted — which is a deliberate content-
authoring tradeoff (26 short, structurally consistent stems are easy to
review, extend, and copy-lock; 26 hand-varied sentences are not). A
Bulgarian tester should feel free to vary the phrasing per row as long as
the "no astrology vocabulary" constraint (§5) and the "напоследък"/"от
известно време" register distinction survive the edit.

---

## 4. Ask-then-reveal — hard constraint, not a preference

**No question template — Q1, Q2, or any future one — may name a transiting
planet, a natal planet, or an aspect type.** The question names the life
domain only, in plain human language. The reading, generated *after* the
answer, is the only place the astrological mechanism gets named, and it
does so in light of what the person just said.

**Why this is a rule, not a style choice:** the risk isn't redundancy in
the abstract, it's a specific failure mode — the app appears to already
know the answer before asking ("Saturn is pressing on your relationships,
how are things?" followed by a reading that says the same thing back).
That reads as the app performing insight it doesn't actually have.
Ask-then-reveal is what makes the reveal land as a reveal: the person
answers honestly about their real circumstance, and only then does the
reading explain *why* astrology was asking — which is what makes the
mechanism-naming in the reading feel earned instead of repeated.

This is exactly the kind of rule a future editor optimizes away without
knowing why. Someone tightening the copy later might reasonably think
"why not just say it's Saturn in the question, it's more informative" —
and that one change quietly breaks the entire reason the question and the
reading can coexist without duplicating each other. Anyone editing
`houseTheme()`-adjacent question copy should read this section first.

---

## 5. Contradiction handling — standing system-prompt addition

Tested against the real pipeline with a mismatched answer set (love_stable
+ "considering a big change"). Without an explicit instruction, the model
picks one signal and ignores the tension. With one added
("Ако отговорите на потребителя си противоречат... не пренебрегвай
противоречието... назови деликатно самото напрежение..."), it opens with an
explicit concessive ("Макар да...") and surfaces a different, contradiction-
relevant chart aspect (Mars-Uranus, "sudden impulse... shakes your inner
calm") instead of the vague turning-point language it defaulted to before.

Add this as a **standing** addition to the system prompt — not conditional
on detecting a mismatch. It costs nothing on consistent answer sets and
only changes behavior when it's actually needed.

Known limitation, not yet solved: in the same test round, a second
mismatched case picked up one signal ("stoя на житейски праг") without
engaging the contradiction against "happy in a stable relationship" it was
paired with. Two of three tested variants showed clear, substantive
adaptation; the third shows the instruction helps but doesn't guarantee
contradiction-awareness every time. Worth knowing before calling this
solved.

---

## 6. Does this change the output? (tested)

Same Sofia fixture chart run through the real `generateFinalText` pipeline
under three answer contexts (stable / struggling / mismatched), with the
§5 addendum active. Full outputs are in the session report this spec was
reconstructed from (not reproduced here to keep this document about
decisions, not transcripts) — headline finding: the struggling case pulled
in a different chart aspect (Jupiter-Pluto, framed as transformation of
"материалната и личната ти стабилност") than the stable case, and the
closing-guidance paragraph in each addressed a genuinely different concern
("посоката се размива" vs. "тревогата за сигурността"). This is real
adaptation, not decorative variation — confirmed by inspecting output, not
asserted from the design alone.

---

## 7. Consent

Persisting answers *is* the feature (adaptation over time) — so consent is
first-class, not bolted on.

- **Just-in-time**: prompted after the user answers for the first time,
  before generation runs. Not at signup, not buried in ToS.
  - a single unticked choice — never pre-checked, no nudged copy. A
    consent obtained through a nudged interface is not freely given.
- **Declining proceeds immediately to generation.** The answers still
  shape *this* reading; only the memory (persistence for future readings)
  is skipped. Declining must not read as a punishment or a degraded path.
- A **settings toggle** mirrors the same choice, withdrawable anytime.
- A separate **"delete stored answers"** action clears only that table —
  no 30-day grace period. There's no fraud/abuse rationale for delaying a
  request to delete this specific data, unlike account deletion.
- Wire into the existing `/api/gdpr/export/route.ts` (so stored answers
  show up in a user's export) and the
  `apps/web/app/api/cron/cleanup-deleted-accounts/route.ts` cascade (so
  account deletion removes them too).
- **Retention**: rolling window, 3-6 months, scheduled hard-delete
  following the same cron pattern already used for account cleanup.

**New UI primitive needed**: neither `apps/web` nor `apps/mobile` has a
Switch/Toggle component today (checked — none exists under
`packages/ui`, `apps/mobile/components`, or `apps/web/components`). The
settings toggle above is the first thing that needs one.

---

## 8. Support screen — approved design

The design changed shape during review: not a single ambient line under
the reading, but a **dedicated support screen**, reached via a quiet
one-liner on the Oracle surface. The screen carries the resource list; the
Oracle surface carries only the entry point.

### 8.1 Sourcing — ThroughLine, not our own research

The resource list is sourced from ThroughLine's directory
(`findahelpline.com/countries/bg`), not the org-by-org web research done in
an earlier pass of this design. Reasoning: ThroughLine verifies every entry
by *direct contact with helpline staff* and maintains the data *daily* —
better and more current sourcing than we can sustain doing this ourselves,
and mixing our own one-off-verified entries (e.g. Kabinet.bg, Столична РЗИ)
back in would undermine the consistency that's the entire point of
switching sourcing. Both of those were checked against ThroughLine's
published listing criteria (free, on-demand, anonymous & confidential) and
correctly excluded: Kabinet.bg's model is a booked, named-consultant
relationship (a therapy referral, not a helpline); Столична РЗИ is
Sofia-only with two narrow windows, and there's no way to tell whether its
absence from ThroughLine is disqualification or simply not-yet-catalogued.
Holding the line on ThroughLine as sole source of truth was the explicit
call made here, over including either on our own authority.

**Sourcing failure mode, worth recording for future re-verification**:
`findahelpline.com` blocks normal fetching (403 on direct fetch and on a
text-extraction proxy). A first attempt fell back to search-engine-summary
answers, which **produced a wrong answer** — Animus's entry was mislabelled
as LGBTQ+-scoped and separately as a children's line, both conflated from
*other* entries listed on the same directory page. The only thing that
caught this was pulling the page's embedded structured data
(`__NEXT_DATA__` JSON) directly and reading ThroughLine's actual per-entry
fields, cross-checked against each organisation's own site. **Any future
re-verification of this screen must read structured data or the operating
organisation's own site — never a search-engine summary of a directory
page.** A summary of a multi-entry listing page is exactly the shape of
input a summarizer conflates entries on, and there was no signal in the
wrong answer that made it look wrong.

### 8.2 The four entries, in order

| # | Entry | Number/channel | Hours | Cost | Scope label |
|---|---|---|---|---|---|
| 1 | 112 | phone | 24/7 | free | спешна помощ |
| 2 | Български червен кръст — психосоциална подкрепа | 0800 114 66 | 09:00–18:00 daily (**not** 24/7 — corrected from an earlier draft of this spec) | free | за всеки, за каквото и да ти тежи |
| 3 | Асоциация Анимус — Национална гореща линия | 0800 1 8676 | 24/7 | free | за хора, преживели насилие (explicit label — audience-open per ThroughLine, but topically violence-specific; unlabeled inclusion would mislead) |
| 4 | Single Step — чат | chat, singlestep.bg/get-help | live 20:00–23:00 daily; async message rest of day | free | за ЛГБТК+ младежи и техните близки (explicit label; the only non-phone channel in the whole set, included specifically because some people will not call) |

All four verified via ThroughLine's structured data (`verified: true`,
recent `last_verified_at`) and, for #2 and #3, cross-checked directly
against the operating organisation's own site
(`en.redcross.bg/news/view?nwid=24244`; `animusassociation.org`).

**Excluded — do not re-add any of these without addressing the reason
given:**
- **116 111, 124123** — children's lines, wrong audience for this screen.
- **Demetra (0700 40 150 / 0800 18 017)** — `verified: false` in
  ThroughLine's own data, no stated hours found anywhere.
- **Kabinet.bg** — books a named consultant for up to three sessions; a
  therapy referral, not a helpline, per ThroughLine's own listing criteria
  (free, on-demand, anonymous & confidential).
- **Столична РЗИ "Телефон на доверието"** — Sofia-only, two narrow daily
  windows, not catalogued by ThroughLine (and no way to tell whether
  that's disqualification or simply not-yet-catalogued).
- **116 123** — reserved on the regulator's own page, no evidence of an
  actual staffed operator.
- **02 492 30 30 (БЧК)** — never found on БЧК's own site; only
  third-party citations.

Rendering shape (unchanged from the earlier draft):
```ts
interface SupportResource {
  label: string        // "0800 114 66"
  org: string           // "Български червен кръст"
  scope: string          // "за всеки, за каквото и да ти тежи"
  hours: string           // "09:00–18:00, всеки ден"
  cost: string             // "безплатно"
  channel: 'phone' | 'chat'
  href: string               // tel: or https:
}
```

### 8.3 Screen copy

**Top of screen:**
> Тук са хората, с които наистина можеш да говориш.

**Bottom of screen (honest-infrastructure line, verbatim):**
> Не всички линии тук работят денонощно, а в България все още няма
> една-единствена, добре позната линия за възрастни, отворена по всяко
> време. Затова изброяваме няколко — за да имаш поне един работещ вариант,
> независимо кога ти потрябва.

### 8.4 Entry point — the Oracle one-liner

Placement unchanged from the original design: Oracle surface only, below
the reading, not app-wide. It links to the support screen; it carries no
number itself.

**Approved wording:**
> Понякога помага да поговориш с истински човек. Ето къде можеш.

(Two other variants were drafted and rejected on review: one that named
what the line was "for" too directly, and one whose "не си сам/сама в
това" framing edged toward naming the condition it was trying not to
name. This line was chosen for being the shortest, warmest, and least
self-justifying of the three.)

### 8.5 Maintenance obligation

This screen is a standing commitment, not a one-time write. A dead number
on a support screen is worse than no screen — someone reaches for it
exactly when they're least equipped to shrug off a disconnected line. See
§10 CRISIS-COPY-VERIFICATION for the recheck cadence and the sourcing rule
this session's failure mode (§8.1) now feeds into.

---

## 9. Article 9 / GDPR position

**With the crisis option removed from all four topics, and Health's Q1
floor reworded to a mood ("не се чувствам на себе си") rather than a
disclosure, none of the four topics' Q1 options solicit health or other
special-category data.** GENERAL/LOVE/CAREER's remaining options (stable /
uncertain / seeking / "трудно ми е в момента") read as ordinary mood and
circumstance signals, closer to a satisfaction-survey scale than a health
disclosure.

**The Health-Q2-caregiving question is moot, not resolved by omission.**
The earlier report flagged a second, adjacent risk: whether Health's Q2
should retain an option about caring for a sick relative (arguably
third-party health data). Under the reconciled architecture (§1), Q2 is no
longer topic-authored text — it's the chart-derived, house-keyed question
in §3, and none of the 26 templates in that table reference illness,
caregiving, or a third party's health in any form (house 4 is
family/home in general; house 6 is the user's *own* routine and body
care). The risk doesn't resurface because the redesign removed the surface
it would have appeared on, not because it was separately mitigated. Worth
recording that distinction rather than letting it read as "handled" when
it's closer to "no longer applicable."

**Recommendation, not a unilateral close**: this spec's design, if shipped
as written, appears to close the ORACLE-QA-ART9 concern for all four
topics. I have *not* flipped that register row to RESOLVED — a GDPR
Art. 9 exposure call is a founder/lawyer call, not a design-spec call, and
this is a compliance-tagged branch. See §10 for the proposed register text.

---

## 10. Register updates — applied

All applied to `.planning/PLACEHOLDERS.md` as of 2026-09-05.

**ORACLE-INPUT-STRUCTURED** (RESOLVED) — Oracle pre-reading answers are
enum-only by design, permanently, not as a v1 shortcut. Free text is a
separate feature requiring prompt-injection defence, Bulgarian
crisis-language detection, validator rework, and legal review. Do not add
a text field without reopening this decision explicitly.

**CRISIS-COPY-VERIFICATION** (RESOLVED, rule rewritten 2026-09-05) —
**the rule is now email-first, not phone-first.** Bulgarian helplines are
small and largely volunteer-run; a verification call takes a live slot
from someone who actually needs one, for a confirmation that doesn't need
a live human on the other end. Verify by email or web contact form before
shipping; call only if there's no reply *and* the entry is critical enough
that shipping unconfirmed is worse than the cost of a call.

Founder is emailing all three non-112 operators directly to confirm hours
and scope in writing: БЧК (info@redcross.bg), Animus, Single Step. If no
reply within two weeks, ship on ThroughLine's own verification — they
confirmed each of these three by direct contact with helpline staff, more
recently than our own research: BRC 2025-11-06, Animus 2026-05-25, Single
Step 2026-01-14. 112 needs no separate verification.

**Recheck cadence**: every 6 months, by email, checked against
ThroughLine's `last_verified_at` and the organisation's own site.

**Sourcing lesson, folded into the recheck rule**: `findahelpline.com`
blocks direct fetching, and a first attempt at reading it via
search-engine summaries produced a wrong answer (Animus mislabelled as
LGBTQ+-scoped and as a children's line, both conflated from other entries
on the same directory page) — caught only by reading the page's embedded
structured data directly. Any future re-verification of this screen's
contents must read structured data or the organisation's own site, never
a search-engine summary of a directory listing.

**THROUGHLINE-INTEGRATION** (new, OPEN, post-launch) — ThroughLine's
API/widget covers 1,500+ verified services across 170+ countries,
maintained daily. Meaningfully better than this spec's static
four-entry list once there's a user base to justify the integration cost.
Not now — the static, hand-verified screen in §8 is the right scope for
launch.

**ORACLE-QA-ART9** (update, still OPEN) — description updated to reflect
§9's design change (crisis option removed, Health Q1 reworded, Q2
redesigned away from any health-adjacent surface). Recommendation
attached: close once this spec's copy ships as written, pending
founder/lawyer confirmation that the redesign is sufficient — not closed
by this document alone.

---

## 11. Build estimate

Rough sizing in GSD phase/plan terms, not hours — this project's own
convention (see `.planning/STATE.md` velocity table) is plan-sized chunks,
not calendar estimates.

| Workstream | Scope | Size |
|---|---|---|
| DB | new table for stored answers (user_id, topic, question_id, answer_id, house/theme tag, created_at), consent flag + toggle state, migration | small |
| `packages/core` | `calculateAngleTransits`, `TransitOverview.angleTransits`, salience picker (§3.3), fallback-floor logic (§3.4), answer persistence + GDPR export/cleanup wiring | medium |
| Prompts | tension-instruction addition to system prompt (§5, standing), thread Q1/Q2 answers into existing prompt-building functions | small |
| API | new endpoint(s) to submit Q1/Q2 answers pre-generation; extend `/api/oracle/generate` to accept and use them; wire consent state | small–medium |
| UI (web + mobile) | two question screens per Oracle session, JIT consent modal, settings toggle (**new Switch/Toggle primitive required — doesn't exist yet**), Oracle entry-point one-liner, dedicated support screen (§8, 4 static entries + tap-to-call/tap-to-open) | medium |
| Copy/i18n | ~8 Q1 lines + 4 topics' options (16), 26 Q2 templates + 4 shared options, 2 angle stems, 1 entry-point line, support screen copy (top line, bottom line, 4 entries' labels) — all go through `check:bg-strings` / `check:copy-lock` / `check:bg-lint-baseline` | small (content), but touches all three copy gates — budget a review pass, not just a paste-in |
| Compliance | register updates (§10, already applied), email verification of 3 numbers before ship (founder task, not engineering — see §10 CRISIS-COPY-VERIFICATION), no lawyer-facing artifact needed unless ART9 needs a formal closure memo | small |

Overall: medium-sized feature, roughly comparable to a single GSD phase
with 3-5 plans (DB+core, prompts+API, UI×2, copy/compliance) — not a
multi-phase undertaking, but touching enough surfaces (DB, core, two API
routes, two frontends, three copy gates, one compliance register) that it
shouldn't be squeezed into one plan.

---

## 12. Final status — 2026-09-05

**Design is complete.** Every decision point raised across this spec's
construction has been resolved and approved: Q1 copy (§2), the Q2
architecture reconciliation (§1, chart-derived over topic-scoped, accepted
by default — no correction came back), the 26 house-keyed templates (§3.5),
ask-then-reveal as a hard constraint (§4), the standing contradiction
instruction (§5), consent (§7), the support screen's sourcing, entries,
and copy (§8), the Oracle entry-point line (§8.4), the Art. 9 position and
its recommendation (§9), and the register updates (§10, applied).

**Nothing here is a build blocker for lack of a decision.** What's open is
implementation only:
- The `calculateAngleTransits` addition and `TransitOverview.angleTransits`
  field (§3.2) — not written yet.
- The salience picker and fallback-floor logic (§3.3–3.4) — specified, not
  coded.
- The answers table, consent columns/toggle, and GDPR export/cleanup
  wiring (§7) — not built.
- The Switch/Toggle UI primitive (§7) — doesn't exist in either app yet.
- Two question screens, the support screen, and the entry-point line (§8)
  — not built.
- The standing tension-instruction addition to the Oracle system prompt
  (§5) — not applied to the live prompt.
- Email verification of the three non-112 numbers (§10 CRISIS-COPY-
  VERIFICATION — founder is emailing БЧК, Animus, and Single Step
  directly; ships on ThroughLine's own verification after a two-week
  no-reply window) — a founder task, not blocked on engineering, but
  blocks *shipping* the support screen regardless of when the code is
  written.

**Build estimate**: medium-sized feature, ~3-5 GSD-plan-sized chunks (§11)
— DB+core, prompts+API, UI×2 (questions + support screen), copy/compliance.
Nothing here requires a new phase of research or a new round of design
review; it requires a plan.

**Status**: parked. This feature is fully specified and not scheduled —
work resumes after the mobile/web merges and the paywall land.
