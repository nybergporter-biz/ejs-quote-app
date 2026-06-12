import { supabase } from './supabase'

// Public half of the VAPID pair — the private key lives in Supabase Edge
// Function secrets (see docs/SUPABASE_SETUP.md).
export const VAPID_PUBLIC_KEY =
  'BOCWqJLbMUzh3nhPJxjd7czVHFXZUwOo0tTZSN3Yf0__YqGKmHnIqubmvvhnrg2DFc_sht6now6HzY-jf3usLJA'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/**
 * Ask for notification permission (if not yet decided), subscribe this device
 * to Web Push, and store the subscription so the notify-lead Edge Function can
 * reach it. Safe to call repeatedly — it no-ops once subscribed or denied.
 */
export async function ensurePushSubscription(userId) {
  if (!userId) return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return false
  try {
    if (Notification.permission === 'denied') return false
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return false
    }
    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    const json = sub.toJSON()
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: json.endpoint, subscription: json },
      { onConflict: 'endpoint' },
    )
    return true
  } catch {
    return false // push is best-effort; polling + realtime still cover us
  }
}
