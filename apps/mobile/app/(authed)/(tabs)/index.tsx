import type { ReactNode } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Dimensions, Pressable, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUser } from '@clerk/expo'
import { getLunarPhase } from '@stellaeum/core/moon-phase'
import { composeWelcome, getActiveMeteorShower, getSunSign, meteorNote, SIGN_QUIPS } from '@stellaeum/core/welcome'
import { parseSentinels } from '@stellaeum/core/oracle/planet-parser'
import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import type { Planet } from '@stellaeum/astrology/client'

import { MoonHero } from '@/components/dashboard/MoonHero'
import { CtaPanel } from '@/components/design-system/CtaPanel'
import { LeadLine } from '@/components/design-system/LeadLine'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font, pressFeedback, rhythm, type } from '@/components/design-system/tokens'
import { EmptyState, ErrorState, LoadingState } from '@/components/design-system/States'
import { useApiClient } from '@/lib/api/client'
import { getDisplayName } from '@/lib/clerk/displayName'
import { formatDaysHours } from '@/lib/formatDaysHours'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

/**
 * Днес — MOBILE-ALPHA-REDESIGN v3, live since Round A cutover (2026-07-22).
 * v1/v2 chased distinctiveness; the founder's actual target is familiarity
 * (Co-Star: "feels used before"). See .planning/research/MOBILE_ALPHA_REDESIGN.md
 * §0 for the full brief, §14 for the cutover record.
 *
 * First half-second: date, greeting, one glyph (the moon) clearly larger
 * than everything around it. No reading required to know this is about
 * today and the sky right now — the Weather-app pattern.
 *
 * The reading is paced into short paragraphs (not a wall) and ends in
 * exactly one exit: "Питай Оракула" — chosen over an inline tappable
 * transit mention because the horoscope's colored planet mentions are
 * freeform AI prose with no reliable mapping to a structured transit
 * record to open (checked before committing to this, not assumed).
 *
 * No Today/Yesterday switcher — the old (pre-cutover) Днес had one; this
 * screen doesn't. That's a tracked decision, not an oversight: see
 * REVISIT 58. `useDailyHoroscope`'s `selectedDate`/`setSelectedDate`/
 * `yesterdayUnavailable` are currently unused by this screen.
 *
 * Requires an account with a birth chart — see the reachability-trap
 * note in (authed)/_layout.tsx.
 */

