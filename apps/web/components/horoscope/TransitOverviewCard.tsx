'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { ASPECTS_BG, PLANETS_BG, ZODIAC_SIGNS_BG } from '@celestia/astrology/client'
import type { Planet } from '@celestia/astrology/client'
import type {
  ActiveTransitDetail,
  LunarEventDetail,
  UpcomingTransitDetail,
} from '@/lib/horoscope/transit-analysis'
import { useTransitOverview } from '@/hooks/useTransitOverview'

interface TransitOverviewCardProps {
  chartId: string
}

type TransitEvent = ActiveTransitDetail | UpcomingTransitDetail | LunarEventDetail

const BG_DATETIME_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Sofia',
})

function formatDateTime(value: string): string {
  return BG_DATETIME_FORMAT.format(new Date(value))
}

function formatActiveTransit(item: ActiveTransitDetail): string {
  return `${PLANETS_BG[item.transitPlanet as Planet]} ${ASPECTS_BG[item.aspect]} ${PLANETS_BG[item.natalPlanet as Planet]}`
}

function formatUpcoming(item: UpcomingTransitDetail): string {
  return `${PLANETS_BG[item.transitPlanet]} ${ASPECTS_BG[item.aspect]} ${PLANETS_BG[item.natalPlanet]}`
}

function bgPrep(prep: 'в' | 'с', nextWord: string): string {
  if (prep === 'в') return /^[вВфФ]/.test(nextWord) ? 'във' : 'в'
  return /^[сСзЗ]/.test(nextWord) ? 'със' : 'с'
}

function formatLunarEvent(item: LunarEventDetail): string {
  const signName = ZODIAC_SIGNS_BG[item.sign]
  const base = `${item.type === 'new_moon' ? 'Новолуние' : 'Пълнолуние'} ${bgPrep('в', signName)} ${signName}`

  if (item.aspects.length === 0) return base

  return `${base} · ${item.aspects
    .slice(0, 2)
    .map((aspect) => `${ASPECTS_BG[aspect.aspect]} ${PLANETS_BG[aspect.natalPlanet]}`)
    .join(', ')}`
}

function PacingBadge({
  emphasis,
}: {
  emphasis: 'fast' | 'slow' | 'mixed' | 'quiet'
}) {
  const label =
    emphasis === 'fast'
      ? 'Бърз ритъм'
      : emphasis === 'slow'
      ? 'Бавен ритъм'
      : emphasis === 'mixed'
      ? 'Смесен ритъм'
      : 'Тих ден'

  const className =
    emphasis === 'fast'
      ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
      : emphasis === 'slow'
      ? 'bg-sky-500/10 text-sky-300 ring-sky-500/20'
      : emphasis === 'mixed'
      ? 'bg-violet-500/10 text-violet-300 ring-violet-500/20'
      : 'bg-slate-500/10 text-slate-300 ring-slate-500/20'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}>
      {label}
    </span>
  )
}

