import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'

import type {
  Recommendation,
  RecommendationStatus,
} from '@stellaeum/core/stories/types'

import { pressFeedback } from '@/components/design-system/tokens'

const KIND_LABEL: Record<Recommendation['kind'], string> = {
  story: 'Разказ',
  film: 'Филм',
  episode: 'Епизод',
  book: 'Книга',
  series: 'Сериал',
}

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

function variantDoneLabel(kind: Recommendation['kind']): string {
  switch (kind) {
    case 'book': return 'Прочетох'
    case 'film': return 'Гледах'
    case 'episode': return 'Гледах'
    case 'series': return 'Гледах'
    case 'story': return 'Прочетох'
  }
}

interface RecommendationCardProps {
  recommendation: Recommendation
  status: RecommendationStatus
  onStatusChange: (status: RecommendationStatus) => void
  variant?: 'daily' | 'monthly'
}

/**
 * Mobile port of apps/web/components/stories/RecommendationCard.tsx (P.7-c1).
 *
 * Single recommendation card: kind badge + duration/pages + year, title +
 * Bulgarian gradient styling, original-language title (if present),
 * author eyebrow, tagline, expand/collapse toggle revealing three labeled
 * "why" blocks (howItConnects / whyNow / whatItGives), footer with status
 * label + two status buttons (saved toggle + consumed toggle).
 *
 * Drop AnimatePresence height transition on expand per HT 8 (data-display
 * discipline) — conditional render only. Daily variant defaults expanded;
 * monthly variant defaults collapsed.
 *
 * All Bulgarian strings (KIND_LABEL, statusLabel, undoLabel,
 * variantDoneLabel, fixed labels) mirror web verbatim per D2.
 */
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
    <View className="relative">
      {/* Kind badge + duration + year */}
      <View className="mb-5 flex-row flex-wrap items-center" style={{ gap: 10 }}>
        <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-bronze/90">
          {KIND_LABEL[r.kind]}
        </Text>
        {duration && (
          <>
            <View className="h-[3px] w-[3px] rotate-45 bg-bronze/60" />
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-300">
              {duration}
            </Text>
          </>
        )}
        {r.year && (
          <>
            <View className="h-[3px] w-[3px] rotate-45 bg-bronze/60" />
            <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.32em] text-slate-400">
              {r.year}
            </Text>
          </>
        )}
      </View>

      {/* Title */}
      <Text className="text-[22px] font-semibold leading-[1.15] tracking-tight text-bronze-text/95">
        {r.title}
      </Text>
      {r.titleEn && (
        <Text className="mt-1.5 text-[13px] font-light leading-snug text-slate-500">
          {r.titleEn}
        </Text>
      )}
      <Text className="mt-2 font-cinzel text-[10.5px] font-medium uppercase tracking-[0.28em] text-slate-400">
        {r.author}
      </Text>

      {/* Tagline */}
      <Text className="mt-4 text-[15.5px] font-light leading-[1.8] text-slate-300">
        {r.tagline}
      </Text>

      {/* Expand toggle */}
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="mt-5 flex-row items-center"
        style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 8 })}
      >
        <View className="h-px w-6 bg-slate-300/80" />
        <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-slate-200">
          {expanded ? 'Скрий обяснението' : 'Защо точно сега'}
        </Text>
      </Pressable>

      {/* Why blocks — conditional render only, no AnimatePresence (HT 8) */}
      {expanded && (
        <View className="mt-6 border-t border-slate-300/[0.08] pt-6" style={{ gap: 24 }}>
          <WhyBlock label="Връзка с твоето небе" body={r.howItConnects} />
          <WhyBlock label="Защо точно сега" body={r.whyNow} />
          <WhyBlock label="Какво ще ти даде" body={r.whatItGives} />
        </View>
      )}

      {/* Status footer */}
      <View
        className="mt-7 flex-row flex-wrap items-center border-t border-slate-300/[0.07] pt-6"
        style={{ gap: 16 }}
      >
        <Text className="font-cinzel text-[9.5px] uppercase tracking-[0.3em] text-slate-500">
          Статус · <Text className="text-slate-300">{statusLabel(r.kind, status)}</Text>
        </Text>
        <View className="flex-1" />

        <StatusButton
          active={status === 'saved'}
          onPress={() => {
            // Low-consequence binary toggle — lightest impact tier.
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onStatusChange(status === 'saved' ? 'new' : 'saved')
          }}
          label={status === 'saved' ? 'Извади от списъка' : 'Запази за по-късно'}
          tone="muted"
        />
        <StatusButton
          active={status === 'consumed'}
          onPress={() => onStatusChange(status === 'consumed' ? 'new' : 'consumed')}
          label={status === 'consumed' ? undoLabel(r.kind) : variantDoneLabel(r.kind)}
          tone="accent"
        />
      </View>
    </View>
  )
}

function WhyBlock({ label, body }: { label: string; body: string }) {
  return (
    <View>
      <Text className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.34em] text-bronze/85">
        {label}
      </Text>
      <Text className="text-[14.5px] font-light leading-[1.85] text-slate-200/95">
        {body}
      </Text>
    </View>
  )
}

interface StatusButtonProps {
  active: boolean
  onPress: () => void
  label: string
  tone: 'muted' | 'accent'
}

function StatusButton({ active, onPress, label, tone }: StatusButtonProps) {
  if (tone === 'accent') {
    return (
      <Pressable
        onPress={onPress}
        className={`rounded-full border px-4 py-2 ${
          active
            ? 'border-bronze/70 bg-bronze/15'
            : 'border-bronze/30 bg-bronze/[0.04]'
        }`}
        style={({ pressed }) => pressFeedback(pressed)}
      >
        <Text
          className={`font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] ${
            active ? 'text-bronze-text' : 'text-bronze-text'
          }`}
        >
          {label}
        </Text>
      </Pressable>
    )
  }
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressFeedback(pressed)}>
      <Text
        className={`font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] ${
          active ? 'text-bronze-text' : 'text-slate-400'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
