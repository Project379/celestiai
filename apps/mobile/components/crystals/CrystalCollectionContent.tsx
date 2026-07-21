import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { CatalogRow } from '@stellaeum/core/crystals/queries'

import { useCrystalsOverview } from '@/hooks/useCrystalsOverview'
import { CrystalGridTile } from './CrystalGridTile'
import { DailyStreakPanel } from './DailyStreakPanel'
import type { GemVariant } from './CrystalGem'

type Tab = 'windows' | 'discovered' | 'daily' | 'all'

interface CrystalCollectionContentProps {
  chartId: string
  onSelectCrystal: (slug: string) => void
}

/**
 * Windows / Discovered / Daily / Catalog collection view. Mobile port of
 * apps/web/components/crystals/CrystalCollectionContent.tsx. Tab switcher
 * reuses the P.2-b typographic-underline pattern (chart.tsx TOP_TABS).
 * The detail modal is owned by the parent screen (P.6-d) — this component
 * only reports taps via onSelectCrystal. framer-motion fade/stagger on
 * tab switch dropped per data-display discipline.
 */
export function CrystalCollectionContent({ chartId, onSelectCrystal }: CrystalCollectionContentProps) {
  const [tab, setTab] = useState<Tab>('windows')
  const { data: state, isLoading, isError } = useCrystalsOverview(chartId, true)

  const discoveredIds = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(state.collection.map((c) => c.crystal_id))
  }, [state])

  const recommendedIds = useMemo(() => {
    if (!state) return new Set<string>()
    return new Set(state.recommendations.map((r) => r.crystal_id))
  }, [state])

  const visible: CatalogRow[] = useMemo(() => {
    if (!state) return []
    if (tab === 'windows') {
      return state.catalog.filter((c) => recommendedIds.has(c.id) && !discoveredIds.has(c.id))
    }
    if (tab === 'discovered') {
      return state.catalog.filter((c) => discoveredIds.has(c.id))
    }
    if (tab === 'all') return state.catalog
    return []
  }, [state, tab, recommendedIds, discoveredIds])

  if (isLoading && !state) {
    return (
      <View className="items-center py-16">
        <Text className="font-cinzel text-[11px] uppercase tracking-[0.32em] text-slate-500">
          Призовават се камъни...
        </Text>
      </View>
    )
  }

  if (isError && !state) {
    return (
      <View className="rounded-2xl border border-red-300/20 bg-red-500/[0.04] px-6 py-8">
        <Text className="text-center text-[14px] text-red-200/90">
          Не успяхме да заредим колекцията.
        </Text>
      </View>
    )
  }

  if (!state) return null

  const pendingRecsCount = state.recommendations.filter((r) => !discoveredIds.has(r.crystal_id)).length

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'windows', label: 'Прозорци', count: pendingRecsCount },
    { id: 'discovered', label: 'Твои камъни', count: state.collection.length },
    { id: 'daily', label: 'Дневна серия' },
    { id: 'all', label: 'Каталог', count: state.catalog.length },
  ]

  return (
    <View>
      <View className="mb-8 flex-row flex-wrap border-b border-white/[0.06] pb-1" style={{ gap: 24 }}>
        {tabs.map((t) => {
          const isActive = tab === t.id
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} className="relative pb-2">
              <Text
                className={`font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] ${
                  isActive ? 'text-amber-200' : 'text-slate-400'
                }`}
              >
                {t.label}
                {typeof t.count === 'number' ? ` ${t.count}` : ''}
              </Text>
              {isActive && (
                <View className="absolute -bottom-1 left-0 right-0 h-px bg-amber-400/70" />
              )}
            </Pressable>
          )
        })}
      </View>

      {tab === 'windows' && pendingRecsCount === 0 && (
        <View className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-10">
          <Text className="text-center font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
            Тихо небе
          </Text>
          <Text className="mt-3 text-center text-[14px] font-light leading-relaxed text-slate-400">
            В момента нямаш отворени прозорци. Нов камък те очаква около новолуние, пълнолуние или когато бавна планета докосне картата ти.
          </Text>
        </View>
      )}

      {tab === 'daily' ? (
        <DailyStreakPanel />
      ) : (
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {visible.map((c) => {
            const recommended = recommendedIds.has(c.id)
            const discovered = discoveredIds.has(c.id)
            return (
              <CrystalGridTile
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
                highlight={recommended && !discovered}
                onPress={() => onSelectCrystal(c.slug)}
              />
            )
          })}
        </View>
      )}
    </View>
  )
}
