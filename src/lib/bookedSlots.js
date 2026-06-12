import { supabase } from './supabase'

/**
 * Publish a job's time window to the public booked_slots table so the
 * website's quote form stops offering those times. Fire-and-forget:
 * requires a signed-in session (RLS); offline/signed-out calls no-op and
 * the local schedule is still saved.
 */
export async function publishBookedSlot(quoteId, date, startTime, durationHours = 2) {
  try {
    if (!date || !startTime) {
      await removeBookedSlot(quoteId)
      return
    }
    const [h, m] = startTime.split(':').map(Number)
    const endMins = Math.min(h * 60 + m + Math.round(durationHours * 60), 23 * 60 + 59)
    const end = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`
    await supabase
      .from('booked_slots')
      .upsert({ quote_id: quoteId, date, start_time: startTime, end_time: end }, { onConflict: 'quote_id' })
  } catch { /* best-effort */ }
}

export async function removeBookedSlot(quoteId) {
  try {
    await supabase.from('booked_slots').delete().eq('quote_id', quoteId)
  } catch { /* best-effort */ }
}

/** "13:30" → "1:30 PM" for display */
export function prettyTime(t) {
  if (!t) return ''
  const [h, m] = String(t).split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
}
