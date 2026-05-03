'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ASPECTS_BG, PLANETS_BG, ZODIAC_SIGNS_BG } from '@stellaeum/astrology/client'
import type { Planet } from '@stellaeum/astrology/client'
import { AstrologyReference } from '../chart/AstrologyReference'
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

/* ─── Pacing - editorial Cinzel mark, no pill ─── */
function PacingMark({
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

  const tint =
    emphasis === 'fast'
      ? 'text-amber-300/85'
      : emphasis === 'slow'
      ? 'text-sky-300/85'
      : emphasis === 'mixed'
      ? 'text-violet-300/85'
      : 'text-slate-300/85'

  return (
    <span className={`inline-flex items-center gap-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] ${tint}`}>
      <span aria-hidden className="h-1 w-1 rotate-45 bg-current shadow-[0_0_6px_currentColor]" />
      {label}
    </span>
  )
}

/* ─── Event state - inline Cinzel text, no pill chip ─── */
function EventStateMark({
  label,
  tone,
}: {
  label: string
  tone: 'indigo' | 'amber' | 'emerald' | 'slate'
}) {
  const tint =
    tone === 'indigo'
      ? 'text-indigo-300/85'
      : tone === 'amber'
      ? 'text-amber-300/85'
      : tone === 'emerald'
      ? 'text-emerald-300/85'
      : 'text-slate-300/85'

  return (
    <span className={`inline-flex items-center gap-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] ${tint}`}>
      <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-current shadow-[0_0_5px_currentColor]" />
      {label}
    </span>
  )
}

function getActiveState(item: ActiveTransitDetail): { label: string; tone: 'indigo' | 'amber' | 'slate' } {
  if (item.applying) return { label: 'Засилва се', tone: 'amber' }
  return { label: 'Отслабва', tone: 'slate' }
}

function getUpcomingState(
  item: UpcomingTransitDetail
): { label: string; tone: 'indigo' | 'amber' | 'emerald' } {
  if (item.hoursUntil <= 6) return { label: 'Скоро точен', tone: 'emerald' }
  if (item.hoursUntil <= 24) return { label: 'Засилва се', tone: 'amber' }
  return { label: 'Предстои', tone: 'indigo' }
}

function getLunarState(item: LunarEventDetail): { label: string; tone: 'indigo' | 'emerald' } {
  const hoursUntil = Math.round((new Date(item.exactAt).getTime() - Date.now()) / 36e5)
  if (hoursUntil <= 24) return { label: 'Скоро точен', tone: 'emerald' }
  return { label: 'Предстои', tone: 'indigo' }
}

/* ─── Editorial event row - hairline, no card ─── */
function EventRow({
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
      className="group relative block w-full border-b border-white/[0.05] py-5 text-left transition-colors last:border-b-0 hover:border-amber-300/25"
    >
      {/* Hover amber diamond */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-1 w-1 -translate-x-3 -translate-y-1/2 rotate-45 bg-amber-300/90 opacity-0 shadow-[0_0_8px_rgba(251,191,36,0.7)] transition-opacity group-hover:opacity-100"
      />
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <p className="font-display text-[15.5px] font-semibold text-slate-100 transition-colors group-hover:text-white">
          {title}
        </p>
        {badge}
      </div>
      <p className="mt-1.5 max-w-2xl font-display text-[13.5px] font-light leading-[1.75] text-slate-300/90">
        {summary}
      </p>
      <p className="mt-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-400">
        {meta}
      </p>
    </button>
  )
}

/* ─── Editorial section header with Roman numeral ─── */
function SectionMark({ numeral, title }: { numeral: string; title: string }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
        {numeral}
      </span>
      <span aria-hidden className="h-px w-8 bg-gradient-to-r from-amber-300/60 to-transparent" />
      <span className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.34em] text-slate-300">
        {title}
      </span>
    </header>
  )
}

