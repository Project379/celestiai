import { useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQueryClient } from '@tanstack/react-query'
import { isNewFormatHoroscope } from '@stellaeum/core/dnes/text-fit'

import { useApiClient } from '@/lib/api/client'
import { getCacheKey, getTodayString } from '@/hooks/useDailyHoroscope'

/**
 * Днес v2: if today's stored horoscope is still in the old long format, ask the server to
 * regenerate THAT row once with the 3-part prompt (`?upgrade=1`). The server only does it when
 * FF_DNES_V2_SERVER is on, and never counts it against anything (the route has no quota).
 *
 * Once per row: a marker per chart and day is written once the server has answered, so a failure
 * or a server with the flag off does not loop (an interrupted call is retried next launch). While it runs `upgrading` is true and the
 * screen shows «Небето се подрежда…». On success the cached query and the stored copy are
 * replaced; on failure the old text stays and the levels area scrolls.
 */
export function useHoroscopeUpgrade(chartId: string | null | undefined, content: string | null | undefined) {
  const { apiFetch } = useApiClient()
  const queryClient = useQueryClient()
  const [upgrading, setUpgrading] = useState(false)
  const triedRef = useRef<string | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!chartId || !content || isNewFormatHoroscope(content)) return
    const today = getTodayString()
    const attemptKey = `stellaeum.horoscope.upgrade.${chartId}.${today}`
    if (triedRef.current === attemptKey) return
    triedRef.current = attemptKey

    void (async () => {
      try {
        if ((await AsyncStorage.getItem(attemptKey)) === 'done') return
      } catch {
        return
      }
      if (!mounted.current) return
      setUpgrading(true)
      try {
        const data = (await apiFetch(`/api/horoscope/generate?date=${today}&format=json&upgrade=1`, {
          method: 'POST',
          body: JSON.stringify({ chartId }),
        })) as { content?: unknown; generatedAt?: string }
        if (typeof data.content === 'string' && data.content !== content) {
          queryClient.setQueryData(['daily-horoscope', chartId, today], data)
          try {
            await AsyncStorage.setItem(getCacheKey(chartId, today), JSON.stringify(data))
          } catch {}
        }
      } catch {
        // keep the old row
      } finally {
        // Marked AFTER the server answered (success or a definite failure), so a call that was
        // cut short by the app closing is tried again next time, but never twice in a row.
        try {
          await AsyncStorage.setItem(attemptKey, 'done')
        } catch {}
        if (mounted.current) setUpgrading(false)
      }
    })()
  }, [chartId, content, apiFetch, queryClient])

  return { upgrading }
}
