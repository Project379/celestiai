import { useState } from 'react'
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import * as WebBrowser from 'expo-web-browser'

import { BackButton } from '@/components/design-system/BackButton'
import { pressFeedback } from '@/components/design-system/tokens'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { getWebPricingUrl } from '@/lib/config/webAppUrl'
import { hapticSelect } from '@/lib/haptics'
import {
  useBillingPortal,
  useCancelSubscription,
  useReactivateSubscription,
  useSubscription,
} from '@/hooks/useSubscription'

/**
 * /you/premium — Batch 5 close. Replaces the P.5 stub. Ports web's
 * SettingsContent.tsx (status/management half only — the purchase/paywall
 * half stays halt-required, see COMPLETION-TRACKER.md). Also closes the
 * dead end left by Batch 4's Кръг teaser CTA, which already routes here.
 *
 * Free-state CTA has no native purchase flow yet (RevenueCat paywall UI is
 * its own halt-required batch) — it opens web's /pricing in the system
 * browser instead. That URL is a guarded config value (getWebPricingUrl),
 * not a hardcoded domain: web has no confirmed live deployment as of
 * 2026-08-14 (Vercel deploy still broken, founder-owned). If unset, the CTA
 * section doesn't render at all rather than linking nowhere — same
 * fail-loudly shape as RevenueCatProvider's placeholder-key check.
 */

const PREMIUM_FEATURES = [
  'Всичко от Безплатния план',
  'Любовно четене',
  'Кариерно четене',
  'Здравно четене',
  'Приоритетни AI отговори',
]

const CANCEL_REASONS = [
  { value: 'too_expensive', label: 'Твърде скъпо' },
  { value: 'not_using_enough', label: 'Не използвам достатъчно' },
  { value: 'not_meeting_expectations', label: 'Не отговаря на очакванията' },
  { value: 'other', label: 'Друга причина' },
]

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

function formatBgDate(timestampSeconds: number): string {
  return BG_DATE_FORMAT.format(new Date(timestampSeconds * 1000))
}

function formatBgDateFromString(dateStr: string): string {
  return BG_DATE_FORMAT.format(new Date(dateStr))
}

