'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CrystalGem, type GemVariant } from './CrystalGem'

interface DailyRow {
  date: string
  crystal_id: string
  slug: string | null
  name_bg: string | null
  name_en: string | null
  color_primary: string | null
  color_secondary: string | null
  color_accent: string | null
  svg_variant: string | null
}

interface DailyStreakPayload {
  streak: { current: number; longest: number; totalDays: number } | null
  days: DailyRow[]
  today: string
}

interface TodayCrystal {
  slug: string
  name_en: string
  name_bg: string | null
  tagline_en: string
  tagline_bg: string | null
  description_en: string
  description_bg: string | null
  color_primary: string
  color_secondary: string
  color_accent: string | null
  svg_variant: string
  rarity: string
}

interface TodayPayload {
  crystal: TodayCrystal
  collectedToday: boolean
  isPremium: boolean
}

const DOTS_TO_SHOW = 30
const LATEST_VISIBLE = 8

function daysBefore(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'short',
})

function formatShort(iso: string): string {
  return BG_DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`))
}

export function DailyStreakPanel() {
  const [streakData, setStreakData] = useState<DailyStreakPayload | null>(null)
  const [today, setToday] = useState<TodayPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [streakRes, todayRes] = await Promise.all([
        fetch('/api/crystals/daily-streak', { cache: 'no-store' }),
        fetch('/api/crystals/today', { cache: 'no-store' }),
      ])
      if (!streakRes.ok) throw new Error(`streak HTTP ${streakRes.status}`)
      if (!todayRes.ok) throw new Error(`today HTTP ${todayRes.status}`)
      setStreakData((await streakRes.json()) as DailyStreakPayload)
      setToday((await todayRes.json()) as TodayPayload)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-500/[0.04] px-6 py-8 text-center">
        <p className="font-display text-[15px] text-red-200/90">{error}</p>
      </div>
    )
  }

  if (!streakData || !today) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center">
        <p className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-500">
          Зареждане на серията...
        </p>
      </div>
    )
  }

  const byDate = new Map(streakData.days.map((d) => [d.date, d]))
  const dots: { date: string; hit: DailyRow | null }[] = []
  for (let i = DOTS_TO_SHOW - 1; i >= 0; i--) {
    const date = daysBefore(streakData.today, i)
    dots.push({ date, hit: byDate.get(date) ?? null })
  }

  const streak = streakData.streak ?? { current: 0, longest: 0, totalDays: 0 }
  const hasHistory = streakData.days.length > 0
  const latestDays = streakData.days.slice(0, LATEST_VISIBLE)
  const crystal = today.crystal

  return (
    <div className="relative">
      {/* ── Today's stone — compact editorial card ──────────────────── */}
      <section className="relative rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-5 sm:px-6 sm:py-6">
        {/* Ambient crystal-color glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 top-0 -z-10 h-[200px] w-[200px] rounded-full opacity-[0.18] blur-[80px]"
          style={{ background: crystal.color_primary }}
        />

        <div className="flex items-start gap-5 sm:gap-6">
          <motion.div
            animate={{ rotate: [0, 3, -3, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="flex-shrink-0 drop-shadow-[0_0_24px_rgba(167,139,250,0.18)]"
          >
            <CrystalGem
              variant={crystal.svg_variant as GemVariant}
              primary={crystal.color_primary}
              secondary={crystal.color_secondary}
              accent={crystal.color_accent}
              size={84}
              seed={crystal.slug}
            />
          </motion.div>

          <div className="min-w-0 flex-1 pt-0.5">
            <p className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.36em] text-amber-300/90">
              Днешният камък
            </p>
            <h2 className="mt-1.5 font-display text-[1.25rem] font-semibold leading-tight sm:text-[1.4rem]">
              <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,191,36,0.18)]">
                {crystal.name_bg ?? crystal.name_en}
              </span>
            </h2>
            <p className="mt-1 font-display text-[12px] font-light italic text-slate-400">
              {crystal.tagline_bg ?? crystal.tagline_en}
            </p>

            {today.collectedToday && (
              <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/[0.06] px-3.5 py-1.5 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.3em] text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                Събран днес
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Streak counter — compact row ────────────────────────────── */}
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.38em] text-amber-300/90">
              Ежедневна серия
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-display text-[36px] font-semibold leading-none tracking-tight sm:text-[44px]">
                <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,0.2)]">
                  {streak.current}
                </span>
              </span>
              <span className="font-display text-[13px] font-light italic text-slate-400">
                {streak.current === 1 ? 'ден' : 'поредни дни'}
              </span>
            </div>
          </div>

          <div className="flex gap-6">
            <StatPill label="Най-дълга" value={streak.longest} />
            <StatPill label="Общо дни" value={streak.totalDays} />
          </div>
        </div>

        <p className="mt-3 max-w-lg font-display text-[12.5px] font-light italic leading-[1.75] text-slate-500">
          Днешният камък се събира сам, щом отвориш таблото. Върни се утре, за да удължиш серията — пропуснеш ли ден, тя се нулира.
        </p>

        {/* Dot strip — last 30 days */}
        <div className="relative mt-5">
          <div className="flex flex-wrap gap-1.5">
            {dots.map((cell) => {
              const isToday = cell.date === streakData.today
              const color = cell.hit?.color_primary ?? null
              return (
                <span
                  key={cell.date}
                  title={`${formatShort(cell.date)}${cell.hit ? ` — ${cell.hit.name_bg ?? cell.hit.name_en ?? ''}` : ''}`}
                  className={[
                    'relative h-4 w-4 rounded-full border transition-all duration-300',
                    cell.hit
                      ? 'border-amber-300/40'
                      : 'border-white/[0.08] bg-white/[0.02]',
                    isToday
                      ? 'ring-1 ring-amber-300/60 ring-offset-2 ring-offset-[#0b0816]'
                      : '',
                  ].join(' ')}
                  style={
                    cell.hit
                      ? {
                          background: `radial-gradient(circle, ${color ?? '#fbbf24'}70 0%, ${color ?? '#fbbf24'}10 80%)`,
                          boxShadow: `0 0 8px ${color ?? '#fbbf24'}30`,
                        }
                      : undefined
                  }
                  aria-label={`${cell.date}${cell.hit ? ' — събран' : ' — пропуснат'}`}
                />
              )
            })}
          </div>
          <p className="mt-2.5 font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-600">
            Последни 30 дни · отляво надясно
          </p>
        </div>
      </section>

      {/* ── Latest daily crystals strip ─────────────────────────────── */}
      {hasHistory && (
        <section className="mt-10">
          <p className="mb-4 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
            Камъни от серията
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {latestDays.map((day, i) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="group relative flex flex-col items-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] px-4 pb-4 pt-5 text-center transition-colors duration-300 hover:border-amber-300/25 hover:bg-white/[0.04]"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 opacity-40"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${day.color_primary ?? '#fbbf24'}20, transparent 65%)`,
                  }}
                />
                <motion.div
                  animate={{ rotate: [0, 2, -2, 0] }}
                  transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  {day.svg_variant && day.color_primary && day.color_secondary ? (
                    <CrystalGem
                      variant={day.svg_variant as GemVariant}
                      primary={day.color_primary}
                      secondary={day.color_secondary}
                      accent={day.color_accent}
                      size={68}
                      seed={day.slug ?? day.crystal_id}
                    />
                  ) : null}
                </motion.div>
                <p className="mt-2 font-display text-[13px] font-medium text-slate-100">
                  {day.name_bg ?? day.name_en}
                </p>
                <p className="mt-0.5 font-cinzel text-[9px] uppercase tracking-[0.3em] text-slate-500">
                  {formatShort(day.date)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-left">
      <p className="font-cinzel text-[9px] uppercase tracking-[0.32em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-display text-[20px] font-semibold text-slate-200">
        {value}
      </p>
    </div>
  )
}