interface ChartSummary {
  id: string
  birth_date: string
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

// Section-provenance captions (item 3, 2026-07-27) — every distinct
// content source on this screen gets its own label, mirroring the web
// dashboard's per-block headings (DashboardContent.tsx's "Небесен ритъм",
// DailyHoroscope.tsx's "Дневен хороскоп"). Reuses the mono caption
// primitive already on this screen (the date row) rather than a second
// tracked-caps eyebrow — tokens.ts's R3 reservation covers ONE eyebrow
// use on Днес, already spent on the moon's phase name; mono is a
// different, unreserved primitive, so it spends no budget. Bronze, not
// faint grey (founder correction, 2026-07-27): this is the app speaking,
// same warm family as the invitation, not a neutral system label.
// Founder device-pass fix (2026-07-28): headings set to large caps —
// best-effort interpretation of a cut-off instruction ("each heading must
// be large caps and…"); flagging explicitly since the rest of that
// sentence never arrived. Revert/adjust if this wasn't the intent.
// Founder device-pass fix (2026-07-28, legibility): 9.5 → 12.
const SECTION_CAPTION_STYLE = {
  fontFamily: font.mono,
  fontSize: 12,
  letterSpacing: 0.29,
  color: color.bronzeText,
  textTransform: 'uppercase' as const,
} as const

export default function DnesScreen() {
  const { push } = useGuardedNavigation()
  const { apiFetch } = useApiClient()
  const { user } = useUser()
  const ctaRef = useRef<View>(null)
  const insets = useSafeAreaInsets()
  // Founder correction (2026-07-28, FOURTH pass on this element): pinning
  // is gone again — reported as "another layer added on top," a hard edge
  // above the phrase, and reading as boxed rather than floating. Back to
  // normal in-flow placement, same as the very first version. The glow
  // cutoff/hard-edge complaints were specific to the PINNED wrapper's
  // fade band and absolute positioning — an in-flow element has no
  // separate fade layer to go wrong, so this removes the mechanism that
  // was producing the artifact rather than tuning it again.
  //
  // New requirement this pass: the invite should "float and glow like a
  // star" and reveal itself as the user scrolls down to it, not just be
  // statically present. Implemented as a fade+rise driven by the invite's
  // own position (tracked via measureInWindow, which already reflects
  // live scroll position) relative to the visible viewport.
  //
  // Founder device-pass fix (2026-07-28, second pass): the reveal
  // condition only checked against raw `windowHeight`, so it fired as
  // soon as ANY part of the invite was on screen — including while its
  // bottom portion was still occluded by the tab bar. Fixed to check
  // against the tab bar's own top edge instead (same `56 + insets.bottom`
  // formula used everywhere else), and require the invite's BOTTOM edge
  // to have cleared it, not just the top.
  //
  // Founder device-pass fix (2026-07-28, third pass): this was a
  // fire-once effect (`hasRevealedRef`) — visible only the FIRST time it
  // crossed into view, staying visible forever after even if scrolled
  // back out of range. Changed to a continuous toggle: every scroll/
  // layout check compares current visibility against `isVisibleRef` and
  // animates toward whichever state is currently true, every time, not
  // just on first load.
  const isVisibleRef = useRef(false)
  const revealProgress = useSharedValue(0)
  const revealStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [{ translateY: (1 - revealProgress.value) * 20 }],
  }))
  const checkCtaReveal = useCallback(() => {
    ctaRef.current?.measureInWindow((_x, y, _width, height) => {
      const windowHeight = Dimensions.get('window').height
      const tabBarTop = windowHeight - (56 + insets.bottom)
      // Visible only once the invite's BOTTOM edge has cleared the tab
      // bar's top edge — never while still behind/under it.
      const shouldBeVisible = y > 0 && y + height <= tabBarTop
      if (shouldBeVisible === isVisibleRef.current) return
      isVisibleRef.current = shouldBeVisible
      revealProgress.value = withTiming(shouldBeVisible ? 1 : 0, { duration: 400 })
    })
  }, [revealProgress, insets.bottom])
  // Shared with (tabs)/you.tsx's account row — firstName+lastName, then
  // email username, then a generic placeholder. Several accounts predate
  // B.0g-2's required-name-fields signup change; an email username reads
  // warmer than a hardcoded placeholder for those. Note this can surface a
  // full name ("Николай Тонев"), not just a first name, when both fields
  // are set — see the greeting-size rebalance discussion in
  // MOBILE_ALPHA_REDESIGN.md for the type-scale implication.
  const firstName = getDisplayName(user, 'Потребител')

  const [chart, setChart] = useState<ChartSummary | null | undefined>(undefined)
  const horoscope = useDailyHoroscope(chart?.id)

  // Content addition (2026-07-28) — web's Небесен ритъм block is prose:
  // lunar phase, meteor shower, sky note; mobile previously showed only
  // the terse lunar data line and hardcoded `meteorShower: null`, never
  // computing an active shower at all. Fixed at the source: mobile now
  // calls the same `getActiveMeteorShower` web does.
  const { todayFormatted, lunarPhase, hourSnapshot, meteorShower } = useMemo(() => {
    const now = new Date()
    return {
      todayFormatted: BG_DATE_FORMAT.format(now),
      lunarPhase: getLunarPhase(now),
      hourSnapshot: now.getHours(),
      meteorShower: getActiveMeteorShower(now),
    }
  }, [])
  // `meteorNote` is the exact pure function DashboardContent.tsx's own
  // `summary` folds in — pulled verbatim (packages/core/src/welcome/
  // compose.ts, exported 2026-07-28 for this), not reassembled. Null on
  // most days (showers are seasonal/intermittent) — the block below only
  // renders when this is non-null, matching web's own behavior.
  const meteorText = meteorNote(meteorShower)

  const sunSign = chart?.birth_date ? getSunSign(chart.birth_date) : null
  const welcome = useMemo(
    () => composeWelcome({ firstName, sunSign, lunarPhase, meteorShower, hour: hourSnapshot }),
    [firstName, sunSign, lunarPhase, meteorShower, hourSnapshot],
  )
  // Founder device-pass fix (2026-07-28): the time-of-day phrase (Добро
  // утро / Добър ден / Добър вечер / Благословена нощ) should read bronze
  // and get attention first, the name stays muted — split on the same
  // first-comma boundary web's own greeting split uses
  // (DashboardContent.tsx: `welcome.greeting.split(',')[0]`), not a
  // reassembled string.
  const [greetingPhrase, ...greetingRest] = welcome.greeting.split(',')
  const greetingNamePart = greetingRest.join(',')
  // Sign block (2026-07-28) — didn't exist on mobile at all. `SIGN_QUIPS`
  // moved from web's DashboardContent.tsx into the shared package
  // (packages/core/src/welcome/sign-quips.ts) so this is the same copy,
  // not a re-typed duplicate — web now imports from there too.
  const signQuip = sunSign ? (SIGN_QUIPS[sunSign] ?? 'Звездите са в движение. Вселената е написала нещо за теб.') : null

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      apiFetch('/api/birth-data')
        .then((data) => {
          if (cancelled) return
          const first = Array.isArray(data) ? (data[0] as { id?: unknown; birth_date?: unknown }) : undefined
          if (first && typeof first.id === 'string' && typeof first.birth_date === 'string') {
            setChart({ id: first.id, birth_date: first.birth_date })
          } else {
            setChart(null)
          }
        })
        .catch(() => {
          if (!cancelled) setChart(null)
        })
      return () => {
        cancelled = true
      }
    }, [apiFetch]),
  )

  return (
    <ScreenShell temperature="warm" onScroll={checkCtaReveal}>
      {/* Founder device-pass fix (2026-07-27), two parts:
          1. Top clearance — mockup `.dnes-content{padding:44px 26px 0}`
             specifies 44px top padding for THIS screen; ScreenShell's
             shared `paddingTop` (space.xl = 20px) is the generic value
             every screen gets. The gap between them is what read as
             "clipped by the top edge" on device. Fixed with the mockup's
             own value (24px extra here = 44 total), matching the
             mockup's actual structure rather than inventing a pinned
             header — the mockup treats this as ordinary in-flow content,
             not persistent chrome (only the navbar gets that treatment,
             per the design-language notes in _source-v4.html). Kept
             in-flow, not pinned, for that reason.
          2. Size — bumped ~8% (within the founder's 5-10% band) for
             legibility at 390px: 9.5→10.5, 13→14. */}
      <Text style={{ fontFamily: font.mono, fontSize: 10.5, letterSpacing: 0.29, color: color.faint, marginTop: 24 }}>
        {todayFormatted}
      </Text>
      {/* marginBottom removed: MoonHero already supplies its own top gap
          (see below), so this stated it once rather than twice.
          Founder device-pass fix (2026-07-28, legibility): 14 → 17 → 19 —
          "so even grandmas can read it," bumped again this pass. Same
          reasoning applied to every italic secondary-text instance on
          this screen (moon subLabel, meteor note) — see their own call
          sites. Time-of-day phrase now bronze (color.bronzeText, the
          same token every other bronze text on the app uses — audited,
          no drift) so it reads first; the name stays muted. */}
      <Text style={{ fontFamily: font.bodyItalic, fontStyle: 'italic', fontSize: 19, color: color.muted, marginTop: 3 }}>
        <Text style={{ color: color.bronzeText }}>{greetingPhrase}</Text>
        {`,${greetingNamePart}`}
      </Text>

      {/* Founder device-pass fix (2026-07-27, vertical compression):
          greeting→caption was `rhythm.group` (40) — tightened to
          `rhythm.paragraph` (20), part of pulling the whole column up so
          more content sits above the fold. */}
      {/* Founder device-pass fix (2026-07-27, caption ownership): this
          caption used to sit directly above the MOON GLYPH, with its
          actual data (phase name, illumination, countdown) rendering
          ~700px below it, the glyph in between — the caption didn't
          visibly own the content it labels. MoonHero now renders its
          text data (phaseName eyebrow + subLabel) FIRST, immediately
          under this caption, with the glyph as the illustration below
          that pairing — mirrors "дневен хороскоп" immediately preceding
          reading TEXT, not a glyph. "Небесен ритъм" is web's own heading
          for this block (DashboardContent.tsx), not invented copy. */}
      <Text style={{ ...SECTION_CAPTION_STYLE, marginTop: rhythm.paragraph }}>небесен ритъм</Text>
      <MoonHero
        illumination={lunarPhase.illumination}
        isWaxing={lunarPhase.isWaxing}
        phaseName={lunarPhase.name}
        subLabel={`${lunarPhase.illumination}% осветена · до ${lunarPhase.nextMajor.name.toLowerCase()}: ${formatDaysHours(lunarPhase.nextMajor.daysAway)}`}
      />
      {/* Content addition (2026-07-28) — the rest of web's Небесен ритъм
          prose (meteorNote only; the lunar sentence is NOT ported here,
          it would duplicate the data line above). Only renders on days
          with an active shower, same as web — most days this is null. */}
      {meteorText && (
        <Text
          style={{
            fontFamily: 'EBGaramond-Italic',
            fontStyle: 'italic',
            fontSize: 16,
            color: color.muted,
            marginTop: rhythm.tight,
            textAlign: 'center',
          }}
        >
          {meteorText}
        </Text>
      )}

      {/* Content addition (2026-07-28) — sign block, didn't exist on
          mobile at all. Mirrors web's Layer B order exactly: greeting →
          Небесен ритъм → sign quip → daily stream. Sign name as its own
          caption in the same style as the other two, per instruction. */}
      {sunSign && signQuip && (
        <>
          <Text style={{ ...SECTION_CAPTION_STYLE, marginTop: rhythm.paragraph }}>{sunSign}</Text>
          <Text style={{ ...type.body, color: '#dde3ee', marginTop: rhythm.tight }}>{signQuip}</Text>
        </>
      )}

      {chart && (
        <View style={{ marginTop: rhythm.paragraph }}>
          {/* Source-provenance label (item 3, 2026-07-27) — see
              SECTION_CAPTION_STYLE's header comment. This block was the
              actual gap the founder flagged: nothing marked where the
              moon block ended and the reading began. "Дневен хороскоп"
              mirrors web's own heading for this exact content
              (DailyHoroscope.tsx), not invented copy. */}
          <Text style={SECTION_CAPTION_STYLE}>дневен хороскоп</Text>
          <View style={{ marginTop: rhythm.tight }}>
            {horoscope.isLoading && <LoadingState status="консултира звездите…" />}
            {horoscope.isError && !horoscope.data?.content && (
              <ErrorState message="Звездите мълчат - опитай отново след миг." />
            )}
            {!horoscope.isLoading && !horoscope.data?.content && !horoscope.isError && (
              <ReadingParagraphs text={welcome.summary} />
            )}
            {horoscope.data?.content && <HoroscopeBody content={horoscope.data.content} />}
          </View>

          {/* In-flow again (fourth pass on this element) — see the
              header comment above for why pinning was dropped. Fades and
              rises into place the first time it scrolls into view
              (revealStyle/checkCtaReveal), rather than being either
              statically pinned or just silently present when scrolled to. */}
          <Animated.View
            ref={ctaRef}
            // onLayout covers the short-reading case: if the invite is
            // already inside the viewport at mount, no scroll event will
            // ever fire to trigger checkCtaReveal otherwise, and it would
            // stay at opacity 0 forever.
            onLayout={checkCtaReveal}
            style={[{ marginTop: rhythm.group }, revealStyle]}
          >
            <CtaPanel label="Питай Оракула" onPress={() => push('/oracle')} />
          </Animated.View>
        </View>
      )}

      {chart === null && (
        <View style={{ marginTop: rhythm.group }}>
          <EmptyState
            body="Картата ти още не е настроена. Въведи рождените си данни, за да видиш хороскопа, наталната карта и транзитите."
            ctaLabel="Въведи рождени данни"
            onPressCta={() => push('/wizard/date')}
          />
        </View>
      )}
    </ScreenShell>
  )
}

