import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'

import { logError } from '@/lib/monitoring/logError'

const SEEN_DATE_KEY = 'stellaeum.crystals.reveal_seen_date.v1'

/**
 * HT8 reveal exception (HANDOFF-2026-05-09.md, ratified 2026-07-24) —
 * the entrance animation this drives is allowed specifically because it
 * fires once per actual daily draw, not on every render. `dateKey` is
 * the daily draw's own `today` field from the API response, not a
 * client-derived date — the concealed content genuinely changes once
 * that key changes, which is what makes this a REVEAL and not routine
 * list rendering (the distinction the amendment turns on).
 *
 * Returns `false` until `dateKey` is known (avoids a flash-of-reveal
 * before the fetch resolves) and until the persisted "last seen" date
 * has been read and compared. Once revealed for a given `dateKey`, it
 * never reveals again for that same key — including on remount or
 * navigating back to the screen within the same day, which is the
 * exact cost this exception exists to avoid reintroducing.
 */
export function useDailyReveal(dateKey: string | null | undefined): boolean {
  const [shouldReveal, setShouldReveal] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!dateKey || checked) return
    let cancelled = false
    ;(async () => {
      let lastSeen: string | null = null
      try {
        lastSeen = await AsyncStorage.getItem(SEEN_DATE_KEY)
      } catch (err) {
        logError('ERR-MOB-CRYSTAL-REVEAL-001', err)
      }
      if (cancelled) return
      if (lastSeen !== dateKey) {
        setShouldReveal(true)
        try {
          await AsyncStorage.setItem(SEEN_DATE_KEY, dateKey)
        } catch (err) {
          logError('ERR-MOB-CRYSTAL-REVEAL-002', err)
        }
      }
      if (!cancelled) setChecked(true)
    })()
    return () => {
      cancelled = true
    }
  }, [dateKey, checked])

  return shouldReveal
}
