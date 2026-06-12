import { SUPABASE_URL } from './supabase'

export const LEAD_STATUSES = ['new', 'contacted', 'converted', 'stale', 'archived']

// Volume-based price ranges for the one-tap SMS template
export const PRICE_RANGES = {
  'Small Load': { low: 89, high: 200, suffix: '' },
  'Medium Load': { low: 200, high: 400, suffix: '' },
  'Large Load': { low: 400, high: 600, suffix: '+' },
}
const DEFAULT_RANGE = { low: 89, high: 600, suffix: '' }

export function priceRangeFor(volumeEstimate) {
  return PRICE_RANGES[volumeEstimate] || DEFAULT_RANGE
}

export function smsTemplate(lead, ownerName = 'Porter') {
  const first = (lead.name || '').trim().split(/\s+/)[0] || 'there'
  const { low, high, suffix } = priceRangeFor(lead.volume_estimate)
  const job = [lead.volume_estimate, lead.service_type]
    .filter(Boolean)
    .join(' ')
    .toLowerCase() || 'junk removal job'
  return `Hi ${first}, this is ${ownerName} at Elite Junk Solutions! Based on your ${job}, we're typically looking at $${low}–$${high}${suffix}. Want to get it scheduled? — (385) 441-5090`
}

// Photo paths are stored bucket-relative; the public URL is built client-side.
export function leadPhotoUrl(path) {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path // tolerate legacy full URLs
  return `${SUPABASE_URL}/storage/v1/object/public/lead-photos/${path}`
}

export const phoneDigits = (s) => String(s || '').replace(/\D/g, '')

export function phonesMatch(a, b) {
  const da = phoneDigits(a)
  const db = phoneDigits(b)
  if (da.length < 7 || db.length < 7) return false
  return da.endsWith(db) || db.endsWith(da)
}

/** All existing customers whose phone matches the lead's. */
export function matchCustomersByPhone(lead, customers) {
  return customers.filter((c) => phonesMatch(c.phone, lead.phone))
}

/** Split "Jane van Dyke" → { firstName: 'Jane', lastName: 'van Dyke' } */
export function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') }
}

export function formatPreferred(lead) {
  const bits = []
  if (lead.preferred_date) {
    const d = new Date(`${lead.preferred_date}T00:00:00`)
    bits.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  }
  if (lead.preferred_time) bits.push(lead.preferred_time)
  return bits.join(' · ')
}
