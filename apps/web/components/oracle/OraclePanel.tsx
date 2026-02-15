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
  /** Called when a planet is mentioned in the reading, for cross-highlighting */
  onPlanetHighlight: (planet: string) => void
}

/**
 * Main Oracle side panel.
 *
 * Orchestrates all Oracle UI states:
 * - Topic card grid
 * - Streaming reading display (active generation)
 * - Saved reading display (cached)
 * - Locked topic teaser (premium gating)
 * - Regenerate button with rate limit tooltip
 */
export function OraclePanel({
  chartId,
  subscriptionTier,
  onPlanetHighlight,
}: OraclePanelProps) {
  const {
    completion,
    isLoading,
    savedReadings,
    activeTopic,
    setActiveTopic,
    generateReading,
    fetchSavedReadings,
  } = useOracleReading(chartId)

  // Topic being shown in locked teaser state
  const [lockedTopicShown, setLockedTopicShown] = useState<OracleTopic | null>(null)
  // Teaser content per topic (fetched from /api/oracle/teaser)
  const [teaserContent, setTeaserContent] = useState<Record<string, string | null>>({})
  const [loadingTeaser, setLoadingTeaser] = useState<Record<string, boolean>>({})

  // --- Handlers ---

  const handleTopicSelect = useCallback(
    (topic: OracleTopic) => {
      setLockedTopicShown(null)

      const saved = savedReadings[topic]
      if (saved) {
        // View saved reading without re-streaming
        setActiveTopic(topic)
      } else {
        // Generate a new reading
        void generateReading(topic)
      }
    },
    [savedReadings, setActiveTopic, generateReading]
  )

  const handleLockedTopicTap = useCallback((topic: OracleTopic) => {
    setLockedTopicShown(topic)
    // Clear any active streaming topic so the teaser panel is shown
    setActiveTopic(null)
  }, [setActiveTopic])

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
          const data = await res.json() as { teaserContent?: string }
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

  // --- Derived state ---

  const isGenerating = isLoading
  const savedReading = activeTopic ? savedReadings[activeTopic] : null
  const showSavedReading =
    !isGenerating && activeTopic && savedReading && !completion
  const showStream = activeTopic && (isGenerating || Boolean(completion))

  // Check if regeneration is within the 24h rate limit
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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-700/50 bg-slate-900/60 p-6 backdrop-blur-xl">
      {/* Topic selector */}
      <TopicCards
        subscriptionTier={subscriptionTier}
        activeTopic={activeTopic}
        savedReadings={savedReadings}
        onTopicSelect={handleTopicSelect}
        onLockedTopicTap={handleLockedTopicTap}
      />

      {/* Reading content area */}
      <div className="max-h-[70vh] overflow-y-auto">
        {/* Locked topic teaser */}
        {lockedTopicShown && !activeTopic && (
          <LockedTopicTeaser
            topic={lockedTopicShown}
            teaserContent={teaserContent[lockedTopicShown] ?? null}
            isLoadingTeaser={loadingTeaser[lockedTopicShown] ?? false}
            onRequestTeaser={() => void handleRequestTeaser(lockedTopicShown)}
          />
        )}

        {/* Streaming reading or saved reading display */}
        {showStream && (
          <ReadingStream
            completion={completion}
            isLoading={isGenerating}
            onPlanetHighlight={onPlanetHighlight}
            onComplete={fetchSavedReadings}
          />
        )}

        {/* Saved reading (non-streaming, from cache) */}
        {showSavedReading && (
          <div>
            {/* Reading header */}
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  {TOPIC_META[activeTopic as OracleTopic]?.label ?? activeTopic}
                </h4>
                <p className="text-xs text-slate-500">
                  {new Date(savedReading.generatedAt).toLocaleDateString(
                    'bg-BG',
                    { day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </p>
              </div>
            </div>

            {/* Saved reading text */}
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
          </div>
        )}

        {/* Empty state: no topic selected */}
        {!activeTopic && !lockedTopicShown && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80">
              <svg
                className="h-5 w-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
            <p className="text-sm text-slate-500">
              Изберете тема, за да получите вашето персонализирано четене
            </p>
          </div>
        )}
      </div>

      {/* Regenerate button — shown only after a completed reading */}
      {showSavedReading && !isGenerating && (
        <div className="border-t border-slate-700/50 pt-3">
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
              'flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all',
              canRegenerate
                ? 'border border-slate-700/50 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                : 'cursor-not-allowed border border-slate-700/30 bg-slate-800/20 text-slate-600',
            ].join(' ')}
          >
            {/* Refresh icon */}
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
  )
}
