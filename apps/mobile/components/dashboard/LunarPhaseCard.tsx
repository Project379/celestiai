import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { getLunarPhase, type LunarPhase } from '@stellaeum/core/moon-phase'
import {
  daysUntilPeak,
  getActiveMeteorShower,
  getNextMeteorShower,
  type MeteorShower,
} from '@stellaeum/core/welcome'

import { MoonDisc } from './MoonDisc'
import { useGuardedNavigation } from '@/hooks/useGuardedNavigation'

const BG_MONTHS = [
  'януари', 'февруари', 'март', 'април', 'май', 'юни',
  'юли', 'август', 'септември', 'октомври', 'ноември', 'декември',
]

function formatMonthDay(month: number, day: number): string {
  return `${day} ${BG_MONTHS[month - 1]}`
}

function formatDaysHours(daysFrac: number): string {
  const totalHours = Math.max(0, Math.round(daysFrac * 24))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const dayStr = days === 0 ? '' : days === 1 ? '1 ден' : `${days} дни`
  const hourStr = hours === 0 ? '' : hours === 1 ? '1 час' : `${hours} часа`
  if (dayStr && hourStr) return `${dayStr} и ${hourStr}`
  if (dayStr) return dayStr
  if (hourStr) return hourStr
  return 'по-малко от час'
}

/**
 * Ритъм · Лунна фаза · Манифестация — current lunar phase + manifesting
 * guidance + meteor banner + info expander. Mobile port of
 * apps/web/components/dashboard/LunarPhaseCard.tsx (P.3-b).
 *
 * Live-updates every 60 seconds so phase + meteor shower windows stay
 * fresh without reload. Two togglable expanders:
 *   1. «Разкрий как да манифестираш» — reveals 6 manifesting fields,
 *      next major event countdown, next upcoming meteor (when no active).
 *   2. «За лунните фази» — 8-phase narrative + 2-column wax/wane legend.
 *
 * AnimatePresence height transitions on the expanders dropped per HT 8
 * (data-display screen discipline pattern). Conditional render only.
 */