function EventStateBadge({
  label,
  tone,
}: {
  label: string
  tone: 'indigo' | 'amber' | 'emerald' | 'slate'
}) {
  const className =
    tone === 'indigo'
      ? 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/20'
      : tone === 'amber'
      ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
      : tone === 'emerald'
      ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20'
      : 'bg-slate-500/10 text-slate-300 ring-slate-500/20'

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${className}`}>
      {label}
    </span>
  )
}

function getActiveState(item: ActiveTransitDetail): { label: string; tone: 'indigo' | 'amber' | 'slate' } {
  if (item.applying) return { label: 'Building', tone: 'amber' }
  return { label: 'Fading', tone: 'slate' }
}

function getUpcomingState(
  item: UpcomingTransitDetail
): { label: string; tone: 'indigo' | 'amber' | 'emerald' } {
  if (item.hoursUntil <= 6) return { label: 'Exact soon', tone: 'emerald' }
  if (item.hoursUntil <= 24) return { label: 'Building', tone: 'amber' }
  return { label: 'Upcoming', tone: 'indigo' }
}

function getLunarState(item: LunarEventDetail): { label: string; tone: 'indigo' | 'emerald' } {
  const hoursUntil = Math.round((new Date(item.exactAt).getTime() - Date.now()) / 36e5)
  if (hoursUntil <= 24) return { label: 'Exact soon', tone: 'emerald' }
  return { label: 'Upcoming', tone: 'indigo' }
}

function EventCard({
  title,
  summary,
  meta,
  badge,
  onClick,
}: {
  title: string
  summary: string
  meta: string
  badge: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-indigo-500/30 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-200">{title}</p>
        {badge}
      </div>
      <p className="mt-1 text-sm text-slate-400">{summary}</p>
      <p className="mt-2 text-xs text-slate-500">{meta}</p>
    </button>
  )
}

function EventModal({
  event,
  onClose,
}: {
  event: TransitEvent
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-700/50 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Значение на събитието
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-100">{event.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{event.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            Затвори
          </button>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
          <p className="text-sm leading-7 text-slate-300">{event.detail}</p>
        </div>
      </div>
    </div>
  )
}

export function TransitOverviewCard({ chartId }: TransitOverviewCardProps) {
  const { overview, isLoading, error } = useTransitOverview(chartId)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedEvent = useMemo(() => {
    if (!overview || !selectedId) return null
    return [
      ...overview.activeTransits,
      ...overview.upcomingExacts,
      ...overview.lunarEvents,
    ].find((item) => item.id === selectedId) ?? null
  }, [overview, selectedId])

  return (
    <>
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="font-semibold text-slate-200">Transits</h2>
              {overview && <PacingBadge emphasis={overview.pacing.emphasis} />}
            </div>
            <p className="text-sm text-slate-400">
              Преглед на активните влияния. Натиснете конкретно събитие, за да видите неговото значение.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <svg
              className="h-5 w-5 text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-full rounded-full bg-white/5" />
            <div className="h-3 w-5/6 rounded-full bg-white/5" />
            <div className="h-3 w-4/6 rounded-full bg-white/5" />
          </div>
        )}

        {error && !isLoading && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {overview && !isLoading && !error && (
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Активни транзити
              </h3>
              <div className="space-y-3">
                {overview.activeTransits.slice(0, 6).map((item) => {
                  const state = getActiveState(item)
                  return (
                    <EventCard
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatActiveTransit(item)}
                      summary={item.summary}
                      meta={`Дом ${item.house} · орб ${item.orb.toFixed(1)}° · ${
                        item.speedBand === 'fast' ? 'бърз' : 'бавен'
                      } транзит`}
                      badge={<EventStateBadge label={state.label} tone={state.tone} />}
                    />
                  )
                })}
                {overview.activeTransits.length === 0 && (
                  <p className="text-sm text-slate-400">Няма силни аспекти към наталната карта точно сега.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Следващи пикове
              </h3>
              <div className="space-y-3">
                {overview.upcomingExacts.map((item) => {
                  const state = getUpcomingState(item)
                  return (
                    <EventCard
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatUpcoming(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house} · след около ${item.hoursUntil} ч.`}
                      badge={<EventStateBadge label={state.label} tone={state.tone} />}
                    />
                  )
                })}
                {overview.upcomingExacts.length === 0 && (
                  <p className="text-sm text-slate-400">Няма близки точни аспекти през следващите 7 дни.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Лунни събития
              </h3>
              <div className="space-y-3">
                {overview.lunarEvents.map((item) => {
                  const state = getLunarState(item)
                  return (
                    <EventCard
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatLunarEvent(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house}${
                        !overview.birthTimeKnown ? ' · домът е приблизителен' : ''
                      }`}
                      badge={<EventStateBadge label={state.label} tone={state.tone} />}
                    />
                  )
                })}
                {overview.lunarEvents.length === 0 && (
                  <p className="text-sm text-slate-400">Няма открити близки новолуния или пълнолуния.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedId(null)} />}
    </>
  )
}
