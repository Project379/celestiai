'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Recommendation, RecommendationStatus } from '@/lib/stories/types'

const KIND_LABEL: Record<Recommendation['kind'], string> = {
  story: 'Разказ',
  film: 'Филм',
  episode: 'Епизод',
  book: 'Книга',
  series: 'Сериал',
}

/**
 * Status labels vary by kind — books/stories get read-vocabulary
 * ("непрочетено"), films/series/episodes get watch-vocabulary ("негледан").
 */
function statusLabel(kind: Recommendation['kind'], status: RecommendationStatus): string {
  const isWatched = kind === 'film' || kind === 'series' || kind === 'episode'
  if (status === 'new') return isWatched ? 'Негледан' : 'Непрочетено'
  if (status === 'saved') return 'В списъка'
  return isWatched ? 'Гледан' : 'Прочетено'
}

function undoLabel(kind: Recommendation['kind']): string {
  const isWatched = kind === 'film' || kind === 'series' || kind === 'episode'
  return isWatched ? 'Пак негледан' : 'Пак непрочетено'
}

interface RecommendationCardProps {
  recommendation: Recommendation
  status: RecommendationStatus
  onStatusChange: (status: RecommendationStatus) => void
  variant?: 'daily' | 'monthly'
}

export function RecommendationCard({
  recommendation,
  status,
  onStatusChange,
  variant = 'daily',
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(variant === 'daily')
  const r = recommendation

  const duration =
    r.durationMinutes != null
      ? r.durationMinutes >= 90
        ? `${Math.floor(r.durationMinutes / 60)}ч ${r.durationMinutes % 60 ? `${r.durationMinutes % 60}м` : ''}`.trim()
        : `${r.durationMinutes} мин`
      : r.pages != null
      ? `${r.pages} стр.`
      : null

  return (
    <article className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-4 -z-10 h-[220px] w-[220px] rounded-full bg-violet-500/[0.06] blur-[80px]"
      />

      <header className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-amber-300/90">
        <span>{KIND_LABEL[r.kind]}</span>
        {duration && (
          <>
            <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-amber-300/60" />
            <span className="text-slate-300">{duration}</span>
          </>
        )}
        {r.year && (
          <>
            <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-amber-300/60" />
            <span className="text-slate-400">{r.year}</span>
          </>
        )}
      </header>

      <h2 className="font-display text-[1.55rem] font-semibold leading-[1.15] tracking-tight sm:text-[1.85rem]">
        <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(251,191,36,0.18)]">
          {r.title}
        </span>
      </h2>
      {r.titleEn && (
        <p className="mt-1.5 font-display text-[13px] font-light leading-snug text-slate-500">
          {r.titleEn}
        </p>
      )}
      <p className="mt-2 font-cinzel text-[10.5px] font-medium uppercase tracking-[0.28em] text-slate-400">
        {r.author}
      </p>

      <p className="mt-4 font-display text-[15.5px] font-light leading-[1.8] text-slate-300 sm:text-[16px]">
        {r.tagline}
      </p>

      {/* Expand / collapse toggle for "why for you" */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        className="group mt-5 inline-flex items-center gap-2 font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200 transition-colors duration-200 hover:text-amber-300"
      >
        <span className="h-px w-6 bg-gradient-to-r from-transparent to-slate-300/80 transition-all duration-300 group-hover:to-amber-300/90" />
        {expanded ? 'Скрий обяснението' : 'Защо точно сега'}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="why"
            initial={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
            animate={{ opacity: 1, height: 'auto', filter: 'blur(0px)' }}
            exit={{ opacity: 0, height: 0, filter: 'blur(6px)' }}
            transition={{ duration: 0.5, ease: [0.22, 0.68, 0.35, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-6 border-t border-slate-300/[0.08] pt-6">
              <WhyBlock label="Връзка с твоето небе" body={r.howItConnects} />
              <WhyBlock label="Защо точно сега" body={r.whyNow} />
              <WhyBlock label="Какво ще ти даде" body={r.whatItGives} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-slate-300/[0.07] pt-6">
        <p className="font-cinzel text-[9.5px] uppercase tracking-[0.3em] text-slate-500">
          Статус · <span className="text-slate-300">{statusLabel(r.kind, status)}</span>
        </p>
        <span className="flex-1" />

        <StatusButton
          active={status === 'saved'}
          onClick={() =>
            onStatusChange(status === 'saved' ? 'new' : 'saved')
          }
          label={status === 'saved' ? 'Извади от списъка' : 'Запази за по-късно'}
        />
        <StatusButton
          active={status === 'consumed'}
          onClick={() =>
            onStatusChange(status === 'consumed' ? 'new' : 'consumed')
          }
          label={status === 'consumed' ? undoLabel(r.kind) : variantDoneLabel(r.kind)}
          tone="accent"
        />
      </footer>
    </article>
  )
}

function WhyBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-amber-300/85">
        {label}
      </p>
      <p className="font-display text-[14.5px] font-light leading-[1.85] text-slate-200/95">
        {body}
      </p>
    </div>
  )
}

function StatusButton({
  active,
  onClick,
  label,
  tone = 'muted',
}: {
  active: boolean
  onClick: () => void
  label: string
  tone?: 'muted' | 'accent'
}) {
  const base =
    'font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] transition-colors duration-200'
  if (tone === 'accent') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} rounded-full border px-4 py-2 ${
          active
            ? 'border-amber-300/70 bg-amber-400/15 text-amber-100'
            : 'border-amber-300/30 bg-amber-400/[0.04] text-amber-200 hover:border-amber-200/70 hover:bg-amber-400/10'
        }`}
      >
        {label}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${
        active ? 'text-amber-200' : 'text-slate-400 hover:text-slate-100'
      }`}
    >
      {label}
    </button>
  )
}

function variantDoneLabel(kind: Recommendation['kind']): string {
  switch (kind) {
    case 'book':
      return 'Прочетох'
    case 'film':
      return 'Гледах'
    case 'episode':
      return 'Гледах'
    case 'series':
      return 'Гледах'
    case 'story':
      return 'Прочетох'
  }
}
