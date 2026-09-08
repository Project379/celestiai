import { useEffect, useState } from 'react'
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated from 'react-native-reanimated'
import * as WebBrowser from 'expo-web-browser'

import { BackButton } from '@/components/design-system/BackButton'
import { pressFeedback } from '@/components/design-system/tokens'
import { useBackButtonVisibility } from '@/components/design-system/useBackButtonVisibility'
import { TierGateLoading } from '@/components/tier/PremiumLock'
import { AI_GENERATED_DISCLOSURE_BG, PAYWALL_DISCLOSURE } from '@/lib/legal/compliance-copy'
import { getWebAppUrl, getWebPricingUrl } from '@/lib/config/webAppUrl'
import { hapticSelect } from '@/lib/haptics'
import {
  PAYWALL,
  PURCHASE_FLOW_COPY,
  STORE_MANAGED_SUBSCRIPTION,
  STORE_SUBSCRIPTIONS_URL,
} from '@/lib/tier/subscription-copy'
import { useOfferings, usePurchaseFlow } from '@/hooks/usePaywall'
import {
  useBillingPortal,
  useCancelSubscription,
  useReactivateSubscription,
  useSubscription,
} from '@/hooks/useSubscription'

/**
 * /you/premium — subscription status/management + the RevenueCat paywall.
 *
 * Status half (Batch 5): ports web's SettingsContent.tsx — free / expired
 * / active (Stripe) / cancelling (Stripe) / store-managed (App Store or
 * Play). Also the destination of Batch 4's Кръг teaser CTA and the Oracle
 * cap CTA.
 *
 * Purchase half (Phase 2): the free / expired branches render
 * `<PaywallSection />` — offerings-driven, prices from the store, purchase
 * + restore via `usePaywall`, server tier as the gate (see that hook).
 * `<FreeStateCta />` (web /pricing in the system browser) remains only as
 * the fallback when offerings can't load, e.g. the SDK isn't configured
 * under Expo Go.
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
  // Lifted here, not inside PaywallSection: when the server tier flips
  // after a purchase, the free-tier branch (and PaywallSection with it)
  // unmounts. The flow's poll must outlive that.
  const purchaseFlow = usePurchaseFlow()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const tier = data?.tier ?? 'free'
  const subscriptionProvider = data?.subscriptionProvider ?? 'stripe'
  const subscriptionData = data?.subscriptionData ?? null
  const subscriptionExpiresAt = data?.subscriptionExpiresAt ?? null

  const isFree = tier === 'free'
  const isExpired =
    isFree && subscriptionExpiresAt !== null && new Date(subscriptionExpiresAt) < new Date()
  // Stripe-only: `subscriptionData` (renewal date, payment method, the
  // portal/cancel/reactivate actions) is populated only for a Stripe sub.
  // The `subscriptionProvider === 'stripe'` guard is explicit so an IAP
  // subscriber can never be routed into a Stripe-management branch, even
  // if `subscriptionData` were ever non-null for one.
  const isStripe = subscriptionProvider === 'stripe'
  const isActive =
    !isFree && isStripe && subscriptionData !== null && !subscriptionData.cancelAtPeriodEnd
  const isCancelling =
    !isFree && isStripe && subscriptionData !== null && subscriptionData.cancelAtPeriodEnd
  // Premium bought through the App Store / Play Store (RevenueCat). No
  // `subscriptionData`; managed in the store's own subscription settings,
  // never the Stripe portal (Apple guideline 3.1.1). Without this branch a
  // store subscriber falls through every case and sees an empty screen.
  const isStoreManaged = !isFree && subscriptionProvider === 'revenuecat'

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

        {/* Post-purchase activation window — rendered at screen level so it
            survives the free-branch unmount when the server tier flips. */}
        {!isLoading && !isError &&
          (purchaseFlow.status === 'activating' || purchaseFlow.status === 'active') && (
            <View className="items-center py-16">
              <ActivityIndicator color="#94a3b8" />
              <Text className="mt-5 text-center text-[15px] leading-6 text-slate-300">
                {PURCHASE_FLOW_COPY.activating}
              </Text>
            </View>
          )}

        {!isLoading && !isError && purchaseFlow.status === 'activation-timeout' && (
          <View className="items-center py-16">
            <Text className="text-center text-[15px] leading-7 text-slate-300">
              {PURCHASE_FLOW_COPY.activationTimeout}
            </Text>
          </View>
        )}

        {!isLoading &&
          !isError &&
          purchaseFlow.status !== 'activating' &&
          purchaseFlow.status !== 'active' &&
          purchaseFlow.status !== 'activation-timeout' && (
          <>
            {isFree && !isExpired && (
              <View>
                <Badge tone="neutral" label="Безплатен план" />
                <Text className="mb-6 mt-4 text-[15px] leading-6 text-slate-400">
                  С Премиум получаваш:
                </Text>
                <FeatureList />
                <PaywallSection flow={purchaseFlow} />
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
                <PaywallSection flow={purchaseFlow} />
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

                <View className="mb-6 rounded-2xl border border-bronze/20 bg-bronze/[0.05] px-4 py-3">
                  <Text className="text-[14px] text-bronze-text">
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

            {isStoreManaged && (
              <View>
                <View className="mb-5 flex-row flex-wrap items-center gap-3">
                  <Text className="text-[16px] font-medium text-slate-100">
                    {STORE_MANAGED_SUBSCRIPTION.planName}
                  </Text>
                  <Badge tone="emerald" label={STORE_MANAGED_SUBSCRIPTION.statusBadge} />
                </View>

                {subscriptionExpiresAt && (
                  <Row
                    label={STORE_MANAGED_SUBSCRIPTION.activeUntilLabel}
                    value={formatBgDateFromString(subscriptionExpiresAt)}
                    last
                  />
                )}

                <Text className="mb-6 mt-6 text-[14px] leading-6 text-slate-400">
                  {STORE_MANAGED_SUBSCRIPTION.managedNote}
                </Text>

                <View className="flex-row flex-wrap gap-3">
                  <ActionButton
                    label={STORE_MANAGED_SUBSCRIPTION.manageButtonLabel}
                    onPress={() => {
                      hapticSelect()
                      void Linking.openURL(STORE_SUBSCRIPTIONS_URL)
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
          <View className="mt-[9px] h-1 w-1 rotate-45 bg-bronze/80" />
          <Text className="flex-1 text-[14px] leading-5 text-slate-300/90">{feature}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * The offerings-driven paywall (Phase 2). Renders the packages from
 * RevenueCat's *current* offering (never a by-identifier lookup), each
 * priced from `product.priceString` — never a hardcoded figure. The
 * purchase flow (`usePurchaseFlow`) is owned by `PremiumScreen`, not
 * here — it treats a user-cancel as a no-op and, on success, waits for
 * the server tier to flip before anything unlocks (SERVER TIER IS THE
 * GATE — the SDK entitlement is not trusted for gating), and the
 * "activating" / "coming soon" views are rendered at screen level so
 * they outlive this component's unmount. If offerings can't load (SDK
 * not configured, e.g. Expo Go) it falls back to the web-checkout hatch.
 */
function PaywallSection({ flow }: { flow: ReturnType<typeof usePurchaseFlow> }) {
  const { status, purchase, restore, reset } = flow
  const { data: packages, isLoading, isError } = useOfferings()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [restoreNote, setRestoreNote] = useState(false)

  const purchasing = status === 'purchasing'

  // A user dismissing the native sheet is not an error — drop straight
  // back to the paywall (reset in an effect, never during render).
  useEffect(() => {
    if (status === 'cancelled') reset()
  }, [status, reset])

  if (isLoading) {
    return (
      <View className="py-6">
        <TierGateLoading variant="block" />
      </View>
    )
  }

  if (isError || !packages || packages.length === 0) {
    return (
      <View>
        <Text className="mb-4 text-[13px] leading-5 text-slate-500">
          {PURCHASE_FLOW_COPY.offeringsUnavailable}
        </Text>
        <FreeStateCta />
      </View>
    )
  }

  const selected =
    packages.find((p) => p.packageType === selectedType) ??
    packages.find((p) => p.packageType === 'ANNUAL') ??
    packages[0]

  return (
    <View>
      <View className="gap-3">
        {packages.map((p) => {
          const isSel = selected.pkg.identifier === p.pkg.identifier
          const label = PAYWALL.packageLabel[p.packageType] ?? p.priceString
          const period = PAYWALL.pricePeriod[p.packageType]
          return (
            <Pressable
              key={p.pkg.identifier}
              onPress={() => {
                hapticSelect()
                setSelectedType(p.packageType)
                setRestoreNote(false)
              }}
              className={`rounded-2xl border px-4 py-3.5 ${
                isSel ? 'border-bronze/50 bg-bronze/[0.08]' : 'border-slate-700/60 bg-white/[0.02]'
              }`}
              style={({ pressed }) => pressFeedback(pressed)}
            >
              <Text className="text-[15px] font-medium text-slate-100">{label}</Text>
              <Text className="mt-0.5 text-[14px] text-slate-400">
                {p.priceString}
                {period ? ` ${period}` : ''}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Compliance disclosure — before the purchase button (point of decision). */}
      <View className="mt-5 gap-2">
        <Text className="text-[12px] leading-5 text-slate-500">
          {PAYWALL_DISCLOSURE.chargedToStore}
        </Text>
        <Text className="text-[12px] leading-5 text-slate-500">
          {PAYWALL_DISCLOSURE.autoRenewal}
        </Text>
        <Text className="text-[12px] leading-5 text-slate-500">
          {PAYWALL_DISCLOSURE.cancelInstructions}
        </Text>
        <Text className="text-[12px] leading-5 text-slate-500">{AI_GENERATED_DISCLOSURE_BG}</Text>
        <View className="flex-row flex-wrap gap-x-5 gap-y-1 pt-1">
          <LegalLink label={PAYWALL_DISCLOSURE.termsLinkLabel} path="/terms" />
          <LegalLink label={PAYWALL_DISCLOSURE.privacyLinkLabel} path="/privacy" />
        </View>
      </View>

      {status === 'error' && (
        <Text className="mt-4 text-center text-[13px] text-rose-300/85">
          {PURCHASE_FLOW_COPY.error}
        </Text>
      )}
      {restoreNote && (
        <Text className="mt-4 text-center text-[13px] text-slate-400">
          {PURCHASE_FLOW_COPY.restoreNothingFound}
        </Text>
      )}

      <Pressable
        onPress={() => {
          hapticSelect()
          setRestoreNote(false)
          void purchase(selected.pkg)
        }}
        disabled={purchasing}
        className="mt-5 items-center self-stretch rounded-full border border-bronze/40 bg-bronze/15 px-6 py-3.5"
        style={({ pressed }) => pressFeedback(pressed)}
      >
        {purchasing ? (
          <ActivityIndicator color="rgba(253, 230, 138, 0.9)" />
        ) : (
          <Text className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-bronze-text">
            {PAYWALL.purchaseButton}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          hapticSelect()
          // Show "nothing to restore" ONLY for a genuine empty restore —
          // not for a cancel or an error (the error line handles those).
          void restore().then((result) => setRestoreNote(result === 'none'))
        }}
        disabled={purchasing}
        className="mt-3 items-center py-2"
        style={({ pressed }) => pressFeedback(pressed)}
      >
        <Text className="text-[12.5px] text-slate-400 underline">{PAYWALL.restoreButton}</Text>
      </Pressable>
    </View>
  )
}

function LegalLink({ label, path }: { label: string; path: '/terms' | '/privacy' }) {
  const base = getWebAppUrl()
  if (!base) return null
  return (
    <Pressable
      onPress={() => {
        hapticSelect()
        void WebBrowser.openBrowserAsync(`${base}${path}`)
      }}
      style={({ pressed }) => pressFeedback(pressed)}
    >
      <Text className="text-[12px] text-slate-400 underline">{label}</Text>
    </Pressable>
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
        className="self-start rounded-full border border-bronze/40 bg-bronze/10 px-6 py-3"
        style={({ pressed }) => pressFeedback(pressed)}
      >
        <Text className="font-cinzel text-[11px] font-semibold uppercase tracking-[0.3em] text-bronze-text">
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
    amber: 'border-bronze/30 bg-bronze/10 text-bronze',
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
