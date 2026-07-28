import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { hapticSelect } from '@/lib/haptics'

import {
  ASPECTS_BG,
  PLANETS_BG,
  ZODIAC_SIGNS_BG,
  type Planet,
} from '@stellaeum/astrology/client'
import type {
  ActiveTransitDetail,
  LunarEventDetail,
  TransitOverview,
  UpcomingTransitDetail,
} from '@stellaeum/core/horoscope/transit-analysis'

import { AstrologyReference } from '@/components/chart/AstrologyReference'
import { font, pressFeedback } from '@/components/design-system/tokens'
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

function bgPrep(prep: 'в' | 'с', nextWord: string): string {
  if (prep === 'в') return /^[вВфФ]/.test(nextWord) ? 'във' : 'в'
  return /^[сСзЗ]/.test(nextWord) ? 'със' : 'с'
}

function formatActiveTransit(item: ActiveTransitDetail): string {
  return `${PLANETS_BG[item.transitPlanet as Planet]} ${ASPECTS_BG[item.aspect]} ${PLANETS_BG[item.natalPlanet as Planet]}`
}

function formatUpcoming(item: UpcomingTransitDetail): string {
  return `${PLANETS_BG[item.transitPlanet]} ${ASPECTS_BG[item.aspect]} ${PLANETS_BG[item.natalPlanet]}`
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

const PACING_LABEL: Record<'fast' | 'slow' | 'mixed' | 'quiet', string> = {
  fast:  'Бърз ритъм',
  slow:  'Бавен ритъм',
  mixed: 'Смесен ритъм',
  quiet: 'Тих ден',
}

const PACING_COLOR: Record<'fast' | 'slow' | 'mixed' | 'quiet', string> = {
  fast:  'rgba(252,211,77,0.85)',
  slow:  'rgba(125,211,252,0.85)',
  mixed: 'rgba(196,181,253,0.85)',
  quiet: 'rgba(203,213,225,0.85)',
}

function PacingMark({ emphasis }: { emphasis: 'fast' | 'slow' | 'mixed' | 'quiet' }) {
  const color = PACING_COLOR[emphasis]
  return (
    <View className="flex-row items-center" style={{ gap: 8 }}>
      <View className="h-1 w-1 rotate-45" style={{ backgroundColor: color }} />
      <Text className="text-[12px] font-medium" style={{ color, fontFamily: font.bodyMedium }}>
        {PACING_LABEL[emphasis]}
      </Text>
    </View>
  )
}

const STATE_COLOR: Record<'indigo' | 'amber' | 'emerald' | 'slate', string> = {
  indigo:  'rgba(165,180,252,0.85)',
  amber:   'rgba(252,211,77,0.85)',
  emerald: 'rgba(110,231,183,0.85)',
  slate:   'rgba(203,213,225,0.85)',
}

function EventStateMark({ label, tone }: { label: string; tone: keyof typeof STATE_COLOR }) {
  const color = STATE_COLOR[tone]
  return (
    <View className="flex-row items-center" style={{ gap: 6 }}>
      <View className="h-[3px] w-[3px] rotate-45" style={{ backgroundColor: color }} />
      <Text className="text-[12px] font-medium" style={{ color, fontFamily: font.bodyMedium }}>
        {label}
      </Text>
    </View>
  )
}

function getActiveState(item: ActiveTransitDetail): { label: string; tone: 'amber' | 'slate' } {
  if (item.applying) return { label: 'Засилва се', tone: 'amber' }
  return { label: 'Отслабва', tone: 'slate' }
}

function getUpcomingState(item: UpcomingTransitDetail): { label: string; tone: 'indigo' | 'amber' | 'emerald' } {
  if (item.hoursUntil <= 6) return { label: 'Скоро точен', tone: 'emerald' }
  if (item.hoursUntil <= 24) return { label: 'Засилва се', tone: 'amber' }
  return { label: 'Предстои', tone: 'indigo' }
}

function getLunarState(item: LunarEventDetail): { label: string; tone: 'indigo' | 'emerald' } {
  const hoursUntil = Math.round((new Date(item.exactAt).getTime() - Date.now()) / 36e5)
  if (hoursUntil <= 24) return { label: 'Скоро точен', tone: 'emerald' }
  return { label: 'Предстои', tone: 'indigo' }
}

interface EventRowProps {
  title: string
  summary: string
  meta: string
  badge: React.ReactNode
  onPress: () => void
  isLast?: boolean
}

function EventRow({ title, summary, meta, badge, onPress, isLast }: EventRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`py-5 ${isLast ? '' : 'border-b border-white/[0.05]'}`}
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <View className="flex-row flex-wrap items-baseline justify-between" style={{ gap: 12 }}>
        <Text style={{ fontFamily: font.bodyMedium }} className="flex-1 text-[16px] font-semibold text-slate-100">{title}</Text>
        {badge}
      </View>
      <Text style={{ fontFamily: font.body }} className="mt-1.5 text-[14px] font-light leading-[1.75] text-slate-300/90">
        {summary}
      </Text>
      <Text style={{ fontFamily: font.bodyMedium }} className="mt-2 text-[12px] font-medium text-slate-500">
        {meta}
      </Text>
    </Pressable>
  )
}

