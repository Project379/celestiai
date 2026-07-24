import { useMemo } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  PLANETS_BG,
  PLANET_GLYPHS,
  ZODIAC_GLYPHS,
  ZODIAC_SIGNS_BG,
} from '@stellaeum/astrology/client'
import type {
  AspectData,
  Planet,
  PlanetPosition,
  PointData,
  ZodiacSign,
} from '@stellaeum/astrology/client'
import {
  getPlanetInterpretation,
  getRisingInterpretation,
} from '@stellaeum/core/charts/interpretations'

import { color, font, pressFeedback, rhythm, space, type as typeScale } from '@/components/design-system/tokens'

/**
 * Mobile port of apps/web/components/chart/PlanetDetail.tsx — bottom-
 * sheet modal pattern (per SR 6 decision 6, reaffirmed as the ratified
 * sheet-class exception to the popover-class overlay rule at
 * MOBILE_ALPHA_REDESIGN.md's "Discipline patterns" §, 2026-07-23) instead
 * of web's inline panel. Same five editorial sections (Общ поглед /
 * Силни страни / Предизвикателства / Аспекти / Насока за развитие), same
 * Bulgarian copy via @stellaeum/core/charts/interpretations (lifted in 6.1).
 *
 * Design-system pass, 2026-07-23, founder-approved 2026-07-24 after an R7
 * CALIBRATION correction (see MOBILE_ALPHA_REDESIGN.md, "R7 calibration
 * amendment"): the brief is the lead (italic register-shift, Днес's opener
 * lever); position/element/house metadata is demoted to one quiet inline
 * caption row (not an R7 lever — pure de-emphasis, doesn't need to
 * register as a change). The first landing of Strengths/Challenges
 * markers and Growth's payoff treatment shipped 2026-07-23 and were found
 * imperceptible on device (verified via a before/after side-by-side
 * render at 390px, not device testing alone) — three of four levers had
 * moved only one property one step within the same register they were
 * meant to escape. Recalibrated 2026-07-24: Strengths/Challenges now use
 * a fixed emerald/rose pair (reusing ELEMENT_DOT_CLASS.earth/.fire
 * verbatim, decoupled from the tapped planet's actual element) plus a
 * 12px→16px marker-glyph size bump; Growth is a Surface2 tonal panel
 * (§4.2's "nested card" tier + §1.3's hairline-border Card recipe, not a
 * new decorated element) instead of another hairline-separated list row.
 * Every lever now differs from its surroundings on ≥2 dimensions with
 * ≥1 categorical (hue family, containment), not a single degree step.
 * Tokens (`rhythm`/`space`/`type`) replace the ad hoc pixel values the
 * font-only pass left behind.
 *
 * Skipped vs web: ambient blur backgrounds, framer-motion staggered
 * fades, custom celestial icons (Unicode glyphs from PLANET_GLYPHS /
 * ZODIAC_GLYPHS instead).
 */

interface PlanetDetailProps {
  visible: boolean
  planet: PlanetPosition | PointData | null
  type?: 'sun' | 'moon' | 'rising' | null
  birthTimeKnown?: boolean
  house?: number
  aspects?: AspectData[]
  onClose: () => void
}

const SIGN_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire',
  taurus: 'earth',
  gemini: 'air',
  cancer: 'water',
  leo: 'fire',
  virgo: 'earth',
  libra: 'air',
  scorpio: 'water',
  sagittarius: 'fire',
  capricorn: 'earth',
  aquarius: 'air',
  pisces: 'water',
}

const ELEMENT_DOT_CLASS: Record<'fire' | 'earth' | 'air' | 'water', string> = {
  fire: 'bg-rose-300/90',
  earth: 'bg-emerald-300/90',
  air: 'bg-cyan-300/90',
  water: 'bg-violet-300/90',
}

const ELEMENT_TEXT_CLASS: Record<'fire' | 'earth' | 'air' | 'water', string> = {
  fire: 'text-rose-300/85',
  earth: 'text-emerald-300/85',
  air: 'text-cyan-300/85',
  water: 'text-violet-300/85',
}

