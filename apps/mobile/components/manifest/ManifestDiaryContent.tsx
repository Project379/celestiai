import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'

import { getLunarPhase, type LunarPhase } from '@stellaeum/core/moon-phase'

import { ManifestEntryForm } from './ManifestEntryForm'
import { ManifestHistory } from './ManifestHistory'
import { useManifestEntries } from '@/hooks/useManifestEntries'

const BG_DATE = new Intl.DateTimeFormat('bg-BG', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Sofia',
})

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Лунен дневник root — hero + form + history + footer. Mobile port of
 * apps/web/components/manifest/ManifestDiaryContent.tsx (P.4-c1).
 *
 * Live phase state refreshed every minute so the prompt follows the sky
 * (same cadence as web). Ambient SVG radial-gradient overlays at the hero
 * block per HT 7 ratification (mobile editorial visual parity); P.2-e
 * WheelArrivalContainer's gradient pattern reused. No framer-motion entry
 * animations per HT 8 (data-display screen).
 */
export function ManifestDiaryContent() {
  const [phase, setPhase] = useState<LunarPhase>(() => getLunarPhase())
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date()
      setNow(d)
      setPhase(getLunarPhase(d))
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = useMemo(() => isoDate(now), [now])
  const todayFormatted = BG_DATE.format(now)

  const { entries, isLoaded, error, saveEntry, findByDate, clearError } =
    useManifestEntries()
  const existingToday = findByDate(today)
  const entryCountForPhase = useMemo(
    () => entries.filter((e) => e.phaseId === phase.id).length,
    [entries, phase.id],
  )

  const handleSave = (intentions: [string, string, string]) => {
    saveEntry({
      date: today,
      phaseId: phase.id,
      phaseName: phase.name,
      intentions,
    })
  }

  return (
    <View>
      {/* Editorial hero with ambient SVG atmosphere (HT 7 — radial-gradient
          overlays mirror P.2-e WheelArrivalContainer pattern; static opacity
          rather than animated). */}
      <View className="relative mb-12">
        <View
          pointerEvents="none"
          className="absolute"
          style={{ left: -120, top: -120, width: 360, height: 360, opacity: 0.7 }}
        >
          <Svg width={360} height={360}>
            <Defs>
              <RadialGradient id="diaryHeroViolet" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"  stopColor="rgba(167,139,250,1)" stopOpacity="0.10" />
                <Stop offset="55%" stopColor="rgba(167,139,250,1)" stopOpacity="0.04" />
                <Stop offset="85%" stopColor="rgba(0,0,0,0)"        stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="360" height="360" fill="url(#diaryHeroViolet)" />
          </Svg>
        </View>
        <View
          pointerEvents="none"
          className="absolute"
          style={{ right: -80, top: 40, width: 220, height: 220, opacity: 0.6 }}
        >
          <Svg width={220} height={220}>
            <Defs>
              <RadialGradient id="diaryHeroAmber" cx="50%" cy="50%" r="50%">
                <Stop offset="0%"  stopColor="rgba(251,191,36,1)" stopOpacity="0.07" />
                <Stop offset="55%" stopColor="rgba(251,191,36,1)" stopOpacity="0.025" />
                <Stop offset="85%" stopColor="rgba(0,0,0,0)"       stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="220" height="220" fill="url(#diaryHeroAmber)" />
          </Svg>
        </View>

        <View className="flex-row items-center" style={{ gap: 12 }}>
          <View className="h-px w-5 bg-slate-300/40" />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Лунен дневник · Манифестация
          </Text>
        </View>

        <Text className="mt-5 text-[28px] leading-[1.2] tracking-tight">
          <Text className="font-light text-slate-300">Три реда, </Text>
          <Text className="font-semibold text-amber-200/95">един цикъл.</Text>
        </Text>

        <Text className="mt-5 text-[15.5px] font-light leading-[1.85] text-slate-300">
          Стара практика, пренаписана за този цикъл: ден след ден, по три реда, водени от луната. Нарастващата половина сее намерения; намаляващата освобождава и благодари.
        </Text>

        <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 10 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-slate-300">
            {todayFormatted}
          </Text>
          <View className="h-[3px] w-[3px] rotate-45 bg-slate-400/80" />
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <Text className="text-[12px] leading-none text-amber-200/90">☾</Text>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-200/90">
              {phase.name} · {phase.illumination}%
            </Text>
          </View>
        </View>
      </View>

      {error && (
        <View
          className="mb-8 flex-row items-start rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-5 py-4"
          style={{ gap: 12 }}
          accessibilityRole="alert"
        >
          <Text className="flex-1 text-[13px] leading-[1.7] text-rose-300/90">
            {error.message}
          </Text>
          <Pressable
            onPress={clearError}
            accessibilityLabel="Затвори"
            hitSlop={12}
            className="rounded-full px-2 py-1"
          >
            <Text className="font-cinzel text-[11px] text-rose-300/70">✕</Text>
          </Pressable>
        </View>
      )}

      <View className="mb-14">
        {!isLoaded ? (
          <Text className="text-[14px] text-slate-500">Разгръщам дневника...</Text>
        ) : (
          <ManifestEntryForm
            phase={phase}
            today={todayFormatted}
            existing={existingToday}
            entryCountForPhase={entryCountForPhase}
            onSave={handleSave}
          />
        )}
      </View>

      <View>
        <View className="mb-6 flex-row items-baseline" style={{ gap: 16 }}>
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-300">
            Предишни страници
          </Text>
          <View className="h-px flex-1 bg-slate-300/15" />
          <Text className="font-cinzel text-[9.5px] text-slate-500">
            {entries.length} {entries.length === 1 ? 'запис' : 'записа'}
          </Text>
        </View>

        {isLoaded && (
          <ManifestHistory entries={entries} currentDate={today} />
        )}
      </View>

      <View className="mt-16 border-t border-slate-300/[0.07] pt-8">
        <Text className="text-[14px] font-light leading-[1.85] text-slate-500">
          За повече за лунните фази и ритуалите към тях виж{' '}
          <Text className="font-medium text-amber-300">Ръководството</Text>
          .
        </Text>
      </View>
    </View>
  )
}