// Plain label + hairline rule — no Roman numeral (R5 scopes those to the
// Astrology Guide only, MOBILE_ALPHA_REDESIGN.md §21) — reuses the exact
// pattern LunarPhaseCard's own disclosure section labels already
// established ("Следваща повратна точка" etc.), not a new primitive.
function SectionMark({ title }: { title: string }) {
  return (
    <View className="mb-4 flex-row items-baseline" style={{ gap: 12 }}>
      <Text style={{ fontFamily: font.bodyMedium }} className="text-[12px] font-medium text-amber-300/85">
        {title}
      </Text>
      <View className="h-px flex-1 bg-slate-400/25" />
    </View>
  )
}

/**
 * EventModal — absolute View + Pressable backdrop + BackHandler per HT 4
 * ratification. Mirrors P.2-d NatalWheelLegend overlay pattern. No RN
 * Modal — pattern consistency over modal-semantic aesthetics per the
 * codified rule.
 */
function EventModal({ event, onClose }: { event: TransitEvent; onClose: () => void }) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose()
      return true
    })
    return () => subscription.remove()
  }, [onClose])

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 z-50 items-center justify-center"
      style={{ padding: 16 }}
    >
      <Pressable
        onPress={onClose}
        accessibilityLabel="Затвори"
        className="absolute inset-0 bg-[#04030a]/80"
      />
      <View
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0b0915]"
        style={{ maxHeight: '85%' }}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 28 }}>
          <View className="mb-6 flex-row items-start justify-between" style={{ gap: 16 }}>
            <View className="flex-1">
              <View className="mb-2 flex-row items-center" style={{ gap: 10 }}>
                <View className="h-1 w-1 rotate-45 bg-amber-300/90" />
                <Text style={{ fontFamily: font.bodyMedium }} className="text-[12px] font-medium text-amber-300/85">
                  Значение на събитието
                </Text>
              </View>
              <Text style={{ fontFamily: font.bodyMedium }} className="text-[19px] font-semibold leading-[1.15] tracking-tight text-slate-100">
                {event.title}
              </Text>
              <Text style={{ fontFamily: font.body }} className="mt-3 text-[14px] font-light leading-[1.8] text-slate-300">
                {event.summary}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="rounded-full p-2"
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text style={{ fontFamily: font.body }} className="text-[18px] text-slate-400">✕</Text>
            </Pressable>
          </View>

          <View className="border-l border-amber-300/40" style={{ paddingLeft: 20 }}>
            <Text style={{ fontFamily: font.bodyMedium }} className="mb-2 text-[12px] font-medium text-amber-300/85">
              Тълкувание
            </Text>
            <Text style={{ fontFamily: font.body }} className="text-[14px] leading-[1.85] text-slate-300/95">
              {event.detail}
            </Text>
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

/**
 * Ритъм · Транзити overview — pacing mark + Транзити/Речник tab toggle +
 * three sections (Активни / Следващи пикове / Лунни събития) + EventModal.
 * Mobile port of apps/web/components/horoscope/TransitOverviewCard.tsx (P.3-c).
 *
 * AstrologyReference reused verbatim from P.2-b for the Речник tab —
 * direct import, same data + same UI.
 */
