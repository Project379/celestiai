import { useRef } from 'react'
import { useRouter, type Href } from 'expo-router'

/**
 * Guards against double-push from rapid double-tap on a Pressable.
 * A fast double-tap fires onPress twice before the screen transition
 * can absorb the second tap, pushing two screens. The in-flight ref
 * blocks re-entry for one transition-length window, then clears —
 * so a legitimate back-and-re-tap still navigates normally.
 */
export function useGuardedNavigation() {
  const router = useRouter()
  const inFlight = useRef(false)

  const push = (href: Href) => {
    if (inFlight.current) return
    inFlight.current = true
    router.push(href)
    setTimeout(() => {
      inFlight.current = false
    }, 600)
  }

  return { push }
}