// The one anchoring device for reading content (Step 5, gap 4 — "unanchored
// text"): a thin left rule, the dominant real-world convention for framing
// editorial prose on mobile (researched: Substack's blockquote treatment,
// general editorial-typography convention — rules + whitespace, not boxes,
// in serif reading contexts). Used consistently everywhere a reading
// appears; nothing else in this screen gets a frame, so it stays a
// deliberate, singular signal ("this is the article") rather than default
// chrome repeated on every block.
function ReadingFrame({ children }: { children: ReactNode }) {
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: 'rgba(139,92,246,0.35)', paddingLeft: 16 }}>
      {children}
    </View>
  )
}

// Both real horoscope content and this composeWelcome fallback share the
// same editorial structure the AI prompt itself specifies
// (apps/web/lib/horoscope/prompts.ts) — three beats, not two: an
// atmospheric opener, one or more developing paragraphs, then a payoff.
// The first pass here only gave type a way to express the payoff
// (weight-up on the last paragraph); the opener still rendered identically
// to the developing paragraphs in between, so the structure only
// half-showed. Now all three beats read distinctly, each via ONE lever,
// not stacked ornament:
//   - opener (first paragraph): ITALIC, same weight/size/color as body.
//     Marks it as the atmospheric beat — a register shift, not a
//     hierarchy jump — matching how compose.ts's own PHASE_OPENERS read
//     (a short image-sentence before the elaboration starts).
//   - development (middle paragraphs): plain body, unchanged.
//   - payoff (last paragraph): Stage 2 (2026-07-27) corrected against the
//     ratified mockup's `.payoff-block` — a FAMILY shift to Playfair
//     Display Regular with its own small bronze glow, not a weight step
//     within EB Garamond. Sits a full `group` gap below, not `paragraph`,
//     so the gap itself signals "new beat," not just the text.
// A single-paragraph reading (opener with no development, or a payoff
// with nothing before it) skips both treatments — there's no second beat
// to contrast against, so italicizing or weighting the only paragraph on
// screen would be decoration, not structure.
function lastIndex<T>(arr: T[]): number {
  return arr.length - 1
}

