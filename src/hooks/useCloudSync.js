import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildSnapshot, mergeSnapshots, hashSnapshot, slimSnapshot } from '../lib/sync'

/**
 * Cloud sync for the app "workspace".
 * @param slices  current synced state { settings, business, library, categories, quotes, customers, seq }
 * @param setters { setSettings, setBusiness, setLibrary, setCategories, setQuotes, setCustomers, setSeq }
 */
export function useCloudSync(slices, setters) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('signed-out') // signed-out | syncing | synced | error
  const [lastSyncedAt, setLastSyncedAt] = useState(null)

  const slicesRef = useRef(slices)
  slicesRef.current = slices
  const settersRef = useRef(setters)
  settersRef.current = setters

  const lastHashRef = useRef(null) // hash of last data we pushed or received (echo guard)
  const lastTsRef = useRef(0)
  const debounceRef = useRef(null)

  const applySnapshot = useCallback((snap) => {
    if (!snap) return
    const s = settersRef.current
    if (snap.settings != null) s.setSettings(snap.settings)
    if (snap.business != null) s.setBusiness(snap.business)
    if (snap.library != null) s.setLibrary(snap.library)
    if (snap.categories != null) s.setCategories(snap.categories)
    if (snap.quotes != null) s.setQuotes(snap.quotes)
    if (snap.customers != null) s.setCustomers(snap.customers)
    if (snap.seq != null) s.setSeq(snap.seq)
    if (snap.team != null) s.setTeam(snap.team)
  }, [])

  // ---- initial pull + merge ----
  const pull = useCallback(async (uid) => {
    try {
      setStatus('syncing')
      const local = buildSnapshot(slicesRef.current)
      const { data, error } = await supabase
        .from('workspaces')
        .select('data, updated_at')
        .eq('user_id', uid)
        .maybeSingle()
      if (error) { setStatus('error'); return }

      const remote = data?.data || null
      const remoteTs = data?.updated_at ? new Date(data.updated_at).getTime() : 0
      const merged = mergeSnapshots(local, remote, lastTsRef.current, remoteTs)

      // Seed echo guard with the *remote* hash so any local-only items still get pushed up.
      lastHashRef.current = remote ? hashSnapshot(slimSnapshot(buildSnapshot(remote))) : '∅'
      lastTsRef.current = remoteTs
      applySnapshot(merged)
      setStatus('synced')
      if (data?.updated_at) setLastSyncedAt(data.updated_at)
    } catch {
      setStatus('error')
    }
  }, [applySnapshot])

  // ---- realtime: other device wrote ----
  const onRemote = useCallback((payload) => {
    const row = payload.new
    if (!row?.data) return
    const remote = row.data
    const remoteHash = hashSnapshot(slimSnapshot(buildSnapshot(remote)))
    if (remoteHash === lastHashRef.current) return // our own echo
    const local = buildSnapshot(slicesRef.current)
    const remoteTs = row.updated_at ? new Date(row.updated_at).getTime() : 0
    const merged = mergeSnapshots(local, remote, lastTsRef.current, remoteTs)
    lastHashRef.current = remoteHash
    lastTsRef.current = remoteTs
    applySnapshot(merged)
    if (row.updated_at) setLastSyncedAt(row.updated_at)
  }, [applySnapshot])

  // ---- auth bootstrap ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ---- subscribe + pull when signed in ----
  useEffect(() => {
    if (!user) {
      setStatus('signed-out')
      lastHashRef.current = null
      lastTsRef.current = 0
      return
    }
    pull(user.id)
    const channel = supabase
      .channel(`ws-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces', filter: `user_id=eq.${user.id}` },
        onRemote,
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, pull, onRemote])

  // ---- push local changes (debounced) ----
  useEffect(() => {
    if (!user) return
    // Push the slim form: photo base64 stays on-device, the cloud gets
    // metadata + storage URLs (see lib/photos.js for the binary upload).
    const snap = slimSnapshot(buildSnapshot(slices))
    const h = hashSnapshot(snap)
    if (h === lastHashRef.current) return
    setStatus('syncing')
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const ts = new Date().toISOString()
        const { error } = await supabase
          .from('workspaces')
          .upsert({ user_id: user.id, data: snap, updated_at: ts }, { onConflict: 'user_id' })
        if (error) { setStatus('error'); return }
        lastHashRef.current = h
        lastTsRef.current = new Date(ts).getTime()
        setLastSyncedAt(ts)
        setStatus('synced')
      } catch {
        setStatus('error')
      }
    }, 700)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, slices.settings, slices.business, slices.library, slices.categories, slices.quotes, slices.customers, slices.seq, slices.team])

  const signInGithub = useCallback(
    () => supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } }),
    [],
  )
  const signInEmail = useCallback((email, password) => supabase.auth.signInWithPassword({ email, password }), [])
  const signUpEmail = useCallback((email, password) => supabase.auth.signUp({ email, password }), [])
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { user, status, lastSyncedAt, signInGithub, signInEmail, signUpEmail, signOut }
}
