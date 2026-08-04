import { useEffect } from 'react'
import { BackHandler, Pressable, ScrollView, Text, View } from 'react-native'

import type { CatalogRow } from '@stellaeum/core/crystals/queries'

import { CrystalGem, type GemVariant } from './CrystalGem'
import { pressFeedback } from '@/components/design-system/tokens'

interface CrystalDetailPanelProps {
  crystal: CatalogRow | null
  reason?: string | null
  canCollect?: boolean
  collecting?: boolean
  onCollect?: () => void
  onClose: () => void
}

const PHASE_BG: Record<string, string> = {
  new: 'Новолуние',
  waxing_crescent: 'Изгряващ полумесец',
  first_quarter: 'Първа четвърт',
  waxing_gibbous: 'Растяща луна',
  full: 'Пълнолуние',
  waning_gibbous: 'Намаляваща луна',
  last_quarter: 'Последна четвърт',
  waning_crescent: 'Намаляващ полумесец',
}

const ZODIAC_BG: Record<string, string> = {
  aries: 'Овен', taurus: 'Телец', gemini: 'Близнаци', cancer: 'Рак',
  leo: 'Лъв', virgo: 'Дева', libra: 'Везни', scorpio: 'Скорпион',
  sagittarius: 'Стрелец', capricorn: 'Козирог', aquarius: 'Водолей', pisces: 'Риби', all: 'Всички',
}

const PLANET_BG: Record<string, string> = {
  sun: 'Слънце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс',
  jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон',
}

const ELEMENT_BG: Record<string, string> = {
  fire: 'Огън', earth: 'Земя', air: 'Въздух', water: 'Вода',
}

const RARITY_BG: Record<string, string> = {
  common: 'Обикновен', uncommon: 'Рядък', rare: 'Ценен', legendary: 'Легендарен',
}

/**
 * Crystal detail overlay. Mobile port of
 * apps/web/components/crystals/CrystalDetailPanel.tsx, using the
 * canonical mobile overlay pattern (Absolute View + Pressable backdrop +
 * BackHandler — see NatalWheelLegend.tsx) rather than RN Modal.
 * framer-motion enter/exit dropped per data-display discipline.
 */
export function CrystalDetailPanel({
  crystal,
  reason,
  canCollect,
  collecting,
  onCollect,
  onClose,
}: CrystalDetailPanelProps) {
  useEffect(() => {
    if (!crystal) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => subscription.remove()
  }, [crystal, onClose])

  if (!crystal) return null

  return (
    <>
      <Pressable
        onPress={onClose}
        accessibilityLabel="Затвори"
        className="absolute inset-0 z-40 bg-black/75"
      />
      <View
        className="absolute inset-x-4 top-[8%] z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#0b0915]"
        style={{ maxHeight: '84%' }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Затвори"
          className="absolute right-4 top-4 z-10 h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
          style={({ pressed }) => pressFeedback(pressed)}
        >
          <Text className="text-[14px] text-slate-400">✕</Text>
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 48, paddingBottom: 40 }}>
          <View className="items-center">
            <CrystalGem
              variant={crystal.svg_variant as GemVariant}
              primary={crystal.color_primary}
              secondary={crystal.color_secondary}
              accent={crystal.color_accent}
              size={140}
              seed={crystal.slug}
            />

            <Text className="mt-4 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
              {RARITY_BG[crystal.rarity] ?? crystal.rarity}
            </Text>
            <Text className="mt-2 text-center text-[24px] font-semibold leading-tight text-slate-100">
              {crystal.name_bg ?? crystal.name_en}
            </Text>
            <Text className="mt-1.5 text-center text-[13px] font-light text-slate-400">
              {crystal.tagline_bg ?? crystal.tagline_en}
            </Text>

            {reason && (
              <View className="mt-6 w-full rounded-2xl border border-amber-300/25 bg-amber-400/[0.06] px-5 py-4">
                <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
                  Избран за този момент
                </Text>
                <Text className="mt-2 text-[13.5px] font-light leading-[1.75] text-slate-200">
                  {reason}
                </Text>
              </View>
            )}

            <Text className="mt-6 text-[14px] font-light leading-[1.8] text-slate-300/95">
              {crystal.description_bg ?? crystal.description_en}
            </Text>

            <View className="mt-6 w-full flex-row flex-wrap border-t border-white/10 pt-5" style={{ gap: 16 }}>
              {crystal.planet && (
                <DetailStat label="Планета" value={PLANET_BG[crystal.planet] ?? crystal.planet} />
              )}
              {crystal.zodiac_signs.length > 0 && (
                <DetailStat
                  label="Зодии"
                  value={crystal.zodiac_signs.map((s) => ZODIAC_BG[s] ?? s).join(', ')}
                />
              )}
              {crystal.moon_phases.length > 0 && (
                <DetailStat
                  label="Лунни фази"
                  value={crystal.moon_phases.map((p) => PHASE_BG[p] ?? p).join(' · ')}
                  full
                />
              )}
              {crystal.element && (
                <DetailStat label="Елемент" value={ELEMENT_BG[crystal.element] ?? crystal.element} />
              )}
              {crystal.hardness !== null && (
                <DetailStat label="Твърдост (Mohs)" value={String(crystal.hardness)} />
              )}
            </View>

            <View className="mt-6 w-full rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4">
              <Text className="text-center font-cinzel text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                Физически камък
              </Text>
              <Text className="mt-2 text-center text-[12.5px] font-light text-slate-500">
                Скоро — партньорство с български магазин за кристали.
              </Text>
            </View>

            {canCollect && (
              <Pressable
                onPress={onCollect}
                disabled={collecting}
                className="mt-6 w-full items-center rounded-full border border-amber-300/50 bg-amber-400/15 px-6 py-4"
                style={({ pressed }) => ({
                  ...pressFeedback(pressed),
                  opacity: pressed || collecting ? 0.6 : 1,
                })}
              >
                <Text className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-100">
                  {collecting ? 'Събира се...' : 'Събери в колекцията'}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  )
}

function DetailStat({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={{ width: full ? '100%' : '45%' }}>
      <Text className="font-cinzel text-[9px] uppercase tracking-[0.28em] text-slate-500">{label}</Text>
      <Text className="mt-1 text-[13.5px] text-slate-200">{value}</Text>
    </View>
  )
}
