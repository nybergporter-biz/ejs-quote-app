// Job photo helpers: normalization (legacy string → object), capture
// (resize + GPS + timestamp), and the automatic Supabase Storage upload
// queue. Photos keep their base64 on-device for offline PDFs; the synced
// snapshot only ever carries metadata + the storage URL.
import { supabase } from './supabase'
import { uid } from './utils'

export const PHOTO_BUCKET = 'job-photos'

/** Legacy photos were plain dataURL strings. Lift them into objects. */
export function normalizePhoto(p) {
  if (!p) return null
  if (typeof p === 'string') return { id: uid('ph'), kind: 'before', ts: null, gps: null, data: p, url: null }
  return { kind: 'before', ts: null, gps: null, data: null, url: null, ...p, id: p.id || uid('ph') }
}

export const normalizePhotos = (arr) => (arr || []).map(normalizePhoto).filter(Boolean)

/** Best displayable source for a photo (local base64 first, then cloud). */
export const photoSrc = (p) => (typeof p === 'string' ? p : p?.data || p?.url || null)

function getGPS(timeoutMs = 4000) {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    const t = setTimeout(() => resolve(null), timeoutMs + 500)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(t)
        resolve({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5) })
      },
      () => { clearTimeout(t); resolve(null) },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 120000 },
    )
  })
}

function resizeToDataUrl(file, max = 1200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/** Build a photo object from a camera/file capture: resized + stamped + geotagged. */
export async function capturePhoto(file, kind = 'before') {
  const [data, gps] = await Promise.all([resizeToDataUrl(file), getGPS()])
  return { id: uid('ph'), kind, ts: new Date().toISOString(), gps, data, url: null }
}

let uploading = false

/**
 * Push every not-yet-uploaded photo to Supabase Storage. Fire-and-forget:
 * runs only when signed in, skips silently when offline or when the bucket
 * is missing, and retries on the next change. `patchPhoto(quoteId, photoId,
 * patch)` writes the resulting URL back into the quote.
 */
export async function uploadPendingPhotos(quotes, userId, patchPhoto) {
  if (uploading || !userId || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
  const pending = []
  for (const q of quotes || []) {
    for (const p of q.photos || []) {
      if (p && typeof p === 'object' && p.data && !p.url) pending.push({ quoteId: q.id, photo: p })
    }
  }
  if (!pending.length) return
  uploading = true
  try {
    for (const { quoteId, photo } of pending) {
      try {
        const blob = await (await fetch(photo.data)).blob()
        const path = `${userId}/${quoteId}/${photo.id}.jpg`
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
        if (error) continue // bucket missing / offline / RLS — retry later
        const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
        if (data?.publicUrl) patchPhoto(quoteId, photo.id, { url: data.publicUrl })
      } catch {
        // network hiccup — leave pending for the next pass
      }
    }
  } finally {
    uploading = false
  }
}
