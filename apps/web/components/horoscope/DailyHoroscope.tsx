'use client'

import { motion } from 'framer-motion'
import { useDailyHoroscope } from '@/hooks/useDailyHoroscope'
import { HoroscopeStream } from './HoroscopeStream'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

interface DailyHoroscopeProps {
  chartId: string
}

/**
 * DailyHoroscope
 *
 * Editorial daily oracle card for the dashboard. Preserves all original
 * states (loading, error, streaming, yesterday unavailable) while reworking
 * the visual language into a centered mystical composition.
 */
export function DailyHoroscope({ chartId }: DailyHoroscopeProps) {
  const {
    completion,
    isLoading,
    error,
    cachedContent,
    selectedDate,
    setSelectedDate,
    yesterdayUnavailable,
    fetchError,
  } = useDailyHoroscope(chartId)

  const todayFormatted = BG_DATE_FORMAT.format(new Date())

  const todayContent = cachedContent.today
  const yesterdayContent = cachedContent.yesterday

  const displayText =
    selectedDate === 'today'
      ? completion || todayContent?.content || ''
      : yesterdayContent?.content || ''

  const isStreaming = isLoading && selectedDate === 'today'
  const errorMessage = fetchError || (error ? 'Звездите мълчат - опитай отново след миг.' : null)

  return (
    <div className="py-2">
      {/* ── Centered sigil + title block ───────────────── */}
      <div className="relative mb-7 flex flex-col items-center text-center">
        {/* Sun sigil - violet outer bloom, gold core */}
        <div className="relative mb-5 flex h-[58px] w-[58px] items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl"
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-amber-400/12 blur-md"
          />
          <motion.span
            className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full border border-slate-200/20 bg-gradient-to-br from-violet-500/[0.14] via-amber-400/[0.08] to-transparent"
            animate={{ boxShadow: [
              '0 0 22px 0 rgba(167, 139, 250, 0.18), inset 0 0 12px rgba(251, 191, 36, 0.08)',
              '0 0 34px 4px rgba(251, 191, 36, 0.22), inset 0 0 16px rgba(167, 139, 250, 0.12)',
              '0 0 22px 0 rgba(167, 139, 250, 0.18), inset 0 0 12px rgba(251, 191, 36, 0.08)',
            ] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CelestialIcon
              name="sun"
              size={26}
              className="text-amber-100 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
            />
          </motion.span>
        </div>

        <p className="flex items-center gap-2.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-200/85">
          <span
            aria-hidden
            className="h-px w-5 bg-gradient-to-r from-transparent to-slate-300/40"
          />
          Oraculum Diei
          <span
            aria-hidden
            className="h-px w-5 bg-gradient-to-l from-transparent to-slate-300/40"
          />
        </p>
        <h2 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-white sm:text-[24px]">
          Дневен хороскоп
        </h2>
        <p className="mt-1.5 font-display text-[12.5px] italic text-slate-400">
          {todayFormatted}
        </p>
      </div>

      {/* ── Decorative divider - ivory rule, gold focal ─── */}
      <div className="mb-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300/15 to-slate-300/25" />
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[8px] leading-none text-slate-300/55">✦</span>
          <CelestialIcon name="northNode" size={12} className="text-amber-300/70 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]" />
          <span className="text-[8px] leading-none text-slate-300/55">✦</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-300/15 to-slate-300/25" />
      </div>

      {/* ── Date tabs - typographic, underlined ────────── */}
      <div className="mb-7 flex justify-center gap-10">
        <TabButton
          active={selectedDate === 'today'}
          onClick={() => setSelectedDate('today')}
          label="Днес"
        />
        <TabButton
          active={selectedDate === 'yesterday' && !yesterdayUnavailable}
          disabled={yesterdayUnavailable}
          onClick={() => !yesterdayUnavailable && setSelectedDate('yesterday')}
          label={yesterdayUnavailable ? 'Неналично' : 'Вчера'}
        />
      </div>

      {/* ── Content area ───────────────────────────────── */}
      <div className="relative min-h-[140px]">
        {/* Drop-cap quote ornament - shows only when text is present */}
        {(displayText || isStreaming) && (
          <div
            aria-hidden
            className="pointer-events-none absolute -left-1 -top-4 select-none font-cinzel text-[56px] leading-none text-amber-400/15"
          >
            &ldquo;
          </div>
        )}

        {/* Error state */}
        {errorMessage && !isStreaming && !displayText && (
          <div className="rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-5 py-4">
            <p className="font-display text-sm italic text-rose-300/80">{errorMessage}</p>
          </div>
        )}

        {/* Yesterday unavailable */}
        {selectedDate === 'yesterday' && yesterdayUnavailable && (
          <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="relative flex h-11 w-11 items-center justify-center">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-slate-500/5 blur-md"
              />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-500/15 bg-slate-500/5">
                <CelestialIcon name="moon" size={16} className="text-slate-400/70" />
              </div>
            </div>
            <p className="max-w-[22ch] font-display text-sm italic text-slate-400">
              Вчерашното послание вече е отминало.
            </p>
          </div>
        )}

        {/* Loading - pulsing sun while waiting */}
        {!isStreaming && !displayText && !errorMessage && selectedDate === 'today' && (
          <div className="flex items-center justify-center py-12">
            <motion.div
              className="text-amber-300/60"
              animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.94, 1.06, 0.94] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CelestialIcon name="sun" size={24} />
            </motion.div>
          </div>
        )}

        {/* Horoscope text */}
        {(displayText || isStreaming) &&
          !(selectedDate === 'yesterday' && yesterdayUnavailable) && (
            <div className="relative z-10 pl-1">
              <HoroscopeStream text={displayText} isStreaming={isStreaming} />
            </div>
          )}
      </div>
    </div>
  )
}

/* ─── Typographic tab - thin gold underline instead of pill ─────── */
function TabButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'group relative pb-2 font-display text-[11px] font-semibold uppercase tracking-[0.28em] transition-colors duration-300',
        active
          ? 'text-amber-200'
          : disabled
          ? 'cursor-not-allowed text-slate-700'
          : 'text-slate-400 hover:text-slate-200',
      ].join(' ')}
    >
      {label}
      <span
        aria-hidden
        className={[
          'absolute inset-x-0 bottom-0 h-px transition-all duration-300',
          active
            ? 'bg-gradient-to-r from-transparent via-amber-400/70 to-transparent shadow-[0_0_8px_rgba(251,191,36,0.4)]'
            : 'bg-transparent',
        ].join(' ')}
      />
    </button>
  )
}
