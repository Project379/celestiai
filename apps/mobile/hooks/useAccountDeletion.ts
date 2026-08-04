import { Alert } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError, useApiClient } from '@/lib/api/client'

interface DeletionStatus {
  deletionScheduledAt: string | null
}

const STATUS_KEY = ['account-deletion-status'] as const

const BG_DATE_FORMAT = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Sofia',
})

/**
 * Account-deletion status + request/cancel mutations (P.10-b), backed by
 * B.0h's GET/POST/DELETE /api/gdpr/delete-account. Mirrors web's
 * DataAccountPage + DeletionPendingBanner split: this hook is the single
 * source of truth both the settings screen and the persistent banner
 * read from, so cancelling in either place updates both immediately.
 */
export function useAccountDeletion() {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()

  const status = useQuery<DeletionStatus>({
    queryKey: STATUS_KEY,
    queryFn: async () => (await apiFetch('/api/gdpr/delete-account')) as DeletionStatus,
  })

  const requestDeletion = useMutation<{ scheduledDeletion: string }, Error>({
    mutationFn: async () => {
      try {
        return (await apiFetch('/api/gdpr/delete-account', { method: 'POST' })) as {
          scheduledDeletion: string
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          throw new Error('ALREADY_PENDING')
        }
        throw err
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      Alert.alert(
        'Заявката е приета',
        `Акаунтът ще бъде изтрит на ${BG_DATE_FORMAT.format(new Date(data.scheduledDeletion))}, освен ако не откажеш преди това.`,
      )
    },
    onError: (err) => {
      Alert.alert(
        'Нещо се обърка',
        err.message === 'ALREADY_PENDING'
          ? 'Вече има чакаща заявка за изтриване.'
          : 'Заявката не се изпрати. Опитай отново.',
      )
    },
  })

  const cancelDeletion = useMutation<void, Error>({
    mutationFn: async () => {
      await apiFetch('/api/gdpr/delete-account', { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY })
      Alert.alert('Изтриването е отменено', 'Акаунтът отново е активен.')
    },
    onError: () => {
      Alert.alert('Нещо се обърка', 'Не успяхме да отменим изтриването. Опитай отново.')
    },
  })

  return { status, requestDeletion, cancelDeletion }
}
