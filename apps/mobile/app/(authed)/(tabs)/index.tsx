import type { ReactNode } from 'react'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useUser } from '@clerk/expo'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, ClipPath, Defs, G, RadialGradient, Stop } from 'react-native-svg'
import { getLunarPhase } from '@stellaeum/core/moon-phase'
import { composeWelcome, getSunSign } from '@stellaeum/core/welcome'
import { parseSentinels } from '@stellaeum/core/oracle/planet-parser'
import { PLANETS_BG, PLANET_GLYPHS } from '@stellaeum/astrology/client'
import type { Planet } from '@stellaeum/astrology/client'

import { NavRow } from '@/components/design-system/NavRow'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font, rhythm, type } from '@/components/design-system/tokens'
import { EmptyState, ErrorState, LoadingState } from '@/components/design-system/States'
import { useApiClient } from '@/lib/api/client'
import { getDisplayName } from '@/lib/clerk/displayName'
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

export default function DnesScreen() {
  const { push } = useGuardedNavigation()
  const { apiFetch } = useApiClient()
  const { user } = useUser()
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

  const { todayFormatted, lunarPhase, hourSnapshot } = useMemo(() => {
    const now = new Date()
    return {
      todayFormatted: BG_DATE_FORMAT.format(now),
      lunarPhase: getLunarPhase(now),
      hourSnapshot: now.getHours(),
    }
  }, [])

  const sunSign = chart?.birth_date ? getSunSign(chart.birth_date) : null
  const welcome = useMemo(
    () => composeWelcome({ firstName, sunSign, lunarPhase, meteorShower: null, hour: hourSnapshot }),
    [firstName, sunSign, lunarPhase, hourSnapshot],
  )

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
    <ScreenShell>
      <Text style={{ ...type.caption, color: color.faint }}>{todayFormatted}</Text>
      <Text style={{ ...type.body, fontSize: 15, color: color.muted, marginTop: rhythm.micro, marginBottom: rhythm.group }}>
        {welcome.greeting}
      </Text>

      {/* HERO — the glyph carries the size contrast (150px vs. the 12px
          caption above, ~12.5x), not the text label. The label is
          validated at 32px against the longest real lunar-phase name
          ("Изгряващ полумесец" / "Залязващ полумесец", 19 chars) — see
          tokens.ts for the measured widths behind this number. v2 shipped
          this at 40px and it would have wrapped; this doesn't.
          Glyph→name uses `tight` (12px), not `micro` — the glyph is large
          enough that a 4px gap would read as a layout mistake rather than
          "these belong together." Name→sub stays `micro`: a caption
          directly explaining the name above it is a tighter unit than
          glyph→name. No marginBottom here — the section below supplies
          the `group` gap, so the boundary is stated once, not twice. */}
      <View style={{ alignItems: 'center' }}>
        <MoonGlyph illumination={lunarPhase.illumination} isWaxing={lunarPhase.isWaxing} />
        <Text style={{ ...type.hero, color: color.text, marginTop: rhythm.tight, textAlign: 'center' }}>
          {lunarPhase.name}
        </Text>
        <Text style={{ ...type.sub, color: color.muted, marginTop: rhythm.micro }}>
          {lunarPhase.illumination}% осветена · до {lunarPhase.nextMajor.name.toLowerCase()}: {lunarPhase.nextMajor.daysAway}д
        </Text>
      </View>

      {chart && (
        <View style={{ marginTop: rhythm.group }}>
          {horoscope.isLoading && <LoadingState status="консултира звездите…" />}
          {horoscope.isError && !horoscope.data?.content && (
            <ErrorState message="Звездите мълчат - опитай отново след миг." />
          )}
          {!horoscope.isLoading && !horoscope.data?.content && !horoscope.isError && (
            <ReadingParagraphs text={welcome.summary} />
          )}
          {horoscope.data?.content && <HoroscopeBody content={horoscope.data.content} />}

          {/* THE single exit from this screen's content (gap 1). Same
              `group` gap as every other section boundary on this screen —
              a consistent large-tier gap, not another ad hoc value. */}
          <View style={{ marginTop: rhythm.group, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)' }}>
            <NavRow label="Питай Оракула" onPress={() => push('/oracle')} tone="accent" />
          </View>
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

      {/* Secondary nav — one plain row, same NavRow chevron mechanism as
          everything else, no separate card chrome competing with it. */}
      <View style={{ marginTop: rhythm.group, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)' }}>
        <NavRow label="Кръг" hint="добави партньор, приятел или crush" onPress={() => push('/circle')} />
      </View>
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
//   - payoff (last paragraph): WEIGHT steps up to Medium — no bold cut
//     of EB Garamond is subsetted, deliberately, since faux-bold via OS
//     synthesis is worse than no bold — and sits a full `group` gap
//     below, not `paragraph`, so the gap itself signals "new beat," not
//     just the text.
// A single-paragraph reading (opener with no development, or a payoff
// with nothing before it) skips both treatments — there's no second beat
// to contrast against, so italicizing or weighting the only paragraph on
// screen would be decoration, not structure.
function lastIndex<T>(arr: T[]): number {
  return arr.length - 1
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
function ReadingParagraphs({ text }: { text: string }) {
  const sentences = useMemo(() => {
    const all = text.split(/(?<=[.!?])\s+/).filter(Boolean)
    return all.length > 1 ? all.slice(1) : all
  }, [text])
  const last = lastIndex(sentences)
  return (
    <ReadingFrame>
      {sentences.map((s, i) => (
        <Text key={i} style={{ ...type.body, ...beatStyle(i, last), color: '#dde3ee' }}>
          {s}
        </Text>
      ))}
    </ReadingFrame>
  )
}

const RING_SIZE = 92
const BLOOM_SIZE = 150
const PULSE_MS = 2400
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Two-circle mask technique: a light disk and a dark disk of the same
// radius, the dark one offset horizontally by `dx`, both clipped to the
// moon's circular silhouette so the outline never changes — only the
// terminator curve does. `isWaxing` flips which side the light grows from.
//
// BUG FIX: `dx` used to be set linearly (`2R * illuminationFraction`), on
// the assumption that offsetting two circles by a fraction of their max
// separation reveals that same fraction of area. It doesn't — the
// intersection area of two equal circles is a highly non-linear function
// of their center distance (front-loaded: two circles overlap by nearly
// their full area until the offset gets close to the fully-separated
// 2R). Verified numerically: at 22% illumination the linear version
// rendered ~28% visible light, and the gap widens toward mid-phase (50%
// illumination rendered as ~61% light, 70% as ~81%) — an increasingly
// "too full" moon exactly where a first-quarter/last-quarter reading
// would need a real half-moon. `darkAreaFraction` is the closed-form lens
// (circular segment) area for two equal circles offset by `d`;
// `solveOffsetForIllumination` inverts it via bisection so the RENDERED
// light area, not the offset distance, is linear in illumination — the
// property the UI actually promises ("22% осветена" should show 22%
// visible light). Bisection runs once per illumination/size change inside
// useMemo, not per frame.
function darkAreaFraction(d: number, r: number): number {
  if (d <= 0) return 1
  if (d >= 2 * r) return 0
  const term = 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d)
  return term / (Math.PI * r * r)
}

function solveOffsetForIllumination(fraction: number, r: number): number {
  let lo = 0
  let hi = 2 * r
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const light = 1 - darkAreaFraction(mid, r)
    if (light < fraction) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// Real curved terminator, not a straight-edged fill bar (the previous
// version — a rect clipped to a percentage width inside a circle — reads
// as a battery/progress indicator, not a moon; caught in advisor review
// before this reached the founder). This is an approximation (a real
// terminator is an ellipse arc, not a circle arc) but is the standard
// technique used by most moon-phase icon sets and reads unambiguously as
// a moon — the fidelity gap that mattered was the calibration bug above,
// not circle-vs-ellipse.
function MoonGlyph({ illumination, isWaxing }: { illumination: number; isWaxing: boolean }) {
  const glow = useSharedValue(0.5)

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    )
    return () => cancelAnimation(glow)
  }, [glow])

  const glowProps = useAnimatedProps(() => ({ opacity: glow.value }))
  const fraction = Math.max(0.03, Math.min(0.97, illumination / 100))
  const cx = RING_SIZE / 2
  const cy = RING_SIZE / 2
  const r = RING_SIZE / 2 - 1
  const offset = useMemo(() => solveOffsetForIllumination(fraction, r), [fraction, r])
  // Direction, checked against this app's own copy, not assumed: the dark
  // disk is drawn on TOP of the light disk, offset by `dx`, so the
  // uncovered (visibly light) sliver ends up on the side OPPOSITE the dark
  // disk's shift — shifting the dark disk right leaves light on the left,
  // and vice versa. packages/core/src/lib/moon-phase.ts's own
  // `physicalAppearance` text says waxing crescent lights up "от дясната
  // страна" (from the right) and waning crescent "от лявата страна" (from
  // the left). To land the light crescent on the right for waxing, the
  // dark disk must shift LEFT — i.e. `isWaxing` needs a negative dx, the
  // opposite of what this previously read.
  const dx = (isWaxing ? -1 : 1) * offset

  return (
    <View style={{ width: BLOOM_SIZE, height: BLOOM_SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={BLOOM_SIZE} height={BLOOM_SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="moon-glow" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor="rgb(226,232,240)" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="rgb(226,232,240)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <AnimatedCircle
          cx={BLOOM_SIZE / 2}
          cy={BLOOM_SIZE / 2}
          r={BLOOM_SIZE / 2}
          fill="url(#moon-glow)"
          animatedProps={glowProps}
        />
      </Svg>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Defs>
          <ClipPath id="moon-disk-clip">
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>
        <G clipPath="url(#moon-disk-clip)">
          <Circle cx={cx} cy={cy} r={r} fill="rgba(139,92,246,0.06)" />
          <Circle cx={cx} cy={cy} r={r} fill="rgba(226,232,240,0.92)" />
          <Circle cx={cx + dx} cy={cy} r={r} fill="#08060f" />
        </G>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(226,232,240,0.25)" strokeWidth={1} />
      </Svg>
    </View>
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

function HoroscopeBody({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = useMemo(
    () => content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean).map((p) => parseSentinels(p)),
    [content],
  )
  const last = lastIndex(paragraphs)
  const isOutlier = content.length > EXPAND_THRESHOLD_CHARS && last > 1
  const collapsed = isOutlier && !expanded
  let devIndex = -1

  return (
    <ReadingFrame>
      {paragraphs.map((chunks, i) => {
        const role = i === 0 ? 'opener' : i === last && last > 0 ? 'payoff' : 'development'
        if (role === 'development') devIndex += 1
        if (collapsed && role === 'development') return null
        const anchor = role === 'development' ? firstPlanetOf(chunks) : null
        const hairline = role === 'development' && devIndex > 0

        return (
          <Fragment key={i}>
            {collapsed && role === 'payoff' && (
              <Pressable
                onPress={() => setExpanded(true)}
                accessibilityRole="button"
                style={{ marginTop: rhythm.paragraph, marginBottom: rhythm.paragraph }}
              >
                <Text style={{ ...type.caption, color: color.amber }}>Прочети повече</Text>
              </Pressable>
            )}
            <View
              style={{
                marginTop: role === 'opener' ? 0 : role === 'payoff' ? rhythm.group : rhythm.paragraph,
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
                  fontFamily: role === 'opener' ? font.bodyItalic : role === 'payoff' ? font.bodyMedium : font.body,
                  color: '#dde3ee',
                }}
              >
                {chunks.map((chunk, j) =>
                  chunk.planet ? (
                    // Always Medium, never italic — including inside the
                    // italic opener paragraph, where an italic amber word
                    // would read as emphasis-on-emphasis and fight the
                    // opener's own register shift instead of standing out.
                    <Text key={j} style={{ color: '#fcd34d', fontFamily: font.bodyMedium }}>
                      {chunk.text}
                    </Text>
                  ) : (
                    chunk.text
                  ),
                )}
              </Text>
            </View>
          </Fragment>
        )
      })}
    </ReadingFrame>
  )
}
