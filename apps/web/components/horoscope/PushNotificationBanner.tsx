'use client'

import { useState, useEffect } from 'react'
import { CelestialIcon } from '@/components/icons/CelestialIcons'

/**
 * Converts a base64url-encoded VAPID public key to a Uint8Array
 * required by pushManager.subscribe's applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length) as Uint8Array<ArrayBuffer>
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * PushNotificationBanner
 *
 * Shows a compact subscribe/unsubscribe UI for Web Push notifications.
 * Hides gracefully on browsers that don't support PushManager (e.g., iOS Safari < 16.4).
 *
 * States:
 * - Not subscribed: "Получавайте сутрешен хороскоп" + "Включи" button
 * - Subscribed: "Сутрешните известия са включени" + "Изключи" button
 * - Denied: "Известията са блокирани в браузъра" (no button)
 * - Unsupported: renders nothing
 *
 * STELLAEUM_PLACEHOLDER: PUSH-ORPHAN — this component is imported by
 * nothing (dead on web), and mobile has no equivalent settings toggle at
 * all. The Web Push backend + cron exist; the user-facing control does
 * not. See .planning/PLACEHOLDERS.md.
 */
export function PushNotificationBanner() {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check browser support for service workers and push
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return
    }

    setSupported(true)
    setPermission(Notification.permission)

    // Register service worker and check subscription state
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(async (reg) => {
        setRegistration(reg)
        const existing = await reg.pushManager.getSubscription()
        setIsSubscribed(!!existing)
      })
      .catch((err) => {
        console.error('[PushNotificationBanner] Service worker registration failed:', err)
      })
  }, [])

  const handleSubscribe = async () => {
    if (!registration) return
    setIsLoading(true)

    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('[PushNotificationBanner] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      // Update permission state after prompt
      setPermission(Notification.permission)

      // Save subscription to DB
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      })

      setIsSubscribed(true)
    } catch (err) {
      console.error('[PushNotificationBanner] Subscribe failed:', err)
      // Refresh permission state (user may have denied)
      setPermission(Notification.permission)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!registration) return
    setIsLoading(true)

    try {
      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setIsSubscribed(false)
        return
      }

      // Remove from browser
      await subscription.unsubscribe()

      // Remove from DB
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      })

      setIsSubscribed(false)
    } catch (err) {
      console.error('[PushNotificationBanner] Unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Hide on unsupported browsers
  if (!supported) return null

  const isDenied = permission === 'denied'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/[0.06] backdrop-blur-xl">
      {/* Layered background - obsidian glass with violet undertone */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-[#0e0c18]/80 via-[#08060f]/70 to-[#12102a]/80"
      />
      {/* Top hairline - ivory with gold focal */}
      <div
        aria-hidden
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/25 to-transparent"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-px w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
      />
      {/* Violet ambient behind sigil */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-violet-500/[0.09] blur-3xl"
      />

      <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-4">
          {/* Crescent moon sigil - violet halo, gold core */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-violet-500/20 blur-md"
            />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/20 bg-gradient-to-br from-violet-500/[0.14] via-amber-400/[0.06] to-transparent">
              <CelestialIcon
                name="moon"
                size={17}
                className="text-amber-100 drop-shadow-[0_0_7px_rgba(251,191,36,0.5)]"
              />
            </span>
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-2 font-cinzel text-[9px] font-semibold uppercase tracking-[0.32em] text-slate-300/80">
              <span
                aria-hidden
                className="h-1 w-1 rotate-45 bg-amber-300/70 shadow-[0_0_5px_rgba(251,191,36,0.55)]"
              />
              Aurora
            </p>
            {isDenied ? (
              <p className="mt-1 font-display text-[13.5px] text-slate-500">
                Браузърът мълчи - известията са блокирани.
              </p>
            ) : isSubscribed ? (
              <p className="mt-1 font-display text-[13.5px] text-slate-100">
                Звездите шепнат всяка{' '}
                <span className="text-amber-200/85">зора</span>.
              </p>
            ) : (
              <p className="mt-1 font-display text-[13.5px] text-slate-100">
                Нека сутрешният знак{' '}
                <span className="text-amber-200/85">те намери</span>.
              </p>
            )}
          </div>
        </div>

        {!isDenied && (
          <button
            onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
            disabled={isLoading}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/15 bg-white/[0.03] px-4 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-200 transition-all duration-300 hover:border-violet-300/40 hover:bg-violet-500/[0.1] hover:text-white hover:shadow-[0_0_20px_rgba(167,139,250,0.25)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          >
            {isLoading ? '…' : isSubscribed ? 'Заглуши' : 'Събуди'}
          </button>
        )}
      </div>
    </div>
  )
}