// mockup `.payoff-block`: font-family serif-d-r (Playfair Regular), color
// starlight, plus a small bronze glow (`.payoff-glow`: 80×60 ellipse,
// offset left:-16 top:-8, .14 opacity). Device-pass fix (2026-07-27):
// textShadow alone read too weak against a real screenshot — see
// CtaPanel.tsx's matching fix — replaced with a real glow blob behind the
// text, offset up-left the same way the mockup's own glow div is, not
// centered like the invite's (this payoff sits left-aligned in a reading
// block, not standalone centered content).
const PAYOFF_TEXT_STYLE = { fontFamily: font.displayRegular, color: color.starlight } as const

// Pure glow wrapper — `children` supplies its own fully-styled <Text> (this
// call site's plain-string payoffs and HoroscopeBody's mixed-chunk payoffs
// need different inline structures), so this only adds the glow blob, not
// a second nested Text with its own competing style.
function PayoffGlow({ children }: { children: ReactNode }) {
  return (
    <View style={{ position: 'relative' }}>
      <Svg width={80} height={60} style={{ position: 'absolute', left: -16, top: -8 }} pointerEvents="none">
        <Defs>
          <RadialGradient id="payoff-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color.bronze} stopOpacity={0.14} />
            <Stop offset="100%" stopColor={color.bronze} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#payoff-glow)" />
      </Svg>
      {children}
    </View>
  )
}

