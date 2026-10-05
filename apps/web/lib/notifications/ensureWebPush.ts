function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export async function ensureWebPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  if (Notification.permission === 'denied') return false
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission()
  if (permission !== 'granted') return false
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!key) return false
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeVapidKey(key),
    })
  }
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  })
  return response.ok
}
