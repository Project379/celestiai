'use client'

import { useState, useEffect } from 'react'

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

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Bell icon */}
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
          <svg
            className="h-4 w-4 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>

        {/* Status text */}
        <div>
          {permission === 'denied' ? (
            <p className="text-sm text-slate-400">
              Известията са блокирани в браузъра
            </p>
          ) : isSubscribed ? (
            <p className="text-sm text-slate-200">
              Сутрешните известия са включени
            </p>
          ) : (
            <p className="text-sm text-slate-300">
              Получавайте сутрешен хороскоп
            </p>
          )}
        </div>
      </div>

      {/* Action button — hidden when denied */}
      {permission !== 'denied' && (
        <button
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={isLoading}
          className="flex-shrink-0 rounded-lg bg-violet-600/80 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-500/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? '...' : isSubscribed ? 'Изключи' : 'Включи'}
        </button>
      )}
    </div>
  )
}
