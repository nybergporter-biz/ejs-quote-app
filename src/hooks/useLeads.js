import { useCallback, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useLocalStorage } from './useLocalStorage'

const POLL_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1000

function upsertRow(list, row) {
  const i = list.findIndex((l) => l.id === row.id)
  if (i === -1) return [row, ...list]
  const next = [...list]
  next[i] = { ...next[i], ...row }
  return next
}

function sortLeads(list) {
  return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

/** Subtle two-tone chime via Web Audio — no asset needed. */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const gain = ctx.createGain()
    gain.gain.value = 0.06
    gain.connect(ctx.destination)
    ;[880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq
      osc.connect(gain)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.18)
    })
    setTimeout(() => ctx.close(), 800)
  } catch { /* audio blocked — fine */ }
}

async function showLeadNotification(title, body) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    // Prefer the SW so notification clicks route through public/push-sw.js
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { url: '/?view=leads' }, tag: 'ejs-lead' })
      return
    }
  } catch { /* fall through */ }
  try { new Notification(title, { body, icon: '/icons/icon-192.png' }) } catch { /* ignore */ }
}

/**
 * Website leads: localStorage-cached list + Supabase fetch, Realtime INSERT/UPDATE
 * subscription, and a 60s polling fallback (Realtime on the free tier can pause).
 * Reading lead_requests requires an authenticated session, so everything no-ops
 * until `user` is signed in.
 */
export function useLeads(user, { soundOn = true } = {}) {
  const [leads, setLeads] = useLocalStorage('ejs.leads', [])
  const leadsRef = useRef(leads)
  leadsRef.current = leads
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const notifyNew = useCallback((lead) => {
    showLeadNotification(
      `New lead from ${lead.name || 'your website'}`,
      [lead.service_type, lead.volume_estimate].filter(Boolean).join(' · ') || 'Tap to view',
    )
    if (soundRef.current) playChime()
  }, [])

  const notifyStale = useCallback((lead) => {
    const ageMs = Date.now() - new Date(lead.created_at).getTime()
    const hrs = Math.max(1, Math.round(ageMs / 3600000))
    showLeadNotification(
      `⚠️ Lead from ${lead.name || 'website'} hasn't been contacted`,
      `Came in ${hrs} hr${hrs > 1 ? 's' : ''} ago — send them a price range.`,
    )
  }, [])

  const fetchLeads = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('lead_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (!error && data) setLeads(sortLeads(data))
      // on error we keep the localStorage cache — offline-friendly by default
    } catch { /* offline — cache stands */ }
  }, [user, setLeads])

  // initial load on sign-in
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // ---- Realtime: new + updated leads ----
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('lead-requests')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_requests' }, (payload) => {
        const row = payload.new
        if (!row?.id) return
        const known = leadsRef.current.some((l) => l.id === row.id)
        setLeads((list) => sortLeads(upsertRow(list, row)))
        if (!known) notifyNew(row)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'lead_requests' }, (payload) => {
        const row = payload.new
        if (!row?.id) return
        const prev = leadsRef.current.find((l) => l.id === row.id)
        setLeads((list) => sortLeads(upsertRow(list, row)))
        if (row.status === 'stale' && prev && prev.status !== 'stale') notifyStale(row)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, setLeads, notifyNew, notifyStale])

  // ---- Polling fallback: never rely on Realtime alone ----
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const poll = async () => {
      try {
        const since = new Date(Date.now() - DAY_MS).toISOString()
        const { data, error } = await supabase
          .from('lead_requests')
          .select('*')
          .eq('status', 'new')
          .gt('created_at', since)
        if (cancelled || error || !data) return
        const fresh = data.filter((row) => !leadsRef.current.some((l) => l.id === row.id))
        if (fresh.length) {
          setLeads((list) => sortLeads(fresh.reduce(upsertRow, list)))
          fresh.forEach(notifyNew)
        }
      } catch { /* offline — try again next tick */ }
    }
    const id = setInterval(poll, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [user, setLeads, notifyNew])

  // ---- mutations (Supabase + optimistic local state) ----
  const updateLead = useCallback(async (id, patch) => {
    setLeads((list) => list.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    if (!user) return
    try { await supabase.from('lead_requests').update(patch).eq('id', id) } catch { /* retried on next fetch */ }
  }, [user, setLeads])

  const updateLeadStatus = useCallback((id, status) => {
    const patch = { status }
    if (status === 'contacted') patch.contacted_at = new Date().toISOString()
    return updateLead(id, patch)
  }, [updateLead])

  const unreadLeadCount = useMemo(() => leads.filter((l) => l.status === 'new').length, [leads])

  return { leads, unreadLeadCount, fetchLeads, updateLead, updateLeadStatus }
}
