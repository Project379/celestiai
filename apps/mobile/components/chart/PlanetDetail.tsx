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

import { color, font, rhythm, space, type as typeScale } from '@/components/design-system/tokens'

/**
 * Mobile port of apps/web/components/chart/PlanetDetail.tsx — bottom-
 * sheet modal pattern (per SR 6 decision 6, reaffirmed as the ratified
 * sheet-class exception to the popover-class overlay rule at
 * MOBILE_ALPHA_REDESIGN.md's "Discipline patterns" §, 2026-07-23) instead
 * of web's inline panel. Same five editorial sections (Общ поглед /
 * Силни страни / Предизвикателства / Аспекти / Насока за развитие), same
 * Bulgarian copy via @stellaeum/core/charts/interpretations (lifted in 6.1).
 *
 * Design-system pass, 2026-07-23 — content-lead treatment PROPOSED, not yet
 * founder-approved (see R7 draft in MOBILE_ALPHA_REDESIGN.md): the brief
 * sentence is rendered as the lead (italic register-shift, Днес's opener
 * lever) instead of reading like another body paragraph; position/element/
 * house metadata is demoted to one quiet inline caption row so it stops
 * competing with the title; Strengths/Challenges get distinct directional
 * glyphs instead of an identical dot; Growth (the forward-looking close)
 * gets the payoff weight-up. These three levers are deliberately borrowed
 * from Днес's mechanism even though the founder said not to copy Днес's
 * *treatment* — flag this explicitly for founder review rather than
 * assuming it's within bounds. Tokens (`rhythm`/`space`/`type`) replace the
 * ad hoc pixel values the font-only pass left behind (this part is a
 * mechanical tokens-only change, not in question).
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
          <Text className={textTint} style={{ fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 12 }}>
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
      <Pressable className="flex-1 bg-black/85" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="mt-auto rounded-t-2xl border-t border-white/10 bg-bg"
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
                  <Section
                    title="Силни страни"
                    textTint={textTint}
                    dotTint={dotTint}
                    marker="+"
                  >
                    <BulletList items={interpretation.strengths} dotTint={dotTint} />
                  </Section>
                )}
                {hasChallenges && (
                  <Section
                    title="Предизвикателства"
                    textTint={textTint}
                    dotTint={dotTint}
                    marker="-"
                  >
                    <BulletList items={interpretation.challenges} dotTint={dotTint} />
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
                  // Payoff (R7) — same lever Днес uses for its closing beat:
                  // weight steps up to Medium, no new box or color. This is
                  // the forward-looking "what do I do with this," not more
                  // description, so it reads distinct from Overview above.
                  <Section
                    title="Насока за развитие"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <Text style={{ fontFamily: font.bodyMedium }} className="text-[14px] leading-[1.85] text-slate-200">
                      {interpretation.growth}
                    </Text>
                  </Section>
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
        </Pressable>
      </Pressable>
    </Modal>
  )
}
