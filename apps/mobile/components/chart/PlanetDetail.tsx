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

/**
 * Mobile port of apps/web/components/chart/PlanetDetail.tsx — bottom-
 * sheet modal pattern (per SR 6 decision 6) instead of web's inline
 * panel. Same five editorial sections (Общ поглед / Силни страни /
 * Предизвикателства / Аспекти / Насока за развитие), same Bulgarian
 * copy via @stellaeum/core/charts/interpretations (lifted in 6.1).
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
function Section({ title, textTint, dotTint, children }: SectionProps) {
  return (
    <View className="border-t border-white/[0.05] pt-5">
      <View className="mb-3 flex-row items-center" style={{ gap: 12 }}>
        <View
          className={`h-1 w-1 ${dotTint}`}
          style={{ transform: [{ rotate: '45deg' }] }}
        />
        <Text className={`text-[13.5px] font-medium ${textTint}`}>
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
    <View style={{ gap: 8 }}>
      {items.map((item, idx) => (
        <View key={idx} className="flex-row" style={{ gap: 12 }}>
          <View
            className={`h-1 w-1 ${dotTint}`}
            style={{ transform: [{ rotate: '45deg' }], marginTop: 10 }}
          />
          <Text className="flex-1 text-[14px] leading-[1.85] text-slate-300/95">
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
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32 }}>
              {/* Header */}
              <View className="mb-5 flex-row items-start justify-between" style={{ gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <View className="mb-3 flex-row items-center" style={{ gap: 12 }}>
                    <View
                      className="h-1 w-1 bg-amber-300/90"
                      style={{ transform: [{ rotate: '45deg' }] }}
                    />
                    {/* This screen's one reserved R3 eyebrow — everything
                        else in this modal is plain sentence-case. Cinzel
                        dropped: it has zero Cyrillic glyphs and this text
                        is Cyrillic (REVISIT-42's bug, present here too). */}
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                      {isRising ? 'Асцендент' : 'Планета'}
                    </Text>
                  </View>
                  <Text className="text-[24px] font-semibold leading-tight tracking-tight text-slate-100">
                    <Text className="text-slate-400">{planetGlyph}  {displayTitle}</Text>
                    <Text> в </Text>
                    <Text>{signLabel} {signGlyph}</Text>
                  </Text>
                  <Text className="mt-3 text-[13px] font-light text-slate-400">
                    {interpretation.position}
                  </Text>
                  <View className="mt-4 flex-row items-center flex-wrap" style={{ gap: 16 }}>
                    <View className="flex-row items-center" style={{ gap: 8 }}>
                      <View
                        className={`h-1 w-1 ${dotTint}`}
                        style={{ transform: [{ rotate: '45deg' }] }}
                      />
                      <Text className={`text-[12.5px] font-medium ${textTint}`}>
                        {ELEMENT_LABEL[element]}
                      </Text>
                    </View>
                    {house !== undefined && (
                      <View className="flex-row items-center" style={{ gap: 8 }}>
                        <View
                          className="h-1 w-1 bg-slate-500/70"
                          style={{ transform: [{ rotate: '45deg' }] }}
                        />
                        <Text className="text-[12.5px] font-medium text-slate-500">
                          Дом {house}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Затвори"
                >
                  <Text className="text-[18px] text-slate-500">✕</Text>
                </Pressable>
              </View>

              {/* Brief lede */}
              {interpretation.brief && (
                <View className="mb-6 border-l border-amber-300/40 pl-5">
                  <Text className="text-[16px] font-light leading-[1.85] text-slate-300/95">
                    {interpretation.brief.charAt(0).toUpperCase() + interpretation.brief.slice(1)}
                  </Text>
                </View>
              )}

              {/* Body sections */}
              <View style={{ gap: 28 }}>
                {hasOverview && (
                  <Section
                    title="Общ поглед"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <Text className="text-[14px] leading-[1.85] text-slate-300/95">
                      {interpretation.overview}
                    </Text>
                  </Section>
                )}
                {hasStrengths && (
                  <Section
                    title="Силни страни"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <BulletList items={interpretation.strengths} dotTint={dotTint} />
                  </Section>
                )}
                {hasChallenges && (
                  <Section
                    title="Предизвикателства"
                    textTint={textTint}
                    dotTint={dotTint}
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
                  <Section
                    title="Насока за развитие"
                    textTint={textTint}
                    dotTint={dotTint}
                  >
                    <Text className="text-[14px] leading-[1.85] text-slate-300/95">
                      {interpretation.growth}
                    </Text>
                  </Section>
                )}
                {isRising && !birthTimeKnown && (
                  <View className="border-l border-amber-300/50 bg-amber-300/[0.05] px-5 py-3">
                    <Text className="mb-1 text-[12.5px] font-medium text-amber-300/80">
                      Забележка
                    </Text>
                    <Text className="text-[12.5px] font-light leading-relaxed text-amber-100/85">
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
