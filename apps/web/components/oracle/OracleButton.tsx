'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOracleReading } from '@/hooks/useOracleReading'
import { TopicCards } from './TopicCards'
import { ReadingStream } from './ReadingStream'
import { LockedTopicTeaser } from './LockedTopicTeaser'
import { TOPIC_META, type OracleTopic } from './TopicCard'
import { stripSentinels } from '@/lib/oracle/planet-parser'

interface OracleButtonProps {
  chartId: string
  subscriptionTier: 'free' | 'premium'
  onPlanetHighlight: (planet: string) => void
}

/** Scrying-orb icon — matches the one used in ProtectedNav. */
function OracleOrb({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.1" opacity="0.6" />
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="0.9" opacity="0.9" />
      <path d="M10 3.2 L11.2 10 L10 16.8 L8.8 10 Z" fill="currentColor" opacity="0.95" />
      <circle cx="10" cy="10" r="0.9" fill="currentColor" />
    </svg>
  )
}

/**
 * Floating Oracle button + full reading modal.
 *
 * Also listens for a global `oracle:open` custom event so other surfaces
 * (e.g. the protected navbar) can trigger the panel without lifting state.
 */
export function OracleButton({
  chartId,
  subscriptionTier,
  onPlanetHighlight,
}: OracleButtonProps) {
  const {
    completion,
    isLoading,
    stop,
    savedReadings,
    activeTopic,
    setActiveTopic,
    generateReading,
    fetchSavedReadings,
  } = useOracleReading(chartId)

  const [isOpen, setIsOpen] = useState(false)
  const [lockedTopicShown, setLockedTopicShown] = useState<OracleTopic | null>(null)
  const [teaserContent, setTeaserContent] = useState<Record<string, string | null>>({})
  const [loadingTeaser, setLoadingTeaser] = useState<Record<string, boolean>>({})

  // Global open bridge — ProtectedNav and any future entry point dispatches this.
  useEffect(() => {
    const handler = () => setIsOpen(true)
    window.addEventListener('oracle:open', handler)
    return () => window.removeEventListener('oracle:open', handler)
  }, [])

  const handleTopicSelect = useCallback(
    (topic: OracleTopic) => {
      setLockedTopicShown(null)
      const saved = savedReadings[topic]
      if (saved) {
        setActiveTopic(topic)
      } else {
        void generateReading(topic)
      }
    },
    [savedReadings, setActiveTopic, generateReading]
  )

  const handleLockedTopicTap = useCallback(
    (topic: OracleTopic) => {
      setLockedTopicShown(topic)
      setActiveTopic(null)
    },
    [setActiveTopic]
  )

  const handleRegenerate = useCallback(() => {
    if (!activeTopic) return
    void generateReading(activeTopic, true)
  }, [activeTopic, generateReading])

  const handleRequestTeaser = useCallback(
    async (topic: OracleTopic) => {
      if (teaserContent[topic] !== undefined || loadingTeaser[topic]) return
      setLoadingTeaser((prev) => ({ ...prev, [topic]: true }))
      try {
        const res = await fetch('/api/oracle/teaser', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, topic }),
        })
        if (res.ok) {
          const data = (await res.json()) as { teaserContent?: string }
          setTeaserContent((prev) => ({ ...prev, [topic]: data.teaserContent ?? null }))
        } else {
          setTeaserContent((prev) => ({ ...prev, [topic]: null }))
        }
      } catch {
        setTeaserContent((prev) => ({ ...prev, [topic]: null }))
      } finally {
        setLoadingTeaser((prev) => ({ ...prev, [topic]: false }))
      }
    },
    [chartId, teaserContent, loadingTeaser]
  )

  const isGenerating = isLoading
  const savedReading = activeTopic ? savedReadings[activeTopic] : null
  const showSavedReading = !isGenerating && activeTopic && savedReading && !completion
  const showStream = activeTopic && (isGenerating || Boolean(completion))

  const canRegenerate =
    activeTopic && savedReading
      ? (() => {
          const lastRegen = savedReading.generatedAt
          if (!lastRegen) return true
          const hoursSince = (Date.now() - new Date(lastRegen).getTime()) / (1000 * 60 * 60)
          return hoursSince >= 24
        })()
      : false

  const handleClose = useCallback(() => {
    if (isGenerating) stop()
    setLockedTopicShown(null)
    setActiveTopic(null)
    setIsOpen(false)
  }, [isGenerating, stop, setActiveTopic])

  const modalTitle = activeTopic
    ? TOPIC_META[activeTopic as OracleTopic]?.label ?? activeTopic
    : lockedTopicShown
      ? TOPIC_META[lockedTopicShown]?.label
      : 'Избери тема'

  return (
    <>
      {/* ─── Floating Oracle trigger ───────────────────────── */}
      <motion.button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-7 right-7 z-[100] flex items-center gap-3 overflow-hidden rounded-full border border-violet-300/25 bg-[#08060f]/90 px-6 py-3.5 backdrop-blur-xl transition-colors hover:border-amber-300/50"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        initial={{ opacity: 0, y: 24, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 0.68, 0.35, 1] }}
        style={{ willChange: 'transform' }}
        aria-label="Отвори Оракула"
      >
        {/* Slow pulsing halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            boxShadow: '0 0 36px rgba(167,139,250,0.28), 0 0 78px rgba(251,191,36,0.08)',
            animation: 'aura-glow 3.4s ease-in-out infinite',
            willChange: 'opacity',
          }}
        />
        {/* Diagonal shimmer on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-200/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        />

        <span className="relative text-violet-200 transition-colors duration-300 group-hover:text-amber-200">
          <OracleOrb size={18} />
        </span>
        <span className="relative font-cinzel text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-200/95 transition-colors duration-300 group-hover:text-white">
          Оракул
        </span>
      </motion.button>

      {/* ─── Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-[#04030a]/80 backdrop-blur-md"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Panel */}
            <motion.div
              className="mystic-panel relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden"
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 14, scale: 0.97, filter: 'blur(6px)' }}
              transition={{ duration: 0.42, ease: [0.22, 0.68, 0.35, 1] }}
            >
              {/* Ambient atmosphere inside the panel */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 -z-0 h-[320px] w-[320px] rounded-full bg-violet-500/[0.10] blur-[100px]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 top-10 -z-0 h-[240px] w-[240px] rounded-full bg-amber-500/[0.06] blur-[90px]"
              />

              {/* Header */}
              <div className="relative flex items-start justify-between border-b border-white/[0.06] px-7 pb-5 pt-6">
                <div className="min-w-0">
                  <p className="mb-2 flex items-center gap-3 font-cinzel text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-300/80">
                    <span aria-hidden className="h-1 w-1 rotate-45 bg-amber-300/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    Астрологичен оракул
                  </p>
                  <h4 className="font-display text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-slate-100">
                    {modalTitle}
                  </h4>
                  {showSavedReading && savedReading && (
                    <p className="mt-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-500">
                      {new Date(savedReading.generatedAt).toLocaleDateString('bg-BG', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  className="group relative -mr-2 rounded-full p-2 text-slate-500 transition-colors hover:text-amber-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300/60"
                  aria-label="Затвори"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Topic picker — always visible when nothing selected */}
              {!activeTopic && !lockedTopicShown && (
                <div className="relative border-b border-white/[0.05] px-7 py-5">
                  <TopicCards
                    subscriptionTier={subscriptionTier}
                    activeTopic={activeTopic}
                    savedReadings={savedReadings}
                    onTopicSelect={handleTopicSelect}
                    onLockedTopicTap={handleLockedTopicTap}
                  />
                </div>
              )}

              {/* Content area */}
              <div className="relative flex-1 overflow-y-auto px-7 py-6">
                {!activeTopic && !lockedTopicShown && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="mb-4 flex items-center gap-3" aria-hidden>
                      <span className="h-px w-10 bg-gradient-to-r from-transparent to-amber-300/40" />
                      <span className="h-1.5 w-1.5 rotate-45 bg-amber-300/80 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                      <span className="h-px w-10 bg-gradient-to-l from-transparent to-amber-300/40" />
                    </div>
                    <p className="max-w-sm font-display text-[15px] font-light italic leading-[1.75] text-slate-400">
                      Избери тема отгоре и звездите ще ти разкажат.
                    </p>
                  </div>
                )}

                {lockedTopicShown && !activeTopic && (
                  <LockedTopicTeaser
                    topic={lockedTopicShown}
                    teaserContent={teaserContent[lockedTopicShown] ?? null}
                    isLoadingTeaser={loadingTeaser[lockedTopicShown] ?? false}
                    onRequestTeaser={() => void handleRequestTeaser(lockedTopicShown)}
                  />
                )}

                {showStream && (
                  <ReadingStream
                    completion={completion}
                    isLoading={isGenerating}
                    onPlanetHighlight={onPlanetHighlight}
                    onComplete={fetchSavedReadings}
                  />
                )}

                {showSavedReading && savedReading && (
                  <div className="space-y-5 text-[15px] leading-[1.85] text-slate-300/90">
                    {stripSentinels(savedReading.content)
                      .split(/\n\n+/)
                      .filter(Boolean)
                      .map((paragraph, index) => (
                        <p key={index}>{paragraph.trim()}</p>
                      ))}
                  </div>
                )}
              </div>

              {/* Footer — back + regenerate */}
              {(activeTopic || lockedTopicShown) && (
                <div className="relative flex items-center justify-between border-t border-white/[0.06] px-7 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (isGenerating) stop()
                      setActiveTopic(null)
                      setLockedTopicShown(null)
                    }}
                    className="group inline-flex items-center gap-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
                  >
                    <svg className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Всички теми
                  </button>

                  {showSavedReading && !isGenerating && (
                    <button
                      type="button"
                      onClick={handleRegenerate}
                      disabled={!canRegenerate}
                      title={canRegenerate ? 'Ново четене' : 'Можеш да обновиш веднъж на ден'}
                      className={[
                        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] transition-all',
                        canRegenerate
                          ? 'border-amber-300/35 text-amber-200/90 hover:border-amber-300/60 hover:text-amber-100 hover:shadow-[0_0_24px_rgba(251,191,36,0.18)]'
                          : 'cursor-not-allowed border-white/[0.06] text-slate-600',
                      ].join(' ')}
                    >
                      <svg className={['h-3 w-3', canRegenerate ? '' : 'opacity-40'].join(' ')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Ново четене
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
