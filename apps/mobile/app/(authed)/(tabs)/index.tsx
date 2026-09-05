import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, { Easing, useAnimatedStyle } from 'react-native-reanimated'
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
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
import { useBreathe } from '@/components/design-system/motion'
import { ScreenShell } from '@/components/design-system/ScreenShell'
import { color, font, pressFeedback, rhythm, type } from '@/components/design-system/tokens'
import { EmptyState, ErrorState, LoadingState } from '@/components/design-system/States'
import { useApiClient } from '@/lib/api/client'
import { getDisplayName } from '@/lib/clerk/displayName'
import { formatDaysHours } from '@/lib/formatDaysHours'
import { hapticSelect } from '@/lib/haptics'
import { renderSentinelChunks, type SentinelChunk } from '@/lib/oracle/renderSentinelChunks'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'
import { AI_GENERATED_DISCLOSURE_BG } from '@/lib/legal/compliance-copy'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const TAB_BAR_BASE_HEIGHT = 56

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
// DailyHoroscope.tsx's "Дневен хороскоп"). Bronze, not faint grey (founder
// correction, 2026-07-27): this is the app speaking, same warm family as
// the invitation, not a neutral system label.
// Founder device-pass fix (2026-07-28): headings set to large caps —
// best-effort interpretation of a cut-off instruction ("each heading must
// be large caps and…"); flagging explicitly since the rest of that
// sentence never arrived. Revert/adjust if this wasn't the intent.
// Founder device-pass fix (2026-07-28, legibility): 9.5 → 12.
// Founder device-pass fix (this batch, font choice): these read "too
// rigid" on device — font.mono resolves to Menlo/system-monospace, a
// technical/code typeface with none of the warmth the rest of this
// atmospheric screen carries. Switched to font.displayRegular (Playfair
// Display), the SAME typeface type.eyebrow already uses for the moon's
// tracked-caps phase name — reuses an existing warm tracked-caps
// primitive already proven on this screen, not a new font introduced for
// this one spot.
const SECTION_CAPTION_STYLE = {
  fontFamily: font.displayRegular,
  fontSize: 12,
  letterSpacing: 0.29,
  color: color.bronzeText,
  textTransform: 'uppercase' as const,
} as const

// Section-boundary divider (this batch) — reported the three subsections
// (дневен хороскоп/sign/небесен ритъм) as "mixing with each other" despite
// scrolling as one continuous column. Same hairline technique
// HoroscopeParagraph already uses between its own development paragraphs
// (a barely-there rule, not a border/card), reused here at the SCREEN
// level to mark where one subsection ends and the next begins — subtle
// enough to keep the "flows continuously" feel, present enough to give
// each block its own understandable start/end.
// Founder device-pass fix (this batch, second pass): a full-width
// borderTop (stretched to the screen's own content width) read as too
// assertive a line for how subtle it's meant to be — reported "something
// half the length would work better." Rebuilt as its own centered,
// half-width rule instead of a border modifier on the section's full
// wrapping View.
function SectionDivider() {
  return (
    <View
      style={{
        height: 1,
        width: '50%',
        alignSelf: 'center',
        backgroundColor: 'rgba(148,163,184,0.08)',
        marginTop: rhythm.paragraph,
        marginBottom: rhythm.paragraph,
      }}
    />
  )
}

// IA reorder + hierarchy (this batch): дневен хороскоп is now the reason
// someone opens the app, moved above небесен ритъм (context). First pass
// also bumped the CAPTION itself (12→16) to signal primacy — founder
// device-pass correction: a bigger bronze tracked-caps mono label read as
// loud/harsh, snagging the eye in a way nothing else on this atmospheric
// screen does — the wrong lever. Caption reverts to the shared
// SECTION_CAPTION_STYLE size; primacy is carried by BODY size + being the
// first block instead, which is categorical (position + a real reading-
// size jump) without making a UI label shout.
const HOROSCOPE_CAPTION_STYLE = SECTION_CAPTION_STYLE
// Founder device-pass fix (this batch, art choice): the reading's actual
// text color was a hardcoded '#dde3ee' (body/opener/development) and
// color.starlight (payoff) — neither is a token this screen otherwise
// uses, and starlight is explicitly the COOL-surface role per the app's
// own rule ("warm bronze where the app speaks to the user; cool starlight
// where the sky is being read"). The horoscope reading is the app
// speaking, not the sky being read, so every reading-text color below is
// now color.text (body) or color.bronzeText (payoff, planet-mention
// highlights) — the same warm palette the rest of Днес already uses.
const HOROSCOPE_BODY_STYLE = {
  fontSize: 20,
  lineHeight: 31,
} as const

