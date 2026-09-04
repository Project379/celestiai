'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import type {
  PersonalizedRecommendation,
  RecommendationRerollReason,
  RecommendationSentiment,
  RecommendationStatus,
} from '@stellaeum/core/recommendations/schemas'
import { LockBadge } from '@/components/tier/PremiumLock'
import { RECS_DETAIL_LOCKED } from '@/lib/tier/locked-copy'

interface RecommendationCardProps {
  recommendation: PersonalizedRecommendation
  onFeedback: (
    recommendation: PersonalizedRecommendation,
    status: RecommendationStatus,
    sentiment?: RecommendationSentiment | null,
  ) => Promise<unknown>
  onReroll: (
    recommendation: PersonalizedRecommendation,
    reason: RecommendationRerollReason,
  ) => Promise<unknown>
  isMutating?: boolean
  variant?: 'daily' | 'monthly'
  locked?: boolean
}

const SENTIMENTS: Array<{ value: RecommendationSentiment; label: string }> = [
  { value: 'liked', label: 'Хареса ми' },
  { value: 'okay', label: 'Беше добре' },
  { value: 'disliked', label: 'Не ми хареса' },
]

export function RecommendationCard({
  recommendation,
  onFeedback,
  onReroll,
  isMutating = false,
  variant = 'daily',
  locked = false,
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(variant === 'daily')
  const [showRerollReasons, setShowRerollReasons] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const work = recommendation.work
  const isMovie = work.mediaType === 'movie'
  const duration = work.durationMinutes
    ? `${Math.floor(work.durationMinutes / 60)}ч ${work.durationMinutes % 60 ? `${work.durationMinutes % 60}м` : ''}`.trim()
    : work.pages
      ? `${work.pages} стр.`
      : null

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-300/[0.09] bg-slate-950/20 p-5 sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-4 h-[220px] w-[220px] rounded-full bg-violet-500/[0.06] blur-[80px]"
      />

      <div className="relative grid gap-7 sm:grid-cols-[170px_minmax(0,1fr)]">
        <div>
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-slate-300/10 bg-slate-900/70 shadow-2xl shadow-black/30">
            {work.image && !imageFailed ? (
              <Image
                src={work.image.url}
                alt={work.image.alt}
                fill
                sizes="(max-width: 640px) 100vw, 170px"
                className="object-cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-5 text-center font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-500">
                {isMovie ? 'Постерът не е наличен' : 'Корицата не е налична'}
              </div>
            )}
          </div>
          {work.image?.attribution && !imageFailed && (
            <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
              {work.image.attribution}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.3em] text-amber-300/90">
            <span>{isMovie ? 'Филм' : 'Книга'}</span>
            {duration && <MetaDivider text={duration} />}
            {work.year && <MetaDivider text={String(work.year)} />}
          </header>

          <h2 className="font-display text-[1.6rem] font-semibold leading-tight tracking-tight sm:text-[1.85rem]">
            <span className="bg-gradient-to-br from-white via-slate-100 to-amber-200/95 bg-clip-text text-transparent">
              {work.title}
            </span>
          </h2>
          {work.originalTitle && work.originalTitle !== work.title && (
            <p className="mt-1.5 font-display text-[13px] font-light text-slate-500">
              {work.originalTitle}
            </p>
          )}
          <p className="mt-2 font-cinzel text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">
            {work.creator}
          </p>
          <p className="mt-4 font-display text-[15.5px] font-light leading-[1.75] text-slate-200">
            {work.tagline}
          </p>

          {locked ? (
            <p className="mt-5 inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/80">
              <LockBadge />
              {RECS_DETAIL_LOCKED}
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                className="group mt-5 inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200 transition-colors hover:text-amber-300"
              >
                <span className="h-px w-6 bg-slate-300/70 transition-colors group-hover:bg-amber-300/80" />
                {expanded ? 'Скрий обяснението' : 'Защо точно сега'}
              </button>

              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 space-y-5 border-t border-slate-300/[0.08] pt-6">
                      <WhyBlock label="Връзка с твоето небе" body={recommendation.explanation.howItConnects} />
                      <WhyBlock label="Защо точно сега" body={recommendation.explanation.whyNow} />
                      <WhyBlock label="Какво ще ти даде" body={recommendation.explanation.whatItGives} />
                      <p className="font-display text-[14px] font-light leading-[1.8] text-slate-400">
                        {work.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <footer className="mt-7 border-t border-slate-300/[0.08] pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="mr-auto font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-500">
                    Статус · <span className="text-slate-300">{statusLabel(isMovie, recommendation.status)}</span>
                  </p>
                  <ActionButton
                    active={recommendation.status === 'saved'}
                    disabled={isMutating}
                    onClick={() => void onFeedback(
                      recommendation,
                      recommendation.status === 'saved' ? 'new' : 'saved',
                      null,
                    )}
                    label={recommendation.status === 'saved' ? 'Премахни' : 'Запази'}
                  />
                  <ActionButton
                    active={recommendation.status === 'consumed'}
                    disabled={isMutating}
                    onClick={() => void onFeedback(
                      recommendation,
                      recommendation.status === 'consumed' ? 'new' : 'consumed',
                      null,
                    )}
                    label={recommendation.status === 'consumed' ? 'Отмени' : isMovie ? 'Гледан' : 'Прочетена'}
                    accent
                  />
                </div>

                {recommendation.status === 'consumed' && (
                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="mr-1 font-cinzel text-[9px] uppercase tracking-[0.25em] text-slate-500">
                      Как ти се стори?
                    </span>
                    {SENTIMENTS.map((item) => (
                      <ActionButton
                        key={item.value}
                        active={recommendation.sentiment === item.value}
                        disabled={isMutating}
                        onClick={() => void onFeedback(recommendation, 'consumed', item.value)}
                        label={item.label}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-5">
                  {recommendation.rerollsRemaining > 0 ? (
                    <>
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => setShowRerollReasons((value) => !value)}
                        className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition-colors hover:text-slate-100 disabled:opacity-50"
                      >
                        Друга препоръка · остава 1 смяна
                      </button>
                      {showRerollReasons && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButton
                            disabled={isMutating}
                            onClick={() => void onReroll(recommendation, 'already_consumed')}
                            label={isMovie ? 'Вече съм го гледал/а' : 'Вече съм я чел/а'}
                          />
                          <ActionButton
                            disabled={isMutating}
                            onClick={() => void onReroll(recommendation, 'not_interested')}
                            label="Не ме привлича"
                          />
                          <ActionButton
                            disabled={isMutating}
                            onClick={() => void onReroll(recommendation, 'not_now')}
                            label="Не е за момента"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-slate-600">
                      Смяната за този период е използвана
                    </p>
                  )}
                </div>
              </footer>
            </>
          )}
        </div>
      </div>
    </article>
  )
}

function MetaDivider({ text }: { text: string }) {
  return (
    <>
      <span aria-hidden className="h-[3px] w-[3px] rotate-45 bg-amber-300/60" />
      <span className="text-slate-400">{text}</span>
    </>
  )
}

function WhyBlock({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-amber-300/85">
        {label}
      </p>
      <p className="font-display text-[14.5px] font-light leading-[1.8] text-slate-200/95">
        {body}
      </p>
    </div>
  )
}

function ActionButton({
  active = false,
  accent = false,
  disabled = false,
  label,
  onClick,
}: {
  active?: boolean
  accent?: boolean
  disabled?: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.2em] transition-colors disabled:cursor-wait disabled:opacity-50 ${
        active || accent
          ? 'border-amber-300/40 bg-amber-400/[0.08] text-amber-100 hover:border-amber-200/70'
          : 'border-slate-300/15 text-slate-400 hover:border-slate-300/35 hover:text-slate-100'
      }`}
    >
      {label}
    </button>
  )
}

function statusLabel(isMovie: boolean, status: RecommendationStatus): string {
  if (status === 'saved') return 'Запазено'
  if (status === 'consumed') return isMovie ? 'Гледан' : 'Прочетена'
  return isMovie ? 'Негледан' : 'Непрочетена'
}
