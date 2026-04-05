'use client'

import { useState, useCallback } from 'react'
import { useOracleReading } from '@/hooks/useOracleReading'
import { TopicCards } from './TopicCards'
import { ReadingStream } from './ReadingStream'
import { LockedTopicTeaser } from './LockedTopicTeaser'
import { TOPIC_META, type OracleTopic } from './TopicCard'
import { stripSentinels } from '@/lib/oracle/planet-parser'

interface OraclePanelProps {
  chartId: string
  subscriptionTier: 'free' | 'premium'
  onPlanetHighlight: (planet: string) => void
}

export function OraclePanel({
  chartId,
  subscriptionTier,
  onPlanetHighlight,
}: OraclePanelProps) {
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

  const [lockedTopicShown, setLockedTopicShown] = useState<OracleTopic | null>(null)
  const [teaserContent, setTeaserContent] = useState<Record<string, string | null>>({})
  const [loadingTeaser, setLoadingTeaser] = useState<Record<string, boolean>>({})

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
          setTeaserContent((prev) => ({
            ...prev,
            [topic]: data.teaserContent ?? null,
          }))
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
  const isModalOpen = Boolean(activeTopic || lockedTopicShown)

  const canRegenerate =
    activeTopic && savedReading
      ? (() => {
          const lastRegen = savedReading.generatedAt
          if (!lastRegen) return true
          const hoursSince =
            (Date.now() - new Date(lastRegen).getTime()) / (1000 * 60 * 60)
          return hoursSince >= 24
        })()
      : false

  const handleCloseModal = useCallback(() => {
    if (isGenerating) {
      stop()
    }
    setLockedTopicShown(null)
    setActiveTopic(null)
  }, [isGenerating, stop, setActiveTopic])

  const modalTitle = activeTopic
    ? TOPIC_META[activeTopic as OracleTopic]?.label ?? activeTopic
    : lockedTopicShown
      ? TOPIC_META[lockedTopicShown]?.label
      : 'Оракул'

  return (
    <>
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-purple-300">
            Оракул
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Изберете тема и четенето ще се отвори в отделен прозорец.
          </p>
        </div>

        <TopicCards
          subscriptionTier={subscriptionTier}
          activeTopic={activeTopic}
          savedReadings={savedReadings}
          onTopicSelect={handleTopicSelect}
          onLockedTopicTap={handleLockedTopicTap}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between border-b border-slate-800 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-300">
                  Астрологичен оракул
                </p>
                <h4 className="mt-1 text-xl font-semibold text-slate-100">
                  {modalTitle}
                </h4>
                {showSavedReading && savedReading && (
                  <p className="mt-1 text-sm text-slate-400">
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
                onClick={handleCloseModal}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                aria-label="Затвори"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
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
                <div className="space-y-4 text-slate-200">
                  {stripSentinels(savedReading.content)
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .map((paragraph, index) => (
                      <p key={index} className="text-sm leading-7">
                        {paragraph.trim()}
                      </p>
                    ))}
                </div>
              )}
            </div>

            {showSavedReading && !isGenerating && (
              <div className="border-t border-slate-800 px-6 py-4">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={!canRegenerate}
                  title={
                    canRegenerate
                      ? 'Генерирайте ново четене'
                      : 'Можете да регенерирате веднъж на ден'
                  }
                  className={[
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all',
                    canRegenerate
                      ? 'border border-slate-700/50 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                      : 'cursor-not-allowed border border-slate-700/30 bg-slate-800/20 text-slate-600',
                  ].join(' ')}
                >
                  <svg
                    className={['h-3.5 w-3.5', canRegenerate ? '' : 'opacity-40'].join(' ')}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Ново четене
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