export default function PremiumScreen() {
  const backVisibility = useBackButtonVisibility()
  const { data, isLoading, isError, refetch } = useSubscription()
  const portal = useBillingPortal()
  const cancel = useCancelSubscription()
  const reactivate = useReactivateSubscription()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const tier = data?.tier ?? 'free'
  const subscriptionData = data?.subscriptionData ?? null
  const subscriptionExpiresAt = data?.subscriptionExpiresAt ?? null

  const isFree = tier === 'free'
  const isExpired =
    isFree && subscriptionExpiresAt !== null && new Date(subscriptionExpiresAt) < new Date()
  const isActive = !isFree && subscriptionData !== null && !subscriptionData.cancelAtPeriodEnd
  const isCancelling = !isFree && subscriptionData !== null && subscriptionData.cancelAtPeriodEnd

  const planName =
    subscriptionData?.interval === 'year'
      ? 'Stellaeum Премиум (Годишен)'
      : 'Stellaeum Премиум (Месечен)'

  function openCancelDialog() {
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  function closeCancelDialog() {
    setCancelDialogOpen(false)
    setCancelReason('')
  }

  function confirmCancel() {
    cancel.mutate(cancelReason || undefined, {
      onSuccess: () => closeCancelDialog(),
    })
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-bg">
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: 0, zIndex: 10 }, backVisibility.style]}
        pointerEvents={backVisibility.pointerEvents}
      >
        <BackButton />
      </Animated.View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 80 }}
        onScroll={backVisibility.onScroll}
        scrollEventThrottle={100}
      >
        <Text className="mb-1 font-cinzel text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-500">
          Профил
        </Text>
        <Text className="mb-8 text-[22px] font-semibold tracking-tight text-slate-100">
          Абонамент
        </Text>

        {isLoading && (
          <View className="items-center py-12">
            <ActivityIndicator color="#94a3b8" />
          </View>
        )}

        {isError && !isLoading && (
          <View className="items-center py-12">
            <Text className="mb-5 text-center text-[15px] leading-6 text-slate-300">
              Не успяхме да заредим абонамента ти.
            </Text>
            <Pressable
              onPress={() => refetch()}
              className="rounded-full border border-slate-700/60 px-6 py-2.5"
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text className="font-cinzel text-[10.5px] uppercase tracking-[0.32em] text-slate-200">
                Опитай отново
              </Text>
            </Pressable>
          </View>
        )}

        {!isLoading && !isError && (
          <>
            {isFree && !isExpired && (
              <View>
                <Badge tone="neutral" label="Безплатен план" />
                <Text className="mb-6 mt-4 text-[15px] leading-6 text-slate-400">
                  С Премиум получаваш:
                </Text>
                <FeatureList />
                <FreeStateCta />
              </View>
            )}

            {isExpired && (
              <View>
                <Badge tone="rose" label="Изтекъл абонамент" />
                {subscriptionExpiresAt && (
                  <Text className="mb-4 mt-4 text-[14px] text-slate-400">
                    Абонаментът ти изтече на{' '}
                    <Text className="text-slate-200">
                      {formatBgDateFromString(subscriptionExpiresAt)}
                    </Text>
                    .
                  </Text>
                )}
                <Text className="mb-6 text-[15px] leading-6 text-slate-400">
                  Абонирай се отново и продължи да се наслаждаваш на пълния достъп до Stellaeum.
                </Text>
                <FeatureList />
                <FreeStateCta />
              </View>
            )}

            {isActive && subscriptionData && (
              <View>
                <View className="mb-5 flex-row flex-wrap items-center gap-3">
                  <Text className="text-[16px] font-medium text-slate-100">{planName}</Text>
                  <Badge tone="emerald" label="Активен" />
                </View>

                <Row label="Следващо плащане" value={formatBgDate(subscriptionData.currentPeriodEnd)} />
                {subscriptionData.paymentMethodBrand && subscriptionData.paymentMethodLast4 && (
                  <Row
                    label="Метод на плащане"
                    value={`${subscriptionData.paymentMethodBrand} •••• ${subscriptionData.paymentMethodLast4}`}
                    last
                  />
                )}

                <View className="mt-6 flex-row flex-wrap gap-3">
                  <ActionButton
                    label="Управление на плащанията"
                    loading={portal.isPending}
                    onPress={() => {
                      hapticSelect()
                      portal.mutate()
                    }}
                  />
                  <ActionButton
                    label="Отказ от абонамент"
                    tone="rose"
                    onPress={() => {
                      hapticSelect()
                      openCancelDialog()
                    }}
                  />
                </View>
              </View>
            )}

            {isCancelling && subscriptionData && (
              <View>
                <View className="mb-5 flex-row flex-wrap items-center gap-3">
                  <Text className="text-[16px] font-medium text-slate-100">{planName}</Text>
                  <Badge tone="amber" label="Отменен" />
                </View>

                <View className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/[0.05] px-4 py-3">
                  <Text className="text-[14px] text-amber-200">
                    Премиум достъпът ти изтича на{' '}
                    <Text className="font-medium">{formatBgDate(subscriptionData.currentPeriodEnd)}</Text>
                    .
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-3">
                  <ActionButton
                    label="Възстанови абонамент"
                    loading={reactivate.isPending}
                    onPress={() => {
                      hapticSelect()
                      reactivate.mutate()
                    }}
                  />
                  <ActionButton
                    label="Управление на плащанията"
                    loading={portal.isPending}
                    onPress={() => {
                      hapticSelect()
                      portal.mutate()
                    }}
                  />
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={cancelDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCancelDialog}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <View className="w-full max-w-md rounded-2xl border border-slate-700/60 bg-[#0b0915] p-6">
            <Text className="mb-2 text-[18px] font-semibold text-slate-100">
              Сигурен/а ли си, че искаш да се откажеш?
            </Text>
            {subscriptionData && (
              <Text className="mb-5 text-[14px] text-slate-400">
                Достъпът ти до премиум функциите ще продължи до{' '}
                <Text className="text-slate-200">
                  {formatBgDate(subscriptionData.currentPeriodEnd)}
                </Text>
                .
              </Text>
            )}

            <Text className="mb-3 text-[14px] text-slate-400">
              Защо се отказваш? <Text className="text-slate-600">(по желание)</Text>
            </Text>
            <View className="mb-6 gap-2">
              {CANCEL_REASONS.map(({ value, label }) => {
                const selected = cancelReason === value
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      hapticSelect()
                      setCancelReason(selected ? '' : value)
                    }}
                    className={`rounded-lg border px-3 py-2.5 ${
                      selected
                        ? 'border-violet-400/50 bg-violet-500/[0.12]'
                        : 'border-slate-700/60 bg-white/[0.02]'
                    }`}
                    style={({ pressed }) => pressFeedback(pressed)}
                  >
                    <Text
                      className={`text-[14px] ${selected ? 'text-white' : 'text-slate-400'}`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <View className="gap-2">
              <Pressable
                onPress={() => {
                  hapticSelect()
                  confirmCancel()
                }}
                disabled={cancel.isPending}
                className="items-center rounded-lg bg-rose-600 px-5 py-3"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="text-[14px] font-medium text-white">
                  {cancel.isPending ? 'Отказване...' : 'Потвърди отказ'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticSelect()
                  closeCancelDialog()
                }}
                disabled={cancel.isPending}
                className="items-center rounded-lg border border-slate-700/60 px-5 py-3"
                style={({ pressed }) => pressFeedback(pressed)}
              >
                <Text className="text-[14px] font-medium text-slate-300">Запази абонамент</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function FeatureList() {
  return (
    <View className="mb-6 gap-2.5 border-y border-slate-800/60 py-5">
      {PREMIUM_FEATURES.map((feature) => (
        <View key={feature} className="flex-row items-start gap-2.5">
          <View className="mt-[9px] h-1 w-1 rotate-45 bg-amber-300/80" />
          <Text className="flex-1 text-[14px] leading-5 text-slate-300/90">{feature}</Text>
        </View>
      ))}
    </View>
  )
}

function FreeStateCta() {
  const url = getWebPricingUrl()
  if (!url) return null

  return (
    <View>
      <Pressable
        onPress={() => {
          hapticSelect()
          void WebBrowser.openBrowserAsync(url)
        }}
        className="self-start rounded-full border border-amber-300/40 bg-amber-400/10 px-6 py-3"
        style={({ pressed }) => pressFeedback(pressed)}
      >
        <Text className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-amber-200">
          Абонирай се на stellaeum.com
        </Text>
      </Pressable>
      <Text className="mt-3 text-[13px] leading-5 text-slate-500">
        Купуваш и управляваш абонамента от уеб приложението.
      </Text>
    </View>
  )
}

function Badge({ tone, label }: { tone: 'neutral' | 'rose' | 'emerald' | 'amber'; label: string }) {
  const toneClasses = {
    neutral: 'border-slate-700/60 bg-white/[0.03] text-slate-300',
    rose: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  }[tone]

  return (
    <View className={`self-start rounded-full border px-3 py-1 ${toneClasses}`}>
      <Text className="text-[10px] font-medium uppercase tracking-[0.2em]">{label}</Text>
    </View>
  )
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        last ? '' : 'border-b border-slate-800/60'
      }`}
    >
      <Text className="text-[14px] text-slate-500">{label}</Text>
      <Text className="text-[14px] text-slate-200">{value}</Text>
    </View>
  )
}

function ActionButton({
  label,
  onPress,
  loading,
  tone = 'default',
}: {
  label: string
  onPress: () => void
  loading?: boolean
  tone?: 'default' | 'rose'
}) {
  const toneClasses =
    tone === 'rose'
      ? 'border-rose-400/20 bg-rose-500/[0.05]'
      : 'border-slate-700/60 bg-white/[0.03]'
  const textClasses = tone === 'rose' ? 'text-rose-300' : 'text-slate-200'

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className={`rounded-lg border px-4 py-2.5 ${toneClasses}`}
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <Text className={`text-[14px] font-medium ${textClasses}`}>
        {loading ? 'Зареждане...' : label}
      </Text>
    </Pressable>
  )
}