function beatStyle(index: number, last: number): { fontFamily: string; marginTop: number } {
  if (last === 0) return { fontFamily: font.body, marginTop: 0 }
  if (index === 0) return { fontFamily: font.bodyItalic, marginTop: 0 }
  if (index === last) return { fontFamily: font.bodyMedium, marginTop: rhythm.group }
  return { fontFamily: font.body, marginTop: rhythm.paragraph }
}

// Rhythm break for the composeWelcome summary (used only when the real
// daily-horoscope content hasn't loaded/isn't available) — splits on
// sentence boundaries so even a short summary reads as short paragraphs,
// not one dense block. Every PHASE_OPENERS entry in compose.ts opens by
// restating the phase name as its own sentence (e.g. "Залязващ
// полумесец. Време за почивка…") — which the hero above already shows,
// so that first sentence is dropped here to avoid showing the same
// phase name twice on one screen (caught in advisor review).
// Phase 0 foundation — this fallback path (real horoscope content still
// uses HoroscopeBody/ReadingFrame below, untouched; retrofitting its
// sentinel-anchored beats onto LeadLine is separate, larger work, not
// done here) demonstrates the shared LeadLine primitive: the bronze spine
// is bounded to everything but the payoff, which renders entirely outside
// it — the Днес spine/text overlap bug (BUILD_VERIFICATION_GUARDS.md
// guard 1) is structurally impossible here, not just visually avoided.
// Exported so the Stage 2 preview harness (app/_stage2-preview.tsx) can
// render the REAL reading component with a real worst-case string,
// instead of duplicating this logic or leaving the reading block empty —
// the founder's collision-safety concern can't be checked without it.
export function ReadingParagraphs({ text }: { text: string }) {
  const sentences = useMemo(() => {
    const all = text.split(/(?<=[.!?])\s+/).filter(Boolean)
    return all.length > 1 ? all.slice(1) : all
  }, [text])
  const last = lastIndex(sentences)

  // Single-sentence reading: no second beat to lead into, so the spine
  // would be decoration, not structure — same "skip both treatments"
  // rule the original ReadingFrame version followed.
  if (last === 0) {
    return (
      <ReadingFrame>
        <Text style={{ ...type.body, color: '#dde3ee' }}>{sentences[0]}</Text>
      </ReadingFrame>
    )
  }

  const led = sentences.slice(0, last)
  const payoffText = sentences[last]

  return (
    <LeadLine
      payoff={
        <PayoffGlow>
          <Text style={{ ...type.body, ...PAYOFF_TEXT_STYLE }}>{payoffText}</Text>
        </PayoffGlow>
      }
    >
      {led.map((s, i) => (
        <Text key={i} style={{ ...type.body, ...beatStyle(i, last), color: '#dde3ee' }}>
          {s}
        </Text>
      ))}
    </LeadLine>
  )
}