export function TransitOverviewCard({ chartId }: TransitOverviewCardProps) {
  const { data: overview, isLoading, error } = useTransitOverview(chartId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<'transits' | 'reference'>('transits')

  const openEvent = (id: string) => {
    // A row tap directly opens the sheet in this architecture (no
    // separate select-then-open step) — Soft impact reads as the sheet
    // settling into place, per Apple's semantic taxonomy.
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)
    setSelectedId(id)
  }

  const selectedEvent = useMemo(() => {
    if (!overview || !selectedId) return null
    return [
      ...overview.activeTransits,
      ...overview.upcomingExacts,
      ...overview.lunarEvents,
    ].find((item) => item.id === selectedId) ?? null
  }, [overview, selectedId])

  return (
    <View>
      <View
        className="mb-8 flex-row flex-wrap items-center justify-between border-b border-white/[0.05] pb-5"
        style={{ gap: 12 }}
      >
        <Text style={{ fontFamily: font.body }} className="text-[14px] font-light text-slate-300">
          Натисни събитие, за да видиш значението му.
        </Text>
        {overview && <PacingMark emphasis={overview.pacing.emphasis} />}
      </View>

      <View className="mb-10 flex-row" style={{ gap: 28 }}>
        {[
          { id: 'transits' as const,  label: 'Транзити' },
          { id: 'reference' as const, label: 'Речник'   },
        ].map((tab) => {
          const isActive = activeView === tab.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => {
                hapticSelect()
                setActiveView(tab.id)
              }}
              className="relative pb-2"
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text
                style={{ fontFamily: font.bodyMedium }}
                className={`text-[16px] font-medium ${
                  isActive ? 'text-amber-200' : 'text-slate-400'
                }`}
              >
                {tab.label}
              </Text>
              {isActive && (
                <View className="absolute inset-x-0 h-px bg-amber-400/75" style={{ bottom: 0 }} />
              )}
            </Pressable>
          )
        })}
      </View>

      {activeView === 'reference' && <AstrologyReference />}

      {activeView === 'transits' && isLoading && (
        <View className="items-center py-12">
          <ActivityIndicator color="rgb(252, 211, 77)" size="small" />
          <Text style={{ fontFamily: font.body }} className="mt-4 text-[12px] text-slate-400">
            Четем небето…
          </Text>
        </View>
      )}

      {activeView === 'transits' && error && !isLoading && (
        <View className="border-l border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
          <Text style={{ fontFamily: font.body }} className="text-[14px] text-rose-300/90">
            Грешка при зареждане на транзитите.
          </Text>
        </View>
      )}

      {activeView === 'transits' && overview && !isLoading && !error && (
        <View style={{ gap: 56 }}>
          <View>
            <SectionMark title="Активни транзити" />
            <View className="border-t border-white/[0.05]">
              {overview.activeTransits.length > 0 ? (
                overview.activeTransits.slice(0, 6).map((item, i, arr) => {
                  const state = getActiveState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onPress={() => openEvent(item.id)}
                      title={formatActiveTransit(item)}
                      summary={item.summary}
                      meta={`Дом ${item.house} · орб ${item.orb.toFixed(1)}° · ${
                        item.speedBand === 'fast' ? 'бърз' : 'бавен'
                      } транзит`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                      isLast={i === arr.length - 1}
                    />
                  )
                })
              ) : (
                <Text style={{ fontFamily: font.body }} className="py-5 text-[14px] font-light text-slate-400">
                  Няма силни аспекти към наталната карта точно сега.
                </Text>
              )}
            </View>
          </View>

          <View>
            <SectionMark title="Следващи пикове" />
            <View className="border-t border-white/[0.05]">
              {overview.upcomingExacts.length > 0 ? (
                overview.upcomingExacts.map((item, i, arr) => {
                  const state = getUpcomingState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onPress={() => openEvent(item.id)}
                      title={formatUpcoming(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house} · след около ${item.hoursUntil} ч.`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                      isLast={i === arr.length - 1}
                    />
                  )
                })
              ) : (
                <Text style={{ fontFamily: font.body }} className="py-5 text-[14px] font-light text-slate-400">
                  Няма близки точни аспекти през следващите 7 дни.
                </Text>
              )}
            </View>
          </View>

          <View>
            <SectionMark title="Лунни събития" />
            <View className="border-t border-white/[0.05]">
              {overview.lunarEvents.length > 0 ? (
                overview.lunarEvents.map((item, i, arr) => {
                  const state = getLunarState(item)
                  return (
                    <EventRow
                      key={item.id}
                      onPress={() => openEvent(item.id)}
                      title={formatLunarEvent(item)}
                      summary={item.summary}
                      meta={`${formatDateTime(item.exactAt)} · дом ${item.house}${
                        !overview.birthTimeKnown ? ' · домът е приблизителен' : ''
                      }`}
                      badge={<EventStateMark label={state.label} tone={state.tone} />}
                      isLast={i === arr.length - 1}
                    />
                  )
                })
              ) : (
                <Text style={{ fontFamily: font.body }} className="py-5 text-[14px] font-light text-slate-400">
                  Няма открити близки новолуния или пълнолуния.
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedId(null)} />
      )}
    </View>
  )
}
