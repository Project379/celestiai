import { Alert } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as WebBrowser from 'expo-web-browser'

import { useApiClient } from '@/lib/api/client'

export interface SubscriptionData {
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
  interval: 'month' | 'year' | null
}

export interface SubscriptionOverview {
  tier: 'free' | 'premium'
  subscriptionStatus: string
  subscriptionData: SubscriptionData | null
  subscriptionExpiresAt: string | null
}

export const SUBSCRIPTION_KEY = ['subscription-overview'] as const

/** GET /api/stripe/subscription — mirrors web's AccountSubscriptionPage fetch. */
export function useSubscription() {
  const { apiFetch } = useApiClient()

  return useQuery<SubscriptionOverview>({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: async () => (await apiFetch('/api/stripe/subscription')) as SubscriptionOverview,
  })
}

/**
 * POST /api/stripe/portal — mirrors web's handleOpenPortal. Opens the
 * Stripe Billing Portal in the system browser (expo-web-browser, already a
 * mobile dependency) rather than window.location.href, which has no mobile
 * equivalent.
 */
export function useBillingPortal() {
  const { apiFetch } = useApiClient()

  return useMutation<void, Error>({
    mutationFn: async () => {
      const data = (await apiFetch('/api/stripe/portal', { method: 'POST' })) as { url?: string }
      if (!data.url) throw new Error('NO_URL')
      await WebBrowser.openBrowserAsync(data.url)
    },
    onError: () => {
      Alert.alert(
        'Нещо се обърка',
        'Не успяхме да отворим управлението на плащанията. Опитай отново.',
      )
    },
  })
}

/** POST /api/stripe/cancel — mirrors web's handleConfirmCancel. */
export function useCancelSubscription() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error, string | undefined>({
    mutationFn: async (reason) => {
      await apiFetch('/api/stripe/cancel', {
        method: 'POST',
        body: JSON.stringify({ reason }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
    },
    onError: () => {
      Alert.alert('Нещо се обърка', 'Заявката не се изпрати. Опитай отново.')
    },
  })
}

/** DELETE /api/stripe/cancel — mirrors web's handleReactivate. */
export function useReactivateSubscription() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<void, Error>({
    mutationFn: async () => {
      await apiFetch('/api/stripe/cancel', { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY })
    },
    onError: () => {
      Alert.alert('Нещо се обърка', 'Не успяхме да възстановим абонамента. Опитай отново.')
    },
  })
}