type SentinelChunk = ReturnType<typeof parseSentinels>[number]

// The founder's diagnosis, checked against compose.ts/prompts.ts rather
// than assumed: the reading isn't actually one undifferentiated block —
// the AI prompt spec (apps/web/lib/horoscope/prompts.ts) asks for a small
// number of the most important active or building influences, one per
// paragraph, each wrapped with a [planet:KEY] sentinel
// (packages/core/src/oracle/planet-parser.ts). That's real per-segment
// metadata already flowing through `parseSentinels` — the first planet
// mentioned in a development paragraph names what that paragraph is
// ABOUT, the same way Big Three's glyph+eyebrow names what its row is
// about. This function surfaces it as an anchor instead of leaving it
// buried in running prose.
function firstPlanetOf(chunks: SentinelChunk[]): Planet | null {
  const found = chunks.find((c) => c.planet)
  return (found?.planet as Planet | undefined) ?? null
}

// Segmentation, not decoration: Карта's Big Three works because each row
// is a bounded unit with a fixed anchor (glyph, eyebrow, degree) — three
// units, scannable in seconds. Днес's reading previously rendered its
// paragraphs as one continuous flow with nothing to land on past the
// italic opener. The fix mirrors Big Three's actual mechanism, not just
// its look: opener (atmospheric, no anchor — it isn't about one
// influence) → development paragraphs, each anchored by the planet it's
// actually about, with a hairline above every one but the first (exactly
// Big Three's `hairline={idx > 0}`) → payoff (weight-up, no anchor — it's
// the takeaway, not another influence, so it stays visually distinct from
// the influence segments rather than reading as one more of them).
//
// MOBILE-ALPHA-REDESIGN v3, Step 2 (reading length): the daily-horoscope
// prompt now targets 400-550 characters, 2 paragraphs (apps/web/lib/
// horoscope/prompts.ts) — a genuine "text from a friend" reading fits
// on-screen with no scroll needed. This threshold is a variance safety
// net, not a routine control: it sits well above the new target so it
// only fires on outliers (a model that ignores the length instruction,
// or a legacy reading generated under the old 4-6 paragraph prompt still
// cached for today). See REVISIT 57 (daily-reading length re-verification
// against production model).
const EXPAND_THRESHOLD_CHARS = 900

// Shared sentinel-chunk renderer — planet mentions always render Medium,
// never italic, including inside the italic opener paragraph, where an
// italic amber word would read as emphasis-on-emphasis and fight the
// opener's own register shift instead of standing out.
function renderSentinelChunks(chunks: SentinelChunk[]) {
  return chunks.map((chunk, j) =>
    chunk.planet ? (
      <Text key={j} style={{ color: '#fcd34d', fontFamily: font.bodyMedium }}>
        {chunk.text}
      </Text>
    ) : (
      chunk.text
    ),
  )
}