export default function DnesScreen() {
  const { push } = useGuardedNavigation()
  const { apiFetch } = useApiClient()
  const { user } = useUser()
  const insets = useSafeAreaInsets()
  // «Повече детайли» ember (this batch) — user feedback: it didn't read
  // as tappable at all next to CtaPanel's own invitations. Breathing dot,
  // same primitive CtaPanel/Pedestal/BackButton already use — pressed
  // state tracked via onPressIn/onPressOut on a STATIC style object, not
  // Pressable's function-style `style` prop, per the standing "function-
  // style silently drops layout props on some platforms" note documented
  // on CtaPanel.tsx/Pedestal.tsx.
  const detailLinkBreathe = useBreathe(2600, [0.5, 1])
  const [detailLinkPressed, setDetailLinkPressed] = useState(false)
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
  // live scroll position) relative to the visible viewport. Extracted into
  // `useScrollReveal` so небесен ритъм's own fragments (the caption, the
  // moon, the meteor note) can each reveal independently the same way.
  //
  // Founder correction, round 7 (this batch) — небесен ритъм must wait
  // for дневен хороскоп to be ready WITHOUT repeating round 3's mistake.
  // Round 3 gated the whole block behind a JSX condition
  // (`{chart && !horoscope.isLoading && (...)}`), which conditionally
  // MOUNTED it — delaying the moon's first onLayout past the point where
  // measureInWindow reliably returns a settled position, so it got stuck
  // permanently invisible with no automatic retry. Fixed this round as a
  // pure opacity GATE instead of a mount condition (see `horoscopeReady`
  // and the reveal styles below, defined after `chart`/`horoscope` exist):
  // the block stays unconditionally mounted, exactly like the last
  // known-working version, so its onLayout/measureInWindow pipeline is
  // completely untouched — the gate is multiplied INTO the existing
  // reveal styles, not a replacement for them.
  const ctaReveal = useScrollReveal(TAB_BAR_BASE_HEIGHT, insets.bottom)
  const moonReveal = useScrollReveal(TAB_BAR_BASE_HEIGHT, insets.bottom, {
    duration: 650,
    revealEasing: Easing.out(Easing.back(1.6)),
    hideEasing: Easing.in(Easing.cubic),
  })
  const meteorReveal = useScrollReveal(TAB_BAR_BASE_HEIGHT, insets.bottom)
  const checkAllReveals = useCallback(() => {
    ctaReveal.check()
    moonReveal.check()
    meteorReveal.check()
  }, [ctaReveal, moonReveal, meteorReveal])
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

  // небесен ритъм's readiness gate (round 7) — see the header comment
  // above `ctaReveal`. Plain JS boolean, not a shared value: read directly
  // inside each worklet below, Reanimated's babel plugin picks it up as a
  // captured dependency automatically (same as it already does for
  // `moonReveal.progress`), so these styles recompute whenever it flips.
  const horoscopeReady = !!chart && !horoscope.isLoading
  // Moon-specific animated style: scale+rotate overshoot ("landing into
  // place"), since it's the screen's one hero glyph and deserves its own
  // entrance, not the generic text fade+rise. Gated on `horoscopeReady`:
  // forced to 0 while horoscope is still loading, regardless of how far
  // the user has already scrolled — the moment it flips ready, this reads
  // whatever scroll progress was already computed (the block was mounted
  // and measuring the whole time), no re-scroll needed.
  const moonRevealStyle = useAnimatedStyle(() => {
    const p = Math.min(moonReveal.progress.value, 1) * (horoscopeReady ? 1 : 0)
    return {
      opacity: p,
      transform: [{ scale: 0.5 + 0.5 * p }, { rotate: `${(1 - p) * -14}deg` }],
    }
  })
  // The "небесен ритъм" caption fades in/out driven BY the moon's own
  // reveal progress, not its own separate scroll check — the two are
  // meant to appear together. Shape unchanged from the last known-working
  // version (opacity only) — only the gate is new.
  const rhythmHeadingRevealStyle = useAnimatedStyle(() => ({
    opacity: Math.min(moonReveal.progress.value, 1) * (horoscopeReady ? 1 : 0),
  }))
  // «Повече детайли» + its thread (this batch) — asked to animate/render
  // together with небесен ритъм rather than appear as a static, unrevealed
  // Pressable. Reads the SAME moon progress + gate as the caption above
  // (not its own independent scroll target), so all three — moon, caption,
  // this link — move in lockstep. Fade+rise, same shape the meteor note
  // and every other text-fragment reveal in this system already uses.
  const detailLinkRevealStyle = useAnimatedStyle(() => {
    const p = Math.min(moonReveal.progress.value, 1) * (horoscopeReady ? 1 : 0)
    return { opacity: p, transform: [{ translateY: (1 - p) * 12 }] }
  })
  // Meteor note keeps its own independent scroll target (unchanged), just
  // gated the same way so the whole небесен ритъм block waits together.
  const meteorRevealStyle = useAnimatedStyle(() => {
    const gate = horoscopeReady ? 1 : 0
    return {
      opacity: meteorReveal.progress.value * gate,
      transform: [{ translateY: (1 - meteorReveal.progress.value) * 20 }],
    }
  })

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
    <ScreenShell temperature="warm" onScroll={checkAllReveals}>
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
      {/* Font choice fix (this batch): matches SECTION_CAPTION_STYLE's own
          fix below — font.mono read as rigid/technical against this
          screen's otherwise warm serif type system. Same font.displayRegular
          swap for consistency; this is the same visual family as every
          other caption on the screen now, not a second treatment. */}
      {/* Founder device-pass fix (this batch, legibility): 10.5 → 13 — the
          whole date line read small against the rest of the screen's
          type after the font-choice fix above; bumped as one line, not
          a per-word tweak. */}
      <Text style={{ fontFamily: font.displayRegular, fontSize: 13, letterSpacing: 0.32, color: color.faint, marginTop: 24 }}>
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
      {/* Founder device-pass fix (this batch): the leading glyph of an
          italic word (here almost always "Добро"/"Добър"/"Благословена" —
          all Д) was getting its left stroke clipped — italic slant makes
          the FIRST character's ink lean left of the string's own logical
          start, with nothing before it to absorb the overhang. lineHeight
          gives it vertical room, paddingLeft gives it horizontal room; same
          fix applied to chart.tsx's «Докосни» hint, same root cause. */}
      <Text style={{ fontFamily: font.bodyItalic, fontStyle: 'italic', fontSize: 19, lineHeight: 26, paddingLeft: 3, color: color.muted, marginTop: 3 }}>
        <Text style={{ color: color.bronzeText }}>{greetingPhrase}</Text>
        {`,${greetingNamePart}`}
      </Text>

      {/* IA reorder (this batch): дневен хороскоп is the reason someone
          opens the app, moved above небесен ритъм — небесен ритъм is now
          context underneath it, not the reverse. Caption + body both use
          the categorically larger HOROSCOPE_* styles (see their header
          comment above) so primacy is unambiguous, not a size nudge. */}
      {chart && (
        <>
          <SectionDivider />
          <View>
            {/* Source-provenance label (item 3, 2026-07-27) — see
                SECTION_CAPTION_STYLE's header comment. This block was the
                actual gap the founder flagged: nothing marked where the
                moon block ended and the reading began. "Дневен хороскоп"
                mirrors web's own heading for this exact content
                (DailyHoroscope.tsx), not invented copy. */}
            <Text style={HOROSCOPE_CAPTION_STYLE}>дневен хороскоп</Text>
            {/* EU AI Act Art. 50 — AI-generated content disclosure. */}
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.faint, marginTop: 2 }}>
              {AI_GENERATED_DISCLOSURE_BG}
            </Text>
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
            {/* Scroll hint (this batch) — «Питай Оракула» is now well below
                the fold (after both the horoscope and небесен ритъм blocks),
                so the reading's own end needs to point at it. Same italic
                hint device chart.tsx's «Докосни» already uses, not a new
                primitive. */}
            <Text
              style={{
                fontFamily: 'EBGaramond-Italic',
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 20,
                color: color.faint,
                textAlign: 'center',
                paddingHorizontal: 4,
                marginTop: rhythm.paragraph,
              }}
            >
              Плъзни надолу, за да попиташ Оракула
            </Text>
          </View>
        </>
      )}

      {/* Content addition (2026-07-28) — sign block. Moved (this batch) to
          sit between дневен хороскоп and небесен ритъм, rather than after
          небесен ритъм — the sign quip is a short beat naturally paired
          with the reading above it, not with the moon/sky data below. */}
      {sunSign && signQuip && (
        <>
          <SectionDivider />
          <View>
            <Text style={SECTION_CAPTION_STYLE}>{sunSign}</Text>
            <Text style={{ ...type.body, color: color.text, marginTop: rhythm.tight }}>{signQuip}</Text>
          </View>
        </>
      )}

      {/* Founder device-pass fix (2026-07-27, caption ownership): this
          caption used to sit directly above the MOON GLYPH, with its
          actual data (phase name, illumination, countdown) rendering
          ~700px below it, the glyph in between — the caption didn't
          visibly own the content it labels. MoonHero now renders its
          text data (phaseName eyebrow + subLabel) FIRST, immediately
          under this caption, with the glyph as the illustration below
          that pairing. "Небесен ритъм" is web's own heading for this
          block (DashboardContent.tsx), not invented copy. Now context
          underneath the horoscope+sign (IA reorder, this batch) — the
          section divider (SectionDivider) renders as its own element
          before this.
          Round 5: reverted round 3's mount-gate (it broke reveal — see
          history in git blame if needed) back to unconditional mounting.
          Round 7 (this batch): небесен ритъм now DOES wait for дневен
          хороскоп again, but as a pure opacity gate multiplied into these
          same reveal styles (`horoscopeReady`, defined above with
          moonRevealStyle/rhythmHeadingRevealStyle) — NOT a mount
          condition. The block below is still unconditionally mounted,
          exactly as round 5 left it; only the animated styles changed. */}
      <SectionDivider />
      <Animated.View style={rhythmHeadingRevealStyle}>
        <Text style={SECTION_CAPTION_STYLE}>небесен ритъм</Text>
      </Animated.View>
      <Animated.View ref={moonReveal.ref} onLayout={moonReveal.check} style={moonRevealStyle}>
        <MoonHero
          illumination={lunarPhase.illumination}
          isWaxing={lunarPhase.isWaxing}
          phaseName={lunarPhase.name}
          subLabel={`${lunarPhase.illumination}% осветена · до ${lunarPhase.nextMajor.name.toLowerCase()}: ${formatDaysHours(lunarPhase.nextMajor.daysAway)}`}
        />
      </Animated.View>
      {/* Content addition (2026-07-28) — the rest of web's Небесен
          ритъм prose (meteorNote only; the lunar sentence is NOT
          ported here, it would duplicate the data line above). Only
          renders on days with an active shower, same as web — most
          days this is null. */}
      {meteorText && (
        <Animated.View
          ref={meteorReveal.ref}
          onLayout={meteorReveal.check}
          style={[{ marginTop: rhythm.tight }, meteorRevealStyle]}
        >
          <Text
            style={{
              fontFamily: 'EBGaramond-Italic',
              fontStyle: 'italic',
              fontSize: 16,
              color: color.muted,
              textAlign: 'center',
            }}
          >
            {meteorText}
          </Text>
        </Animated.View>
      )}

      {/* «Повече детайли» — founder correction (this batch): CtaPanel made
          it render as a peer of «Питай Оракула» (same glow/ember/scale),
          which destroys the hierarchy — «Питай Оракула» is the screen's
          one exit, «Повече детайли» is a subordinate link belonging to
          the небесен ритъм block above it, not a second invitation.
          Rebuilt as its own small device, deliberately UNDER-signaled
          relative to CtaPanel at the time.
          Founder correction (this batch, round 8 — real user feedback,
          not a device-pass guess): that under-signaling went too far —
          it didn't read as tappable AT ALL next to «Питай Оракула».
          Added the two things that actually say "alive, tap here"
          elsewhere in this system: a small breathing bronze ember (left
          of the label, same EmberGlow-style radial-gradient technique
          CtaPanel/Pedestal use, sized down) and a soft bronze glow behind
          the whole row. Font size is UNCHANGED (still 13px, per explicit
          instruction) — the differentiation from CtaPanel is now purely
          weight/scale (13px vs CtaPanel's 20px, a smaller ember, a
          tighter glow, no scale-on-press, no display-SEMIbold), not
          "does it look tappable at all." The bronze thread-above device
          is gone — replaced by the ember, which already carries the
          "this is lit" signal on its own.
          Reverted (round 5): the `!horoscope.isLoading` MOUNT gate from
          round 3 is gone — back to `chart` only.
          Round 7: animates in together with небесен ритъм via
          `detailLinkRevealStyle` (reads the same moon progress +
          horoscope gate as the caption) — unchanged this round.
          Ratified base layout: .planning/design/mockups/
          dnes-povece-detaili-v1.html — this round's ember/glow addition
          is a founder correction on top of that mockup, not a
          re-ratified design.
          Founder correction (this batch, round 9 — user feedback: two
          buttons sitting right next to each other with nothing tying the
          top one to небесен ритъм specifically): added a hint line, same
          italic/muted/centered device this same screen already uses for
          «Плъзни надолу, за да попиташ Оракула» — that precedent points
          at ITS destination by naming it; this one does the same, naming
          «Повече детайли» directly since the button sits right below it.
          Spacing is the other half of the fix: the hint gets
          rhythm.paragraph off the meteor/moon content above (same gap the
          old thread-less button used to get), and the button itself now
          gets only rhythm.tight off the hint — visually binding hint+
          button into one attached unit, while «Питай Оракула» below
          keeps its own separate rhythm.group gap. Two different gap
          sizes between three elements is itself part of the signal: tight
          = belongs together, group = new section. */}
      {chart && (
        <Animated.View style={detailLinkRevealStyle}>
          <Text
            style={{
              fontFamily: 'EBGaramond-Italic',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 20,
              color: color.faint,
              textAlign: 'left',
              marginTop: rhythm.paragraph,
            }}
          >
            За целия лунен профил — докосни «Повече детайли» по-долу.
          </Text>
          <Pressable
            onPress={() => {
              hapticSelect()
              push('/moon-detail')
            }}
            onPressIn={() => setDetailLinkPressed(true)}
            onPressOut={() => setDetailLinkPressed(false)}
            accessibilityRole="button"
            style={{
              ...pressFeedback(detailLinkPressed),
              marginTop: rhythm.tight,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 8,
              paddingVertical: 14,
              position: 'relative',
            }}
          >
            {/* Founder correction (this batch, round 10): the ambient
                glow behind the whole row is gone — it made this read too
                close to a 1:1 miniature of CtaPanel. The ember keeps its
                own small point-glow (that's what makes it read as lit at
                all, not a dead flat dot) but there's no longer a second,
                bigger glow bleeding into the row around it — one glow
                layer here, CtaPanel gets two (row glow + ember glow). */}
            <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={14} height={14} style={{ position: 'absolute' }} pointerEvents="none">
                <Defs>
                  <RadialGradient id="detail-link-ember-glow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor={color.bronze} stopOpacity={0.85} />
                    <Stop offset="35%" stopColor={color.bronze} stopOpacity={0.4} />
                    <Stop offset="100%" stopColor={color.bronze} stopOpacity={0} />
                  </RadialGradient>
                </Defs>
                <Circle cx={7} cy={7} r={7} fill="url(#detail-link-ember-glow)" />
              </Svg>
              <Animated.View
                style={[
                  {
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: color.bronze,
                    shadowColor: color.bronze,
                    shadowOpacity: 0.9,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 0 },
                  },
                  detailLinkBreathe,
                ]}
              />
            </View>
            <Text
              style={{
                fontFamily: font.displayRegular,
                fontSize: 13,
                letterSpacing: 2.08,
                textTransform: 'uppercase',
                color: color.bronzeText,
                opacity: 0.85,
              }}
            >
              Повече детайли
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* «Питай Оракула» stays the screen's single exit — now after ALL
          content blocks (IA reorder, this batch) rather than glued to the
          horoscope block specifically. "Ends in exactly one exit" still
          holds regardless of which block reads first. */}
      {chart && (
        <Animated.View
          ref={ctaReveal.ref}
          onLayout={ctaReveal.check}
          style={[{ marginTop: rhythm.group }, ctaReveal.style]}
        >
          <CtaPanel label="Питай Оракула" onPress={() => push('/oracle')} />
        </Animated.View>
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

// mockup `.payoff-block`: font-family serif-d-r (Playfair Regular), plus a
// small bronze glow (`.payoff-glow`: 80×60 ellipse, offset left:-16 top:-8,
// .14 opacity). Device-pass fix (2026-07-27): textShadow alone read too
// weak against a real screenshot — see CtaPanel.tsx's matching fix —
// replaced with a real glow blob behind the text, offset up-left the same
// way the mockup's own glow div is, not centered like the invite's (this
// payoff sits left-aligned in a reading block, not standalone centered
// content).
// Founder device-pass fix (this batch, art choice): color was
// color.starlight (a cool near-white) glowing inside a BRONZE blob — a
// hue mismatch, and off the app's stated rule ("warm bronze where the app
// speaks to the user; cool starlight where the sky is being read"). The
// horoscope reading is the app speaking to the user, not the sky being
// read — recolored to color.bronzeText so the glow and the text it lights
// are the same hue family.
const PAYOFF_TEXT_STYLE = { fontFamily: font.displayRegular, color: color.bronzeText } as const

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
        <Text style={{ ...type.body, ...HOROSCOPE_BODY_STYLE, color: color.text }}>{sentences[0]}</Text>
      </ReadingFrame>
    )
  }

  const led = sentences.slice(0, last)
  const payoffText = sentences[last]

  return (
    <LeadLine
      payoff={
        <PayoffGlow>
          <Text style={{ ...type.body, ...HOROSCOPE_BODY_STYLE, ...PAYOFF_TEXT_STYLE }}>{payoffText}</Text>
        </PayoffGlow>
      }
    >
      {led.map((s, i) => (
        <Text key={i} style={{ ...type.body, ...HOROSCOPE_BODY_STYLE, ...beatStyle(i, last), color: color.text }}>
          {s}
        </Text>
      ))}
    </LeadLine>
  )
}

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
// MOBILE-ALPHA-REDESIGN v3, Step 2 (reading length) — UPDATED 2026-09-04.
// The daily-horoscope prompt (apps/web/lib/horoscope/prompts.ts) now
// targets 420-450 characters, 3 paragraphs, 3-4 sentences (cut down from
// a 600-850/3-paragraph target that briefly replaced the original
// 400-550/2-paragraph one during the Gemini port, 2d87ea3/f34f09f, and
// didn't fit on-screen at any device size — see the Gemini cost/
// rate-limit report, item 3).
//
// Re-measured against DEVICE-SUPPORT-POLICY.md's 360x780 design floor
// (not iPhone SE — see that doc for why), analytically (no on-device/
// simulator render was available either time): 420-450 chars is CLOSE
// but, on the central estimate, still ~2-3 lines (~65-95px) over one
// screen including this screen's header block, the AI disclosure, and
// the "Плъзни надолу" hint below the reading — it is not a confirmed
// fit. At the most favorable plausible character-width assumption it's
// within ~1 line (~35px). A target around 350-390 characters would fit
// with real margin at this floor; 420-450 was chosen as a smaller,
// approved cut from 600-850, not as a value confirmed to fit exactly.
// Re-verify on a real 360x780-class device before treating this as
// solved — see the DEVICE-PASS-STALE register row.
//
// EXPAND_THRESHOLD_CHARS below is still a variance safety net, not a
// routine control, at roughly the same proportional headroom above the
// new target (2x its upper bound) as it had above the old one. See
// REVISIT 57 (daily-reading length re-verification against production
// model).
const EXPAND_THRESHOLD_CHARS = 900

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
          <Text style={{ fontFamily: font.cinzel, fontSize: 14, color: color.bronze }}>{PLANET_GLYPHS[anchor]}</Text>
          <Text style={{ ...type.caption, color: color.muted }}>{PLANETS_BG[anchor]}</Text>
        </View>
      )}
      <Text
        style={{
          ...type.body,
          ...HOROSCOPE_BODY_STYLE,
          ...(role === 'opener' ? { fontFamily: font.bodyItalic, color: color.text } : { fontFamily: font.body, color: color.text }),
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
          <Text style={{ ...type.body, ...HOROSCOPE_BODY_STYLE, ...PAYOFF_TEXT_STYLE }}>{renderSentinelChunks(paragraphs[last])}</Text>
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
          onPress={() => {
            hapticSelect()
            setExpanded(true)
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ ...pressFeedback(pressed), marginTop: rhythm.paragraph })}
        >
          <Text style={{ ...type.caption, color: color.bronzeText }}>Прочети повече</Text>
        </Pressable>
      )}
    </LeadLine>
  )
}
