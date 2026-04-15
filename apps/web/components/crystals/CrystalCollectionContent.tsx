'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { CrystalCard } from './CrystalCard'
import {
  CrystalDetailPanel,
  type CrystalDetailData,
} from './CrystalDetailPanel'
import type { GemVariant } from './CrystalGem'

interface CrystalRow {
  id: string
  slug: string
  name_en: string
  name_bg: string | null
  tagline_en: string
  tagline_bg: string | null
  description_en: string
  description_bg: string | null
  planet: string | null
  zodiac_signs: string[]
  moon_phases: string[]
  element: string | null
  chakra: string | null
  hardness: number | null
  color_primary: string
  color_secondary: string
  color_accent: string | null
  svg_variant: string
  rarity: string
  keywords: string[]
}

interface UserCrystalRow {
  id: string
  crystal_id: string
  source: string
  reason_text: string | null
  discovered_at: string
}

interface RecommendationRow {
  id: string
  crystal_id: string
  trigger_type: string
  reason_code: string
  reason_text_en: string
  reason_text_bg: string | null
  valid_from: string
  valid_until: string
  collected_at: string | null
}

interface CrystalState {
  catalog: CrystalRow[]
  collection: UserCrystalRow[]
  recommendations: RecommendationRow[]
  lunarPhase: { id: string; name: string; latin: string; illumination: number }
}

type Tab = 'recommended' | 'discovered' | 'all'

interface CrystalCollectionContentProps {
  chartId: string
}

export function CrystalCollectionContent({
  chartId,
}: CrystalCollectionContentProps) {
  const [state, setState] = useState<CrystalState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('recommended')
  const [collecting, setCollecting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crystals?chartId=${chartId}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as CrystalState
      setState(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [chartId])

  useEffect(() => {
    void load()
  }, [load])

  const discoveredIds = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(state.collection.map((c) => c.crystal_id))
  }, [state])

  const recommendedIds = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(state.recommendations.map((r) => r.crystal_id))
  }, [state])

  const visible = useMemo(() => {
    if (!state) return []
    if (tab === 'recommended') {
      return state.catalog.filter((c) => recommendedIds.has(c.id))
    }
    if (tab === 'discovered') {
      return state.catalog.filter((c) => discoveredIds.has(c.id))
    }
    return state.catalog
  }, [state, tab, recommendedIds, discoveredIds])

  const selected = useMemo(() => {
    if (!state || !selectedSlug) return null
    return state.catalog.find((c) => c.slug === selectedSlug) ?? null
  }, [state, selectedSlug])

  const selectedDetail: CrystalDetailData | null = useMemo(() => {
    if (!selected) return null
    return {
      slug: selected.slug,
      nameEn: selected.name_en,
      nameBg: selected.name_bg,
      taglineEn: selected.tagline_en,
      taglineBg: selected.tagline_bg,
      descriptionEn: selected.description_en,
      descriptionBg: selected.description_bg,
      planet: selected.planet,
      zodiacSigns: selected.zodiac_signs,
      moonPhases: selected.moon_phases,
      element: selected.element,
      chakra: selected.chakra,
      hardness: selected.hardness,
      colorPrimary: selected.color_primary,
      colorSecondary: selected.color_secondary,
      colorAccent: selected.color_accent,
      svgVariant: selected.svg_variant,
      rarity: selected.rarity,
      keywords: selected.keywords,
    }
  }, [selected])

  const selectedRec = useMemo(() => {
    if (!state || !selected) return null
    return (
      state.recommendations.find((r) => r.crystal_id === selected.id) ?? null
    )
  }, [state, selected])

  const selectedIsDiscovered = selected
    ? discoveredIds.has(selected.id)
    : false

  const handleCollect = useCallback(async () => {
    if (!selectedRec) return
    setCollecting(true)
    try {
      const res = await fetch('/api/crystals/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: selectedRec.id }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCollecting(false)
    }
  }, [selectedRec, load])

  if (loading && !state) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-500">
          Призовават се камъни...
        </p>
      </div>
    )
  }

  if (error && !state) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-500/[0.04] px-6 py-8 text-center">
        <p className="font-display text-[15px] text-red-200/90">{error}</p>
      </div>
    )
  }

  if (!state) return null

  const tabs: { id: Tab; label: string; count: number }[] = [
    {
      id: 'recommended',
      label: 'Препоръки',
      count: state.recommendations.length,
    },
    { id: 'discovered', label: 'Твои камъни', count: state.collection.length },
    { id: 'all', label: 'Каталог', count: state.catalog.length },
  ]

  return (
    <div className="relative">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-10 -z-10 h-[320px] w-[320px] rounded-full bg-violet-500/[0.08] blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 top-40 -z-10 h-[260px] w-[260px] rounded-full bg-amber-500/[0.05] blur-[80px]"
      />

      <div className="mb-8 flex flex-wrap items-center gap-3">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`
                rounded-full border px-4 py-2 font-cinzel text-[10px] font-semibold uppercase tracking-[0.28em]
                transition-colors duration-300
                ${
                  active
                    ? 'border-amber-300/50 bg-amber-400/[0.08] text-amber-200'
                    : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/25 hover:text-slate-200'
                }
              `}
            >
              {t.label}
              <span className="ml-2 text-slate-500">{t.count}</span>
            </button>
          )
        })}
      </div>

      {tab === 'recommended' && state.recommendations.length === 0 && (
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-10 text-center">
          <p className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Празно небе
          </p>
          <p className="mt-3 font-display text-[15px] font-light italic leading-relaxed text-slate-400">
            Нямаш активни препоръки точно сега. Новите се появяват около новолуние и пълнолуние — върни се тогава.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4"
        >
          {visible.map((c) => {
            const recommended = recommendedIds.has(c.id)
            const discovered = discoveredIds.has(c.id)
            return (
              <CrystalCard
                key={c.slug}
                slug={c.slug}
                name={c.name_bg ?? c.name_en}
                tagline={c.tagline_bg ?? c.tagline_en}
                variant={c.svg_variant as GemVariant}
                primary={c.color_primary}
                secondary={c.color_secondary}
                accent={c.color_accent}
                rarity={c.rarity}
                discovered={tab === 'all' ? discovered : true}
                highlight={recommended}
                onClick={() => setSelectedSlug(c.slug)}
              />
            )
          })}
        </motion.div>
      </AnimatePresence>

      <CrystalDetailPanel
        crystal={selectedDetail}
        discovered={selectedIsDiscovered}
        reason={selectedRec?.reason_text_bg ?? selectedRec?.reason_text_en ?? null}
        canCollect={Boolean(selectedRec && !selectedIsDiscovered)}
        collecting={collecting}
        onCollect={handleCollect}
        onClose={() => setSelectedSlug(null)}
      />

      <div className="mt-12 text-center">
        <Link
          href="/dashboard"
          className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500 transition-colors hover:text-amber-300"
        >
          &larr; Обратно към таблото
        </Link>
      </div>
    </div>
  )
}
