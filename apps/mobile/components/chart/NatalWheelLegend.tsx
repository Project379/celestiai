import { useCallback, useEffect, useState } from 'react'
import { BackHandler, Pressable, Text, View } from 'react-native'

import { PLANET_GLYPHS, ZODIAC_GLYPHS } from '@stellaeum/astrology/client'

const LEGEND_ZODIAC_KEYS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo'] as const
const LEGEND_PLANET_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars'] as const

/**
 * Карта · Легенда — wheel-overlay tooltip explaining wheel elements (zodiac,
 * houses, planets, aspects, angles, retrograde marker). Tap the `i` button
 * top-right of the wheel to open; tap backdrop or Android hardware back
 * (BackHandler) to close.
 *
 * Mirrors apps/web/components/chart/NatalWheelLegend.tsx (P.2-d). CelestialIcons
 * fallback (Halt-trigger 5): PLANET_GLYPHS + ZODIAC_GLYPHS unicode in Cinzel.
 *
 * Overlay pattern: absolute-positioned View + Pressable backdrop rather than
 * RN Modal — keeps the legend visually anchored to the wheel position and
 * avoids RN Modal's focus-trap quirks. BackHandler wired for Android parity
 * with Modal's onRequestClose (Halt-trigger 7).
 */
export function NatalWheelLegend() {
  const [open, setOpen] = useState(false)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close()
      return true
    })
    return () => subscription.remove()
  }, [open, close])

  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel="Легенда на наталната карта"
        accessibilityRole="button"
        className="absolute right-3 top-3 z-50 h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-[#08060f]/85"
      >
        <Text className="font-cinzel text-[11px] font-semibold text-slate-300">i</Text>
      </Pressable>

      {open && (
        <>
          <Pressable
            onPress={close}
            accessibilityLabel="Затвори легендата"
            className="absolute inset-0 z-40"
          />
          <View
            className="absolute right-3 top-14 z-50 w-[320px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0915]"
          >
            <View className="px-5 py-5">
              <View className="mb-4 flex-row items-center" style={{ gap: 10 }}>
                <View className="h-1 w-1 rotate-45 bg-amber-300/90" />
                <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-amber-300/80">
                  Легенда
                </Text>
              </View>

              <LegendRow
                renderIcon={() => (
                  <View className="flex-row items-center" style={{ gap: 2 }}>
                    {LEGEND_ZODIAC_KEYS.map((key) => (
                      <Text key={key} className="font-cinzel text-[12px] text-slate-200/85">
                        {ZODIAC_GLYPHS[key]}
                      </Text>
                    ))}
                  </View>
                )}
                term="Зодиак"
                description="12 знака по външния пояс — показват в кой знак попада всяка планета."
                isFirst
              />

              <LegendRow
                renderIcon={() => (
                  <Text className="font-cinzel text-[10px] font-semibold text-amber-300/80">
                    1–12
                  </Text>
                )}
                term="Домове"
                description={
                  <>
                    12 житейски сфери — домът казва{' '}
                    <Text className="text-slate-300">къде</Text> действа планетата.
                  </>
                }
              />

              <LegendRow
                renderIcon={() => (
                  <View className="flex-row items-center" style={{ gap: 2 }}>
                    {LEGEND_PLANET_KEYS.map((key) => (
                      <Text key={key} className="font-cinzel text-[12px] text-slate-200/85">
                        {PLANET_GLYPHS[key]}
                      </Text>
                    ))}
                  </View>
                )}
                term="Планети"
                description="Всяка носи жизнен принцип. Натисни за тълкуване."
              />

              <LegendRow
                renderIcon={() => (
                  <View style={{ gap: 4 }} className="py-1">
                    <View className="h-px w-6 bg-emerald-400/80" />
                    <View className="h-px w-6 bg-rose-400/80" />
                  </View>
                )}
                term="Аспекти"
                description="Линиите в центъра — зелено е хармония, розово е напрежение."
              />

              <LegendRow
                renderIcon={() => (
                  <View style={{ gap: 4 }} className="py-1">
                    <View className="h-px w-6 bg-cyan-400/80" />
                    <View className="h-px w-6 bg-pink-400/80" />
                  </View>
                )}
                term="Ъгли"
                description={
                  <>
                    Асцендент <Text className="text-slate-300">(персона)</Text> и Медиум Цели{' '}
                    <Text className="text-slate-300">(цел)</Text>.
                  </>
                }
              />

              <LegendRow
                renderIcon={() => (
                  <View className="h-5 w-5 items-center justify-center">
                    <Text className="font-cinzel text-[10px] font-bold text-rose-300/90">R</Text>
                  </View>
                )}
                term="Ретрограден"
                description="Планетата изглежда движеща се назад — по-вътрешна енергия."
              />

              <View className="mt-4 border-t border-white/[0.05] pt-3">
                <Text className="font-cinzel text-[8.5px] font-semibold uppercase tracking-[0.28em] text-slate-600">
                  За детайли → раздел Речник
                </Text>
              </View>
            </View>
          </View>
        </>
      )}
    </>
  )
}

interface LegendRowProps {
  renderIcon: () => React.ReactNode
  term: string
  description: React.ReactNode
  isFirst?: boolean
}

function LegendRow({ renderIcon, term, description, isFirst }: LegendRowProps) {
  return (
    <View
      className={`flex-row items-start py-3 ${isFirst ? '' : 'border-t border-white/[0.05]'}`}
      style={{ gap: 16 }}
    >
      <View className="w-14 items-start">{renderIcon()}</View>
      <View className="flex-1">
        <Text className="text-[13px] font-semibold text-slate-100">{term}</Text>
        <Text className="mt-0.5 text-[12px] leading-snug text-slate-300/90">
          {description}
        </Text>
      </View>
    </View>
  )
}