export function LunarPhaseCard() {
  const { push } = useGuardedNavigation()
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [shower, setShower] = useState<MeteorShower | null>(() => getActiveMeteorShower())
  const [upcoming, setUpcoming] = useState(() => getNextMeteorShower())
  const [expanded, setExpanded] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setPhase(getLunarPhase(now))
      setShower(getActiveMeteorShower(now))
      setUpcoming(getNextMeteorShower(now))
    }
    const interval = setInterval(tick, 60_000)
    return () => clearInterval(interval)
  }, [])

  const next = phase.nextMajor
  const countdown =
    next.daysAway < 1 / 24 ? 'съвсем скоро' : formatDaysHours(next.daysAway)
  const showerPeakDays = shower ? daysUntilPeak(shower) : null

  return (
    <View className="relative mb-16">
      {/* Ambient atmosphere — SVG radial-gradient overlays, static opacity
          per the established P.4-c1 / P.2-e pattern. */}
      <View
        pointerEvents="none"
        className="absolute"
        style={{ left: -80, top: 0, width: 280, height: 280, opacity: 0.7 }}
      >
        <Svg width={280} height={280}>
          <Defs>
            <RadialGradient id="lunarHeroViolet" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"  stopColor="rgba(167,139,250,1)" stopOpacity="0.10" />
              <Stop offset="55%" stopColor="rgba(167,139,250,1)" stopOpacity="0.035" />
              <Stop offset="85%" stopColor="rgba(0,0,0,0)"        stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="280" height="280" fill="url(#lunarHeroViolet)" />
        </Svg>
      </View>
      <View
        pointerEvents="none"
        className="absolute"
        style={{ right: -40, bottom: 0, width: 180, height: 180, opacity: 0.6 }}
      >
        <Svg width={180} height={180}>
          <Defs>
            <RadialGradient id="lunarHeroAmber" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%"  stopColor="rgba(251,191,36,1)" stopOpacity="0.07" />
              <Stop offset="55%" stopColor="rgba(251,191,36,1)" stopOpacity="0.025" />
              <Stop offset="85%" stopColor="rgba(0,0,0,0)"       stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="180" height="180" fill="url(#lunarHeroAmber)" />
        </Svg>
      </View>

      {/* Eyebrow */}
      <Text className="mb-5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300/90">
        Лунна фаза · Манифестация
      </Text>

      {/* Main row: moon disc + phase info */}
      <View className="flex-row items-start" style={{ gap: 20 }}>
        <Pressable onPress={() => setExpanded((v) => !v)} accessibilityRole="button">
          <MoonDisc phaseFraction={phase.phaseFraction} size={108} />
        </Pressable>

        <View className="flex-1 pt-1">
          <Text className="text-[24px] font-semibold leading-tight text-amber-200/95">
            {phase.name}
          </Text>
          <Text className="mt-1.5 font-cinzel text-[10px] font-medium uppercase tracking-[0.32em] text-slate-300/90">
            {phase.latin} · {phase.illumination}% осветление
          </Text>
          <Text className="mt-4 text-[16px] font-light leading-[1.8] text-slate-200/95">
            {phase.intention}.
          </Text>

          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            className="mt-4 flex-row items-center"
            style={{ gap: 8 }}
          >
            <View className="h-px w-6 bg-slate-300/80" />
            <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200">
              {expanded ? 'Скрий манифеста' : 'Разкрий как да манифестираш'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Active meteor shower banner */}
      {shower && (
        <View className="mt-7 rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-5 py-4">
          <View className="flex-row flex-wrap items-center" style={{ gap: 10 }}>
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
              Активен метеорен поток
            </Text>
            <View className="h-px w-8 bg-amber-300/60" />
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-300/90">
              {shower.name} · {shower.latin}
            </Text>
          </View>
          <Text className="mt-2 text-[14.5px] leading-[1.8] text-slate-200/95">
            {shower.description}
          </Text>
          <Text className="mt-2 font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-300/85">
            Върхова нощ: {formatMonthDay(shower.peakMonth, shower.peakDay)}
            {showerPeakDays !== null && (
              <Text className="text-slate-500">
                {'  ·  '}
                <Text className="text-slate-300/85">
                  {showerPeakDays === 0
                    ? 'тази нощ'
                    : showerPeakDays > 0
                    ? `след ${showerPeakDays} ${showerPeakDays === 1 ? 'ден' : 'дни'}`
                    : `${Math.abs(showerPeakDays)} ${Math.abs(showerPeakDays) === 1 ? 'ден' : 'дни'} след върха`}
                </Text>
              </Text>
            )}
            <Text className="text-slate-500">{'  ·  '}</Text>
            <Text className="text-slate-300/85">до {shower.zhr} метеора на час</Text>
          </Text>
        </View>
      )}

      {/* Disclosure panel — manifesting guidance */}
      {expanded && (
        <View className="mt-7 border-t border-slate-300/[0.08] pt-7" style={{ gap: 28 }}>
          <ManifestField label="Физическо изражение" body={phase.physicalAppearance} />

          <View style={{ gap: 28 }}>
            <ManifestField label="Подходящо за" body={phase.bestFor} />
            <ManifestField label="Афирмация" body={`„${phase.affirmation}"`} />
            <ManifestField label="Кристал" body={phase.crystal} />
            <ManifestField label="Ритуал" body={phase.ritual} />
          </View>

          <ManifestField label="Въпрос за дневника" body={phase.journalPrompt} />

          <View>
            <View className="mb-2 flex-row items-baseline" style={{ gap: 12 }}>
              <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                Следваща повратна точка
              </Text>
              <View className="h-px flex-1 bg-slate-400/25" />
            </View>
            <Text className="text-[15px] text-slate-200/95">
              <Text className="mr-2 text-amber-300/70">☾ </Text>
              <Text className="text-slate-100">{next.name}</Text>
              <Text className="text-slate-500">{'  ·  '}</Text>
              <Text>след {countdown}</Text>
            </Text>
          </View>

          {!shower && upcoming && upcoming.daysAway <= 60 && (
            <View>
              <View className="mb-2 flex-row items-baseline" style={{ gap: 12 }}>
                <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                  Следващ метеорен поток
                </Text>
                <View className="h-px flex-1 bg-slate-400/25" />
              </View>
              <Text className="text-[15px] text-slate-200/95">
                <Text className="text-slate-100">{upcoming.shower.name}</Text>
                <Text className="text-slate-500">{'  ·  '}</Text>
                <Text>
                  връх {formatMonthDay(upcoming.shower.peakMonth, upcoming.shower.peakDay)}, след{' '}
                  {upcoming.daysAway} {upcoming.daysAway === 1 ? 'ден' : 'дни'}
                </Text>
              </Text>
            </View>
          )}

          <Text className="text-[14px] leading-[1.8] text-slate-300/90">
            Научи повече за манифестирането с луната в{' '}
            <Text
              onPress={() => push('/you/guide')}
              className="font-medium text-amber-300 underline"
            >
              Ръководството
            </Text>
            .
          </Text>
        </View>
      )}

      {/* Info expander toggle */}
      <View className="mt-6 flex-row justify-end">
        <Pressable
          onPress={() => setInfoOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: infoOpen }}
          className="flex-row items-center"
          style={{ gap: 8 }}
        >
          <View className="h-[18px] w-[18px] items-center justify-center rounded-full border border-slate-300/40">
            <Text className="text-[11px] text-slate-200">i</Text>
          </View>
          <Text className="font-cinzel text-[9.5px] font-medium uppercase tracking-[0.3em] text-slate-300">
            За лунните фази
          </Text>
        </Pressable>
      </View>

      {infoOpen && (
        <View className="mt-4 rounded-xl border border-slate-300/[0.08] bg-slate-900/30 px-5 py-4">
          <Text className="text-[14px] leading-[1.85] text-slate-200/95">
            Лунните фази са осемте етапа от цикъла на Луната, който продължава около 29 дни и 12 часа. Нарастващата половина (от новолуние до пълнолуние) подкрепя изграждането; намаляващата половина (от пълнолуние до следващото новолуние) освобождаването.
          </Text>

          <View className="mt-4 flex-row" style={{ gap: 32 }}>
            <View className="flex-1">
              <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
                Нарастваща
              </Text>
              <View style={{ gap: 4 }}>
                <Text className="text-[13.5px] text-slate-200/90">Новолуние</Text>
                <Text className="text-[13.5px] text-slate-200/90">Изгряващ полумесец</Text>
                <Text className="text-[13.5px] text-slate-200/90">Първа четвърт</Text>
                <Text className="text-[13.5px] text-slate-200/90">Растяща луна</Text>
              </View>
            </View>
            <View className="flex-1">
              <Text className="mb-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-indigo-300/85">
                Намаляваща
              </Text>
              <View style={{ gap: 4 }}>
                <Text className="text-[13.5px] text-slate-200/90">Пълнолуние</Text>
                <Text className="text-[13.5px] text-slate-200/90">Намаляваща луна</Text>
                <Text className="text-[13.5px] text-slate-200/90">Последна четвърт</Text>
                <Text className="text-[13.5px] text-slate-200/90">Залязващ полумесец</Text>
              </View>
            </View>
          </View>

          <Text className="mt-4 text-[13px] leading-[1.7] text-slate-300/90">
            Цялата глава за лунните фази — задача и облик за всяка от осемте — намираш в{' '}
            <Text
              onPress={() => push('/you/guide')}
              className="font-medium text-amber-300 underline"
            >
              Ръководството
            </Text>
            .
          </Text>
        </View>
      )}
    </View>
  )
}

function ManifestField({ label, body }: { label: string; body: string }) {
  return (
    <View>
      <Text className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-300/85">
        {label}
      </Text>
      <Text className="text-[14.5px] font-light leading-[1.85] text-slate-200/95">
        {body}
      </Text>
    </View>
  )
}