const ELEMENT_LABEL: Record<'fire' | 'earth' | 'air' | 'water', string> = {
  fire: 'Огън',
  earth: 'Земя',
  air: 'Въздух',
  water: 'Вода',
}

interface SectionProps {
  title: string
  textTint: string
  dotTint: string
  // R7 (MOBILE_ALPHA_REDESIGN.md): PlanetDetail has one planet, not several
  // influences to anchor by (that's Днес's device) — so its segments
  // differentiate by ROLE instead. Strengths/Challenges get an opposing
  // glyph pair so the eye can tell "supportive" from "friction" before
  // reading either; every other section keeps the plain rotated-dot marker
  // (still exactly one shared shape, not a proliferation of iconography).
  marker?: string
  children: React.ReactNode
}

// R5/R3 fix (found as a live regression on Round A's shipped Карта screen —
// nested in the tap-to-open modal, not the route file, exactly the blind
// spot .planning/research/MOBILE_ALPHA_REDESIGN.md §14 now codifies
// against). Dropped the Roman-numeral section markers entirely (R5 scopes
// those to the Astrology Guide only) and de-tracked the section title —
// the modal's header eyebrow ("Планета"/"Асцендент") is this surface's one
// reserved R3 slot; everything else renders as plain sentence-case text
// distinguished by color/weight instead.
function Section({ title, textTint, dotTint, marker, children }: SectionProps) {
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: rhythm.tight }}>
      <View className="mb-3 flex-row items-center" style={{ gap: space.md }}>
        {marker ? (
          // R7 recalibration (2026-07-24): 12px→16px, bigger than its own
          // 13.5px label — a degree axis paired with the categorical hue
          // swap the caller passes in via textTint (see Strengths/
          // Challenges call sites, which now pass a fixed emerald/rose
          // pair instead of the planet's element tint).
          <Text className={textTint} style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 16 }}>
            {marker}
          </Text>
        ) : (
          <View
            className={`h-1 w-1 ${dotTint}`}
            style={{ transform: [{ rotate: '45deg' }] }}
          />
        )}
        <Text style={{ fontFamily: font.bodyMedium }} className={`text-[13.5px] font-medium ${textTint}`}>
          {title}
        </Text>
      </View>
      <View>{children}</View>
    </View>
  )
}

interface BulletListProps {
  items: string[]
  dotTint: string
}

