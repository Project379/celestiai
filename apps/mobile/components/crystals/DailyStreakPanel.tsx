import { Text, View } from 'react-native'

import { useCrystalDailyStreak } from '@/hooks/useCrystalDailyStreak'
import { useCrystalOfTheDay } from '@/hooks/useCrystalOfTheDay'
import { pluralizeBg } from '@stellaeum/core/i18n/bg-grammar'
import { CrystalGem, type GemVariant } from './CrystalGem'

const DOTS_TO_SHOW = 30
const LATEST_VISIBLE = 8

function daysBefore(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', { day: 'numeric', month: 'short' })

function formatShort(iso: string): string {
  return BG_DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`))
}

/**
 * Дневна серия tab content. Mobile port of
 * apps/web/components/crystals/DailyStreakPanel.tsx — 30-day dot strip +
 * stat pills + latest-days grid. framer-motion stagger/sway dropped per
 * data-display discipline; dot `title` tooltip (no RN equivalent) becomes
 * an accessibilityLabel.
 */
export function DailyStreakPanel() {
  const { data: today } = useCrystalOfTheDay()
  const { data: streakData, isLoading } = useCrystalDailyStreak(true)

  if (!streakData || !today) {
    return (
      <View className="items-center py-16">
        <Text className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-500">
          {isLoading ? 'Зареждане на серията...' : 'Не се получи зареждането.'}
        </Text>
      </View>
    )
  }

  const byDate = new Map(streakData.days.map((d) => [d.date, d]))
  const dots: { date: string; hit: (typeof streakData.days)[number] | null }[] = []
  for (let i = DOTS_TO_SHOW - 1; i >= 0; i--) {
    const date = daysBefore(streakData.today, i)
    dots.push({ date, hit: byDate.get(date) ?? null })
  }

  const streak = streakData.streak ?? { current: 0, longest: 0, totalDays: 0 }
  const latestDays = streakData.days.slice(0, LATEST_VISIBLE)
  const crystal = today.crystal

  return (
    <View>
      <View className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5">
        <View className="flex-row items-start" style={{ gap: 16 }}>
          <CrystalGem
            variant={crystal.svg_variant as GemVariant}
            primary={crystal.color_primary}
            secondary={crystal.color_secondary}
            accent={crystal.color_accent}
            size={68}
            seed={crystal.slug}
          />
          <View className="min-w-0 flex-1 pt-0.5">
            <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.36em] text-amber-300/90">
              Днешният камък
            </Text>
            <Text className="mt-1.5 text-[17px] font-semibold leading-tight text-slate-100">
              {crystal.name_bg ?? crystal.name_en}
            </Text>
            <Text className="mt-1 text-[12px] font-light text-slate-400">
              {crystal.tagline_bg ?? crystal.tagline_en}
            </Text>
            {today.collectedToday && (
              <View className="mt-3 flex-row items-center self-start rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-3.5 py-1.5" style={{ gap: 8 }}>
                <View className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                  Събран днес
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View className="mt-8">
        <View className="flex-row flex-wrap items-end justify-between" style={{ gap: 20 }}>
          <View>
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Ежедневна серия
            </Text>
            <View className="mt-2 flex-row items-baseline" style={{ gap: 10 }}>
              <Text className="text-[36px] font-semibold leading-none text-slate-100">
                {streak.current}
              </Text>
              <Text className="text-[13px] font-light text-slate-400">
                {pluralizeBg(streak.current, 'ден', 'поредни дни')}
              </Text>
            </View>
          </View>

          <View className="flex-row" style={{ gap: 24 }}>
            <StatPill label="Най-дълга" value={streak.longest} />
            <StatPill label="Общо дни" value={streak.totalDays} />
          </View>
        </View>

        <Text className="mt-3 text-[12.5px] font-light leading-[1.75] text-slate-500">
          Днешният камък се събира сам, щом отвориш екрана. Върни се утре, за да удължиш серията — пропуснеш ли ден, тя се нулира.
        </Text>

        <View className="mt-5 flex-row flex-wrap" style={{ gap: 6 }}>
          {dots.map((cell) => {
            const isToday = cell.date === streakData.today
            return (
              <View
                key={cell.date}
                accessibilityLabel={`${formatShort(cell.date)}${cell.hit ? ` — ${cell.hit.name_bg ?? cell.hit.name_en ?? ''}` : ' — пропуснат'}`}
                className={`h-4 w-4 rounded-full border ${
                  cell.hit ? 'border-amber-300/40' : 'border-white/[0.08] bg-white/[0.02]'
                } ${isToday ? 'ring-1 ring-amber-300/60' : ''}`}
                style={
                  cell.hit
                    ? { backgroundColor: `${cell.hit.color_primary ?? '#fbbf24'}55` }
                    : undefined
                }
              />
            )
          })}
        </View>
        <Text className="mt-2.5 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-600">
          Последни 30 дни · отляво надясно
        </Text>
      </View>

      {latestDays.length > 0 && (
        <View className="mt-10">
          <Text className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
            Камъни от серията
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 12 }}>
            {latestDays.map((day) => (
              <View
                key={day.date}
                className="min-w-[46%] flex-1 items-center rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-4 pt-5"
              >
                {day.svg_variant && day.color_primary && day.color_secondary ? (
                  <CrystalGem
                    variant={day.svg_variant as GemVariant}
                    primary={day.color_primary}
                    secondary={day.color_secondary}
                    accent={day.color_accent}
                    size={56}
                    seed={day.slug ?? day.crystal_id}
                  />
                ) : null}
                <Text className="mt-2 text-[13px] font-medium text-slate-100">
                  {day.name_bg ?? day.name_en}
                </Text>
                <Text className="mt-0.5 font-cinzel text-[9px] uppercase tracking-[0.3em] text-slate-500">
                  {formatShort(day.date)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View>
      <Text className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
        {label}
      </Text>
      <Text className="mt-1 text-[20px] font-semibold text-slate-200">{value}</Text>
    </View>
  )
}
