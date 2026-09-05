import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import type {
  PersonalizedRecommendation,
  RecommendationRerollReason,
  RecommendationSentiment,
  RecommendationStatus,
} from '@stellaeum/core/recommendations/schemas'

import { pressFeedback } from '@/components/design-system/tokens'
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

const SENTIMENTS: { value: RecommendationSentiment; label: string }[] = [
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

  const runAction = (action: () => Promise<unknown>) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    void action()
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-slate-300/[0.09] bg-slate-950/20 p-5">
      <View className="overflow-hidden rounded-2xl border border-slate-300/10 bg-slate-900/70" style={{ aspectRatio: 2 / 3 }}>
        {work.image && !imageFailed ? (
          <Image
            source={{ uri: work.image.url }}
            accessibilityLabel={work.image.alt}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center font-cinzel text-[10px] uppercase tracking-[0.28em] text-slate-500">
              {isMovie ? 'Постерът не е наличен' : 'Корицата не е налична'}
            </Text>
          </View>
        )}
      </View>
      {work.image?.attribution && !imageFailed && (
        <Text className="mt-2 text-[10px] leading-relaxed text-slate-600">{work.image.attribution}</Text>
      )}

      <View className="mt-6 flex-row flex-wrap items-center" style={{ gap: 9 }}>
        <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.3em] text-bronze/90">
          {isMovie ? 'Филм' : 'Книга'}
        </Text>
        {duration && <Meta text={duration} />}
        {work.year && <Meta text={String(work.year)} />}
      </View>

      <Text className="mt-4 text-[24px] font-semibold leading-tight tracking-tight text-bronze-text/95">
        {work.title}
      </Text>
      {work.originalTitle && work.originalTitle !== work.title && (
        <Text className="mt-1.5 text-[13px] font-light text-slate-500">{work.originalTitle}</Text>
      )}
      <Text className="mt-2 font-cinzel text-[10px] font-medium uppercase tracking-[0.25em] text-slate-400">
        {work.creator}
      </Text>
      <Text className="mt-4 text-[15.5px] font-light leading-[1.75] text-slate-200">
        {work.tagline}
      </Text>

      {locked ? (
        <View className="mt-5 flex-row items-center" style={{ gap: 8 }}>
          <LockBadge />
          <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-bronze/80">
            {RECS_DETAIL_LOCKED}
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            onPress={() => setExpanded((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            className="mt-5 flex-row items-center"
            style={({ pressed }) => ({ ...pressFeedback(pressed), gap: 8 })}
          >
            <View className="h-px w-6 bg-slate-300/70" />
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-200">
              {expanded ? 'Скрий обяснението' : 'Защо точно сега'}
            </Text>
          </Pressable>

          {expanded && (
            <View className="mt-6 border-t border-slate-300/[0.08] pt-6" style={{ gap: 20 }}>
              <WhyBlock label="Връзка с твоето небе" body={recommendation.explanation.howItConnects} />
              <WhyBlock label="Защо точно сега" body={recommendation.explanation.whyNow} />
              <WhyBlock label="Какво ще ти даде" body={recommendation.explanation.whatItGives} />
              <Text className="text-[14px] font-light leading-[1.8] text-slate-400">{work.description}</Text>
            </View>
          )}

          <View className="mt-7 border-t border-slate-300/[0.08] pt-6">
            <Text className="font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-500">
              Статус · <Text className="text-slate-300">{statusLabel(isMovie, recommendation.status)}</Text>
            </Text>
            <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
              <ActionButton
                active={recommendation.status === 'saved'}
                disabled={isMutating}
                onPress={() => runAction(() => onFeedback(
                  recommendation,
                  recommendation.status === 'saved' ? 'new' : 'saved',
                  null,
                ))}
                label={recommendation.status === 'saved' ? 'Премахни' : 'Запази'}
              />
              <ActionButton
                active={recommendation.status === 'consumed'}
                accent
                disabled={isMutating}
                onPress={() => runAction(() => onFeedback(
                  recommendation,
                  recommendation.status === 'consumed' ? 'new' : 'consumed',
                  null,
                ))}
                label={recommendation.status === 'consumed' ? 'Отмени' : isMovie ? 'Гледан' : 'Прочетена'}
              />
            </View>

            {recommendation.status === 'consumed' && (
              <View className="mt-5">
                <Text className="mb-3 font-cinzel text-[9px] uppercase tracking-[0.25em] text-slate-500">
                  Как ти се стори?
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {SENTIMENTS.map((item) => (
                    <ActionButton
                      key={item.value}
                      active={recommendation.sentiment === item.value}
                      disabled={isMutating}
                      onPress={() => runAction(() => onFeedback(recommendation, 'consumed', item.value))}
                      label={item.label}
                    />
                  ))}
                </View>
              </View>
            )}

            <View className="mt-5">
              {recommendation.rerollsRemaining > 0 ? (
                <>
                  <Pressable
                    disabled={isMutating}
                    onPress={() => setShowRerollReasons((value) => !value)}
                    accessibilityRole="button"
                    style={({ pressed }) => pressFeedback(pressed)}
                  >
                    <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                      Друга препоръка · остава 1 смяна
                    </Text>
                  </Pressable>
                  {showRerollReasons && (
                    <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                      <ActionButton
                        disabled={isMutating}
                        onPress={() => runAction(() => onReroll(recommendation, 'already_consumed'))}
                        label={isMovie ? 'Вече гледан' : 'Вече прочетена'}
                      />
                      <ActionButton
                        disabled={isMutating}
                        onPress={() => runAction(() => onReroll(recommendation, 'not_interested'))}
                        label="Не ме привлича"
                      />
                      <ActionButton
                        disabled={isMutating}
                        onPress={() => runAction(() => onReroll(recommendation, 'not_now'))}
                        label="Не сега"
                      />
                    </View>
                  )}
                </>
              ) : (
                <Text className="font-cinzel text-[9px] uppercase tracking-[0.25em] text-slate-600">
                  Смяната за този период е използвана
                </Text>
              )}
            </View>
          </View>
        </>
      )}
    </View>
  )
}

function Meta({ text }: { text: string }) {
  return (
    <>
      <View className="h-[3px] w-[3px] rotate-45 bg-bronze/60" />
      <Text className="font-cinzel text-[9.5px] uppercase tracking-[0.28em] text-slate-400">{text}</Text>
    </>
  )
}

function WhyBlock({ label, body }: { label: string; body: string }) {
  return (
    <View>
      <Text className="mb-1.5 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-bronze/85">
        {label}
      </Text>
      <Text className="text-[14.5px] font-light leading-[1.8] text-slate-200/95">{body}</Text>
    </View>
  )
}

function ActionButton({
  active = false,
  accent = false,
  disabled = false,
  label,
  onPress,
}: {
  active?: boolean
  accent?: boolean
  disabled?: boolean
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      className={`rounded-full border px-3 py-2 ${
        active || accent
          ? 'border-bronze/40 bg-bronze/[0.08]'
          : 'border-slate-300/15'
      } ${disabled ? 'opacity-50' : ''}`}
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <Text className={`font-cinzel text-[9px] font-semibold uppercase tracking-[0.2em] ${
        active || accent ? 'text-bronze-text' : 'text-slate-400'
      }`}>
        {label}
      </Text>
    </Pressable>
  )
}

function statusLabel(isMovie: boolean, status: RecommendationStatus): string {
  if (status === 'saved') return 'Запазено'
  if (status === 'consumed') return isMovie ? 'Гледан' : 'Прочетена'
  return isMovie ? 'Негледан' : 'Непрочетена'
}
