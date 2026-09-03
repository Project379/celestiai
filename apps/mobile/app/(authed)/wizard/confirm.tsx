import { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useFormContext, useWatch } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import type {
  ApproximateTimeRange,
  BirthData,
} from '@stellaeum/core/charts/schemas'
import { pressFeedback } from '@/components/design-system/tokens'
import { StepIndicator } from '@/components/wizard/StepIndicator'
import type { FirstChartSummary } from '@/hooks/useFirstChart'
import { posthog } from '@/lib/analytics/posthog'
import { ApiError, useApiClient } from '@/lib/api/client'
import { hapticInvite, hapticSelect } from '@/lib/haptics'

const TIME_RANGE_LABELS: Record<ApproximateTimeRange, string> = {
  morning: 'Сутрин (06:00–12:00)',
  afternoon: 'Следобед (12:00–18:00)',
  evening: 'Вечер (18:00–23:59)',
  night: 'Нощ (00:00–06:00)',
}

function formatBgDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso + 'T00:00:00'))
}

export default function WizardConfirmScreen() {
  const router = useRouter()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useFormContext<BirthData>()
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const name = useWatch({ control, name: 'name' })
  const birthDate = useWatch({ control, name: 'birthDate' })
  const birthTimeKnown = useWatch({ control, name: 'birthTimeKnown' })
  const birthTime = useWatch({ control, name: 'birthTime' })
  const approximateTimeRange = useWatch({
    control,
    name: 'approximateTimeRange',
  })
  const cityName = useWatch({ control, name: 'cityName' })
  const latitude = useWatch({ control, name: 'latitude' })
  const longitude = useWatch({ control, name: 'longitude' })
  const manualCoordinates = useWatch({ control, name: 'manualCoordinates' })

  const getTimeDisplay = (): string => {
    if (birthTimeKnown && birthTime) return birthTime
    if (!birthTimeKnown && approximateTimeRange) {
      return TIME_RANGE_LABELS[approximateTimeRange]
    }
    return 'Не е посочено'
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Име на картата', value: name || '-' },
    { label: 'Дата на раждане', value: formatBgDate(birthDate) || '-' },
    { label: 'Час на раждане', value: getTimeDisplay() },
    { label: 'Място', value: cityName || '-' },
  ]

  if (manualCoordinates || latitude || longitude) {
    rows.push({
      label: 'Координати',
      value: `${typeof latitude === 'number' ? latitude.toFixed(4) : '0'}, ${
        typeof longitude === 'number' ? longitude.toFixed(4) : '0'
      }`,
    })
  }

  const hasErrors = Object.keys(errors).length > 0

  const onSubmit = async (data: BirthData) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const created = (await apiFetch('/api/birth-data', {
        method: 'POST',
        body: JSON.stringify(data),
      })) as { id: string; birth_date: string; birth_time_known: boolean }

      // Seed the ['first-chart'] cache directly with the row the POST just
      // returned instead of leaving it stale (staleTime Infinity, no auto-
      // revalidate — see useFirstChart's header comment). Without this,
      // AuthedLayout's forced-wizard effect keeps reading a stale `null`
      // after this save, redirects straight back to /wizard/date, whose own
      // mount-effect re-fetches /api/birth-data, sees the chart now exists,
      // and bounces back to '/' — repeating indefinitely and flooding
      // GET /api/birth-data on every cycle.
      queryClient.setQueryData<FirstChartSummary>(['first-chart'], {
        id: created.id,
        birth_date: created.birth_date,
        birth_time_known: created.birth_time_known,
      })

      // Bare event — no birth date/time/place, no name, no coordinates.
      posthog?.capture('birth data submitted')

      router.replace('/')
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? ((e.body as { error?: string } | null)?.error ??
            'Грешка при запазване')
          : 'Неизвестна грешка'
      setSubmitError(msg)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 64,
        }}
      >
        <StepIndicator currentStep={4} />

        <View className="mb-8">
          <Text className="font-cinzel text-[9.5px] font-semibold uppercase tracking-[0.38em] text-bronze/75">
            IV · Преглед
          </Text>
          <Text className="mt-2 text-[22px] font-semibold leading-tight text-slate-100">
            Подготвяме картата
          </Text>
          <Text className="mt-3 text-[14.5px] font-light leading-relaxed text-slate-400">
            Провери данните преди да изчислим позициите на планетите.
          </Text>
        </View>

        <View className="mb-7 border-y border-white/[0.05]">
          {rows.map((row, idx) => (
            <View
              key={row.label}
              className={`flex-row items-baseline justify-between py-4 ${
                idx < rows.length - 1 ? 'border-b border-white/[0.05]' : ''
              }`}
              style={{ gap: 16 }}
            >
              <Text className="font-cinzel text-[9px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {row.label}
              </Text>
              <Text className="flex-1 text-right text-[15px] font-medium tabular-nums text-slate-100">
                {row.value}
              </Text>
            </View>
          ))}
        </View>

        {birthTimeKnown === false && approximateTimeRange && (
          <Text className="mb-7 text-[12px] leading-relaxed text-slate-500">
            Когато часът не е точен, картата се изчислява по обяд на местно
            време — така грешката при неизвестен час е най-малка. Избраният
            период се запазва за контекст при тълкуването, но не влияе върху
            позициите на планетите. Възходящият знак е приблизителен, затова
            тълкуването му е ориентировъчно.
          </Text>
        )}

        {hasErrors && (
          <View className="mb-5 border-l-2 border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
            <Text className="text-[13px] text-rose-300/90">
              Моля, попълни всички задължителни полета преди да запазиш.
            </Text>
          </View>
        )}

        {submitError && (
          <View className="mb-5 border-l-2 border-rose-300/50 bg-rose-500/[0.04] px-5 py-3">
            <Text className="text-[13px] text-rose-300/90">{submitError}</Text>
          </View>
        )}

        <View className="mt-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => {
              hapticSelect()
              router.back()
            }}
            disabled={isSubmitting}
            className="px-2 py-2"
            style={({ pressed }) => (isSubmitting ? { opacity: 0.45 } : pressFeedback(pressed))}
          >
            <Text className="font-cinzel text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
              ‹ Назад
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              hapticInvite()
              handleSubmit(onSubmit)()
            }}
            disabled={isSubmitting || hasErrors}
            className="rounded-full border border-bronze/50 bg-bronze/[0.04] px-7 py-3"
            style={({ pressed }) =>
              isSubmitting || hasErrors ? { opacity: 0.45 } : pressFeedback(pressed)
            }
          >
            {isSubmitting ? (
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <ActivityIndicator color="rgb(252, 211, 77)" size="small" />
                <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
                  Запазване…
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <View
                  className="h-1 w-1 bg-bronze/90"
                  style={{
                    transform: [{ rotate: '45deg' }],
                    shadowColor: 'rgb(184, 118, 62)',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                />
                <Text className="font-cinzel text-[10.5px] font-semibold uppercase tracking-[0.32em] text-bronze-text">
                  Изчисли картата
                </Text>
                <View
                  className="h-1 w-1 bg-bronze/90"
                  style={{
                    transform: [{ rotate: '45deg' }],
                    shadowColor: 'rgb(184, 118, 62)',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.7,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                />
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