function BulletList({ items, dotTint }: BulletListProps) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((item, idx) => (
        <View key={idx} className="flex-row" style={{ gap: space.md }}>
          <View
            className={`h-1 w-1 ${dotTint}`}
            style={{ transform: [{ rotate: '45deg' }], marginTop: 10 }}
          />
          <Text style={{ fontFamily: font.body }} className="flex-1 text-[14px] leading-[1.85] text-slate-300/95">
            {item}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function PlanetDetail({
  visible,
  planet,
  type,
  birthTimeKnown = true,
  house,
  aspects = [],
  onClose,
}: PlanetDetailProps) {
  const isRising = type === 'rising'
  const isPlanetPosition = planet !== null && 'planet' in planet

  const interpretation = useMemo(() => {
    if (!planet) return null
    if (isRising) {
      return getRisingInterpretation(
        planet.sign,
        'degree' in planet ? planet.degree : (planet as PlanetPosition).signDegree,
        !birthTimeKnown,
      )
    }
    return getPlanetInterpretation(
      isPlanetPosition ? (planet as PlanetPosition).planet : type ?? 'sun',
      planet.sign,
      isPlanetPosition
        ? (planet as PlanetPosition).signDegree
        : (planet as PointData).degree,
      house,
      aspects,
    )
  }, [planet, isRising, isPlanetPosition, type, birthTimeKnown, house, aspects])

  const element = useMemo(() => {
    if (!planet) return 'fire' as const
    return SIGN_ELEMENTS[planet.sign.toLowerCase() as ZodiacSign] ?? 'fire'
  }, [planet])

  if (!planet || !interpretation) return null

  const signKey = planet.sign.toLowerCase() as ZodiacSign
  const signLabel = ZODIAC_SIGNS_BG[signKey] ?? planet.sign
  const signGlyph = ZODIAC_GLYPHS[signKey] ?? ''
  const planetGlyph = isPlanetPosition
    ? PLANET_GLYPHS[(planet as PlanetPosition).planet as Planet] ?? ''
    : isRising
      ? '↑'
      : ''
  const displayTitle = isRising
    ? interpretation.title
    : isPlanetPosition
      ? PLANETS_BG[(planet as PlanetPosition).planet as Planet] ?? interpretation.title
      : interpretation.title

  const dotTint = ELEMENT_DOT_CLASS[element]
  const textTint = ELEMENT_TEXT_CLASS[element]

  const hasOverview = Boolean(interpretation.overview.trim())
  const hasStrengths = interpretation.strengths.length > 0
  const hasChallenges = interpretation.challenges.length > 0
  const hasAspectInsights = interpretation.aspectInsights.length > 0
  const hasGrowth = Boolean(interpretation.growth.trim())

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop and sheet are siblings, not parent/child (matches
            TransitOverviewCard's EventModal pattern) — a Pressable
            wrapping a ScrollView nests two responder negotiations ahead
            of the ScrollView's native pan responder, which was
            swallowing drags started over the sheet's content instead of
            letting the ScrollView scroll; only the platform scrollbar
            thumb (an OS-level drag, not JS touch dispatch) still worked. */}
        <Pressable
          onPress={onClose}
          accessibilityLabel="Затвори"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          className="bg-black/85"
        />
        <View
          className="rounded-t-2xl border-t border-white/10 bg-bg"
          style={{ maxHeight: '88%' }}
        >
          <SafeAreaView edges={['bottom']}>
            <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.xl, paddingBottom: space['3xl'] }}>
              {/* Header — identity only. Position/element/house used to sit
                  at near-title weight (R7 finding: loud but shouldn't be);
                  now one quiet caption row below the sub-line, demoted to
                  reference detail so it stops competing with the title. */}
              <View className="flex-row items-start justify-between" style={{ gap: space.lg, marginBottom: rhythm.paragraph }}>
                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center" style={{ gap: space.md, marginBottom: rhythm.tight }}>
                    <View
                      className="h-1 w-1 bg-amber-300/90"
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                    {/* This screen's one reserved R3 eyebrow — everything
                        else in this modal is plain sentence-case. Cinzel
                        dropped: it has zero Cyrillic glyphs and this text
                        is Cyrillic (REVISIT-42's bug, present here too). */}
                    <Text style={{ fontFamily: font.bodyMedium }} className="text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                      {isRising ? 'Асцендент' : 'Планета'}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: font.bodyMedium }} className="text-[24px] font-semibold leading-tight tracking-tight text-slate-100">
                    <Text className="text-slate-400">{planetGlyph}  {displayTitle}</Text>
                    <Text> в </Text>
                    <Text>{signLabel} {signGlyph}</Text>
                  </Text>
                  <Text style={{ ...typeScale.caption, fontFamily: font.body, color: color.faint, marginTop: rhythm.micro }}>
                    {[interpretation.position, ELEMENT_LABEL[element], house !== undefined ? `Дом ${house}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Затвори"
                  style={({ pressed }) => pressFeedback(pressed)}
                >
                  <Text style={{ fontFamily: font.body }} className="text-[18px] text-slate-500">✕</Text>
                </Pressable>
              </View>

              {/* Brief — the lead, not another paragraph (R7). Днес's
                  opener lever (italic, same size/weight as body — a
                  register shift, not a size jump) marks this as "read this
                  first," since it's the one-sentence answer to "what does
                  this mean for me." No left-border box anymore — that
                  chrome made it read as a call-out aside rather than the
                  entry point. */}
              {interpretation.brief && (
                <Text
                  style={{ ...typeScale.body, fontFamily: font.bodyItalic, color: '#dde3ee', marginBottom: rhythm.group }}
                >
                  {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
                </Text>
              )}

              {/* Body sections */}
              <View style={{ gap: rhythm.group }}>
                {hasOverview && (
                  <Section
                    title="Общ поглед"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <Text style={{ fontFamily: font.body }} className="text-[14px] leading-[1.85] text-slate-300/95">
                      {interpretation.overview}
                    </Text>
                  </Section>
                )}
                {hasStrengths && (
                  // R7 recalibration (2026-07-24): fixed emerald, not the
                  // planet's own element tint — Strengths/Challenges are
                  // semantic opposites and need a consistent colour pair
                  // to read as such across every planet, not just
                  // whichever ones happen to land on rose/emerald
                  // elements. Reuses ELEMENT_DOT_CLASS.earth /
                  // ELEMENT_TEXT_CLASS.earth verbatim — no new palette
                  // value. Breaks the "one element colour runs the whole
                  // sheet" continuity for these two sections only, on
                  // purpose (ratified: semantic colour beats decorative
                  // consistency — ties the eye to meaning, not to a
                  // design system's internal bookkeeping).
                  <Section
                    title="Силни страни"
                    textTint={ELEMENT_TEXT_CLASS.earth}
                    dotTint={ELEMENT_DOT_CLASS.earth}
                    marker="+"
                  >
                    <BulletList items={interpretation.strengths} dotTint={ELEMENT_DOT_CLASS.earth} />
                  </Section>
                )}
                {hasChallenges && (
                  // R7 recalibration — fixed rose, mirroring Strengths above.
                  <Section
                    title="Предизвикателства"
                    textTint={ELEMENT_TEXT_CLASS.fire}
                    dotTint={ELEMENT_DOT_CLASS.fire}
                    marker="-"
                  >
                    <BulletList items={interpretation.challenges} dotTint={ELEMENT_DOT_CLASS.fire} />
                  </Section>
                )}
                {hasAspectInsights && (
                  <Section
                    title="Аспекти"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <BulletList items={interpretation.aspectInsights} dotTint={dotTint} />
                  </Section>
                )}
                {hasGrowth && (
                  // Payoff (R7 recalibration, 2026-07-24) — containment,
                  // not the shared hairline+dot list-row every other
                  // section uses. A prior version tried reusing the
                  // brief's italic register unlabelled; rejected —
                  // removing the "Насока за развитие" label to create
                  // emphasis was a categorical move in the wrong
                  // direction (the label does real semantic work; italic
                  // already means "brief" at the top of the sheet, so
                  // reusing it unlabelled at the bottom made opening and
                  // conclusion read as the same kind of element instead
                  // of as bookends). Surface2 (`color.surface2`, the
                  // "nested card" elevation tier, §4.2) + a low-opacity
                  // hairline border is the app's own existing tonal-card
                  // recipe (§1.3), not a new decorated element — Surface1
                  // was tried first and rejected as too close to base to
                  // register (a ~10-value RGB shift, the same magnitude
                  // as the original invisible weight-step). The panel's
                  // own edge is the section break, so the shared top
                  // hairline is dropped here rather than doubled against
                  // it. Weight-up (400→600) kept as a supporting third
                  // axis, not the primary carrier.
                  <View
                    style={{
                      backgroundColor: color.surface2,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.06)',
                      padding: space.lg,
                    }}
                  >
                    <View className="mb-3 flex-row items-center" style={{ gap: space.md }}>
                      <View
                        className={`h-1 w-1 ${dotTint}`}
                        style={{ transform: [{ rotate: '45deg' }] }}
                      />
                      <Text style={{ fontFamily: font.bodyMedium }} className={`text-[13.5px] font-medium ${textTint}`}>
                        Насока за развитие
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.bodyMedium }} className="text-[14px] leading-[1.85] text-slate-200">
                      {interpretation.growth}
                    </Text>
                  </View>
                )}
                {isRising && !birthTimeKnown && (
                  <View className="border-l border-amber-300/50 bg-amber-300/[0.05] px-5 py-3">
                    <Text style={{ fontFamily: font.bodyMedium }} className="mb-1 text-[12.5px] font-medium text-amber-300/80">
                      Забележка
                    </Text>
                    <Text style={{ fontFamily: font.body }} className="text-[12.5px] font-light leading-relaxed text-amber-100/85">
                      Часът на раждане е приблизителен, затова тълкуването на асцендента е ориентировъчно.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  )
}