/* ─── Event detail modal - editorial mystic panel ─── */
function EventModal({
  event,
  onClose,
}: {
  event: TransitEvent
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
      >
        <motion.div
          className="absolute inset-0 bg-[#04030a]/80 backdrop-blur-md"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
        <motion.div
          className="mystic-panel relative max-h-[85vh] w-full max-w-2xl overflow-hidden"
          initial={{ opacity: 0, y: 24, scale: 0.96, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }}
          transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
        >
          {/* Ambient atmosphere */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 -z-0 h-[320px] w-[320px] rounded-full bg-violet-500/[0.10] blur-[100px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 top-10 -z-0 h-[240px] w-[240px] rounded-full bg-amber-500/[0.06] blur-[90px]"
          />

          <div className="relative max-h-[85vh] overflow-auto px-8 py-8">
            <div className="mb-6 flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                  <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/90 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                  Значение на събитието
                </p>
                <h2 className="font-display text-[1.625rem] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-[1.875rem]">
                  {event.title}
                </h2>
                <p className="mt-3 max-w-xl font-display text-[15px] font-light leading-[1.8] text-slate-300">
                  {event.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:text-amber-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
                aria-label="Затвори"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Detail - editorial pull-quote */}
            <figure className="border-l border-amber-300/40 pl-6">
              <p className="mb-2 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.36em] text-amber-300/80">
                Тълкувание
              </p>
              <blockquote className="font-display text-[15px] leading-[1.85] text-slate-300/95">
                {event.detail}
              </blockquote>
            </figure>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ─── Main ─────────────────────────────────────────── */
export function TransitOverviewCard({ chartId }: TransitOverviewCardProps) {
  const { overview, isLoading, error } = useTransitOverview(chartId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'transits' | 'reference'>('transits')

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
      {/* Top row: instruction line + pacing mark */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.05] pb-5">
        <p className="font-display text-[14px] font-light text-slate-300">
          Натисни събитие, за да видиш значението му.
        </p>
        {overview && <PacingMark emphasis={overview.pacing.emphasis} />}
      </div>

      {/* Editorial tab switch - Cinzel pill pair, no rounded box */}
      <div className="mb-10 flex items-center gap-8">
        {[
          { id: 'transits' as const,  label: 'Транзити' },
          { id: 'reference' as const, label: 'Речник'   },
        ].map((tab) => {
          const isActive = activeView === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className="group relative pb-2"
            >
              <span
                className={`font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.38em] transition-colors duration-200 ${
                  isActive ? 'text-amber-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.span
                  layoutId="transit-tab-underline"
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/70 to-transparent"
                  transition={{ duration: 0.4, ease: [0.22, 0.68, 0.35, 1] }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Reference view */}
      {activeView === 'reference' && <AstrologyReference />}

      {/* Transit content - loading */}
      {activeView === 'transits' && isLoading && (
        <div className="flex flex-col items-center justify-center gap-5 py-16">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 animate-ping rounded-full bg-violet-500/15"
              style={{ animationDuration: '2.4s' }}
            />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border border-amber-300/35"
              style={{
                maskImage:
                  'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
                WebkitMaskImage:
                  'conic-gradient(from 0deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0.0) 75%)',
                animation: 'spin 3.2s linear infinite',
              }}
            />
            <span
              aria-hidden
              className="h-2 w-2 rotate-45 bg-amber-300/90 shadow-[0_0_14px_rgba(251,191,36,0.75)]"
              style={{ animation: 'spin 5s linear infinite' }}
            />
          </div>
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-400">
            Четем небето…
          </p>
        </div>
      )}

      {/* Transit content - error */}
      {activeView === 'transits' && error && !isLoading && (
        <div className="border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
          <p className="font-display text-[13px] text-rose-300/90">{error}</p>
        </div>
      )}

      {/* Transit content - data */}
      {activeView === 'transits' && overview && !isLoading && !error && (
        <motion.div
          className="space-y-14"
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.55, ease: [0.22, 0.68, 0.35, 1] }}
        >
          <section>
            <SectionMark numeral="I" title="Активни транзити" />
            <div className="border-t border-white/[0.05]">
              {overview.activeTransits.length > 0 ? (
                overview.activeTransits.slice(0, 6).map((item) => {
                  const state = getActiveState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatActiveTransit(item)}
                      summary={item.summary}
                      meta={`Дом ${item.house} · орб ${item.orb.toFixed(1)}° · ${
                        item.speedBand === 'fast' ? 'бърз' : 'бавен'
                      } транзит`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                    />
                  )
                })
              ) : (
                <p className="py-5 font-display text-[14px] font-light text-slate-400">
                  Няма силни аспекти към наталната карта точно сега.
                </p>
              )}
            </div>
          </section>

          <section>
            <SectionMark numeral="II" title="Следващи пикове" />
            <div className="border-t border-white/[0.05]">
              {overview.upcomingExacts.length > 0 ? (
                overview.upcomingExacts.map((item) => {
                  const state = getUpcomingState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatUpcoming(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house} · след около ${item.hoursUntil} ч.`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                    />
                  )
                })
              ) : (
                <p className="py-5 font-display text-[14px] font-light text-slate-400">
                  Няма близки точни аспекти през следващите 7 дни.
                </p>
              )}
            </div>
          </section>

          <section>
            <SectionMark numeral="III" title="Лунни събития" />
            <div className="border-t border-white/[0.05]">
              {overview.lunarEvents.length > 0 ? (
                overview.lunarEvents.map((item) => {
                  const state = getLunarState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      title={formatLunarEvent(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house}${
                        !overview.birthTimeKnown ? ' · домът е приблизителен' : ''
                      }`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                    />
                  )
                })
              ) : (
                <p className="py-5 font-display text-[14px] font-light text-slate-400">
                  Няма открити близки новолуния или пълнолуния.
                </p>
              )}
            </div>
          </section>
        </motion.div>
      )}

      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedId(null)} />}
    </>
  )
}
