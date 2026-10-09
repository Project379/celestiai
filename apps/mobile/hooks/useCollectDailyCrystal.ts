import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useApiClient } from '@/lib/api/client'

/**
 * «Събери»: POST /api/crystals/daily/collect. Open to every signed-in user (free
 * and premium). Idempotent per user per day on the server, so a double tap is safe.
 * Reading the crystal on Днес never collects; only this call does.
 */
export function useCollectDailyCrystal(onCollected: () => Promise<void> | void) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)

  const collect = useCallback(async () => {
    if (pending) return
    setPending(true)
    try {
      await apiFetch('/api/crystals/daily/collect', { method: 'POST' })
      await queryClient.invalidateQueries({ queryKey: ['crystals-daily-streak'] })
      await onCollected()
    } catch (err) {
      if (__DEV__) console.warn('[useCollectDailyCrystal] failed:', err)
    } finally {
      setPending(false)
    }
  }, [apiFetch, onCollected, pending, queryClient])

  return { collect, pending }
}