// Opener/development paragraph block — shared by both the single-paragraph
// (ReadingFrame) and multi-paragraph (LeadLine) HoroscopeBody paths. Payoff
// paragraphs are NOT rendered through this: they need PayoffGlow + the
// dedicated Playfair/starlight treatment, handled at the call site.
function HoroscopeParagraph({
  chunks,
  role,
  anchor,
  hairline,
}: {
  chunks: SentinelChunk[]
  role: 'opener' | 'development'
  anchor?: Planet | null
  hairline?: boolean
}) {
  return (
    <View
      style={{
        marginTop: role === 'opener' ? 0 : rhythm.paragraph,
        borderTopWidth: hairline ? 1 : 0,
        borderTopColor: 'rgba(148,163,184,0.08)',
        paddingTop: hairline ? rhythm.tight : 0,
      }}
    >
      {anchor && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: rhythm.micro }}>
          <Text style={{ fontFamily: font.cinzel, fontSize: 14, color: color.amber }}>{PLANET_GLYPHS[anchor]}</Text>
          <Text style={{ ...type.caption, color: color.muted }}>{PLANETS_BG[anchor]}</Text>
        </View>
      )}
      <Text
        style={{
          ...type.body,
          ...(role === 'opener' ? { fontFamily: font.bodyItalic, color: '#dde3ee' } : { fontFamily: font.body, color: '#dde3ee' }),
        }}
      >
        {renderSentinelChunks(chunks)}
      </Text>
    </View>
  )
}

// Stage 2 retrofit (2026-07-27): this is the path that renders the REAL,
// live AI content — what a user sees on nearly every session, unlike
// ReadingParagraphs' composeWelcome fallback (only shown pre-horoscope-load
// or on error). It was left on the pre-LeadLine ReadingFrame (violet,
// uniform indent, payoff never breaking free) when LeadLine was extracted
// as a Phase 0 foundation — flagged at the time as deferred, larger work
// (see ReadingParagraphs' comment above). That gap meant the redesign's
// core signalling (bronze spine bounded to lead+dev, payoff breaking free
// unindented in starlight with its own glow) was never actually live on
// the screen users see. Retrofitted onto LeadLine here — same primitive,
// same rule ReadingParagraphs already follows.
function HoroscopeBody({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = useMemo(
    () => content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => parseSentinels(p)),
    [content],
  )
  const last = lastIndex(paragraphs)
  const isOutlier = content.length > EXPAND_THRESHOLD_CHARS && last > 1
  const collapsed = isOutlier && !expanded

  // Single-paragraph reading: no development-to-payoff arc, so the bronze
  // spine would be decoration, not structure — same rule ReadingParagraphs'
  // own last===0 case follows (and the same ReadingFrame it reuses for it).
  if (last === 0) {
    return (
      <ReadingFrame>
        <HoroscopeParagraph chunks={paragraphs[0]} role="opener" />
      </ReadingFrame>
    )
  }

  let devIndex = -1

  return (
    <LeadLine
      payoff={
        <PayoffGlow>
          <Text style={{ ...type.body, ...PAYOFF_TEXT_STYLE }}>{renderSentinelChunks(paragraphs[last])}</Text>
        </PayoffGlow>
      }
    >
      {paragraphs.slice(0, last).map((chunks, i) => {
        const role = i === 0 ? 'opener' : 'development'
        if (role === 'development') devIndex += 1
        if (collapsed && role === 'development') return null
        const anchor = role === 'development' ? firstPlanetOf(chunks) : null
        const hairline = role === 'development' && devIndex > 0

        return <HoroscopeParagraph key={i} chunks={chunks} role={role} anchor={anchor} hairline={hairline} />
      })}
      {collapsed && (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          style={({ pressed }) => ({ ...pressFeedback(pressed), marginTop: rhythm.paragraph })}
        >
          <Text style={{ ...type.caption, color: color.amber }}>Прочети повече</Text>
        </Pressable>
      )}
    </LeadLine>
  )
}
