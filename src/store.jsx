import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useCloudSync } from './hooks/useCloudSync'
import { useLeads } from './hooks/useLeads'
import { DEFAULT_SETTINGS } from './lib/pricing'
import { ITEMS, CATEGORIES } from './lib/itemLibrary'
import { uploadPendingPhotos } from './lib/photos'
import { splitName } from './lib/leads'
import { quoteNumber, uid } from './lib/utils'

export const ACCENTS = [
  { name: 'Teal',   base: '#2a7f8a', light: '#5bb5c4' },
  { name: 'Ocean',  base: '#2563a8', light: '#5b9bd4' },
  { name: 'Forest', base: '#2a8a5a', light: '#5bc48f' },
  { name: 'Sunset', base: '#c2552a', light: '#e7965b' },
  { name: 'Gold',   base: '#b8901a', light: '#e7c14f' },
  { name: 'Violet', base: '#6a4ca8', light: '#a98fd4' },
]

const DEFAULT_BUSINESS = {
  companyName: 'Elite Junk Solutions',
  phone: '(801) 555-0142',
  email: 'hello@elitejunkut.com',
  website: 'elitejunkut.com',
  ownerName: 'Porter',
  logo: null,
  tagline: 'We show up. We haul it. We’re done.',
}

const DEFAULT_DISPLAY = {
  ...DEFAULT_SETTINGS,
  accent: '#2a7f8a',
  accentLight: '#5bb5c4',
  fontScale: 'normal', // normal | large | xl
  compact: false,
  showInternal: true,
  validDays: 7,
}

// Two-partner team. `members` is config; `status` entries carry their own
// updatedAt so two devices merge per-partner without clobbering each other.
export const DEFAULT_TEAM = {
  members: {
    p1: { name: 'Porter', color: '#5bb5c4' },
    p2: { name: '', color: '#FF6B35' },
  },
  status: {
    p1: { state: 'available', quoteId: null, since: null, updatedAt: null },
    p2: { state: 'available', quoteId: null, since: null, updatedAt: null },
  },
}

export const PARTNER_STATES = [
  { key: 'available', label: 'Available', icon: '🟢' },
  { key: 'enroute', label: 'En Route', icon: '🚛' },
  { key: 'onsite', label: 'On Site', icon: '💪' },
  { key: 'wrapping', label: 'Wrapping Up', icon: '🧹' },
]

const FS = { normal: 1, large: 1.08, xl: 1.18 }

const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)

export function AppProvider({ children }) {
  const [settings, setSettings] = useLocalStorage('ejs.settings', DEFAULT_DISPLAY)
  const [business, setBusiness] = useLocalStorage('ejs.business', DEFAULT_BUSINESS)
  const [library, setLibrary] = useLocalStorage('ejs.library', ITEMS)
  const [categories, setCategories] = useLocalStorage('ejs.categories', CATEGORIES)
  const [quotes, setQuotes] = useLocalStorage('ejs.quotes', [])
  const [customers, setCustomers] = useLocalStorage('ejs.customers', [])
  const [seq, setSeq] = useLocalStorage('ejs.seq', 0)
  const [deletedIds, setDeletedIds] = useLocalStorage('ejs.deletedIds', [])
  const [setupDone, setSetupDone] = useLocalStorage('ejs.setupDone', false)
  const [introSeen, setIntroSeen] = useLocalStorage('ejs.introSeen', false)
  const [team, setTeam] = useLocalStorage('ejs.team', DEFAULT_TEAM)
  // Which partner THIS device belongs to — intentionally local-only (not synced).
  const [whoami, setWhoami] = useLocalStorage('ejs.whoami', 'p1')

  // Apply accent + font scale to CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', settings.accent || '#2a7f8a')
    root.style.setProperty('--accent-lt', settings.accentLight || '#5bb5c4')
    root.style.setProperty('--teal', settings.accent || '#2a7f8a')
    root.style.setProperty('--teal-lt', settings.accentLight || '#5bb5c4')
    root.style.setProperty('--fs-scale', String(FS[settings.fontScale] || 1))
  }, [settings.accent, settings.accentLight, settings.fontScale])

  const visibleItems = useMemo(() => library.filter((i) => !i.hidden), [library])

  const actions = useMemo(() => {
    return {
      // ---- settings / business ----
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
      resetSettings: () => setSettings(DEFAULT_DISPLAY),
      updateBusiness: (patch) => setBusiness((b) => ({ ...b, ...patch })),
      completeSetup: () => setSetupDone(true),
      completeIntro: () => setIntroSeen(true),

      // ---- library CRUD ----
      updateItem: (id, patch) =>
        setLibrary((lib) => lib.map((i) => (i.id === id ? { ...i, ...patch } : i))),
      toggleItem: (id) =>
        setLibrary((lib) => lib.map((i) => (i.id === id ? { ...i, hidden: !i.hidden } : i))),
      addItem: (data) =>
        setLibrary((lib) => [...lib, { id: uid('item'), surcharge: 0, icon: '📦', cy: 1, ...data }]),
      deleteItem: (id) => setLibrary((lib) => lib.filter((i) => i.id !== id)),
      addCategory: (name) =>
        setCategories((c) => (c.includes(name) ? c : [...c, name])),
      resetLibrary: () => setLibrary(ITEMS),

      // ---- customers ----
      upsertCustomer: (cust) => {
        let id = cust.id
        setCustomers((list) => {
          if (id && list.some((c) => c.id === id)) {
            return list.map((c) => (c.id === id ? { ...c, ...cust } : c))
          }
          id = id || uid('cust')
          return [...list, { createdAt: new Date().toISOString(), quoteIds: [], ...cust, id }]
        })
        return id
      },
      updateCustomer: (id, patch) =>
        setCustomers((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c))),
      deleteCustomer: (id) => {
        setCustomers((list) => list.filter((c) => c.id !== id))
        setDeletedIds((d) => (d.includes(id) ? d : [...d, id]))
      },

      // ---- quotes ----
      nextQuoteId: () => {
        const n = seq + 1
        setSeq(n)
        return quoteNumber(n)
      },
      saveQuote: (q) => {
        const now = new Date().toISOString()
        setQuotes((list) => {
          const exists = list.some((x) => x.id === q.id)
          const next = { ...q, updatedAt: now }
          return exists ? list.map((x) => (x.id === q.id ? next : x)) : [{ ...next, createdAt: q.createdAt || now }, ...list]
        })
      },
      setQuoteStatus: (id, status, extra = {}) =>
        setQuotes((list) => list.map((x) => {
          if (x.id !== id) return x
          const now = new Date().toISOString()
          const stamps = {}
          if (status === 'accepted' && !x.acceptedAt) stamps.acceptedAt = now
          if (status === 'declined' && !x.lostAt) stamps.lostAt = now
          return { ...x, status, ...stamps, ...extra, updatedAt: now }
        })),
      setQuotePaid: (id, paid, method = null) =>
        setQuotes((list) => list.map((x) => (x.id === id
          ? { ...x, paid: paid ? new Date().toISOString() : null, paidMethod: paid ? method : null, updatedAt: new Date().toISOString() }
          : x))),
      scheduleQuote: (id, { date, city, plannedCY }) =>
        setQuotes((list) => list.map((x) => (x.id === id
          ? { ...x, scheduledDate: date || null, city: city ?? x.city, plannedCY: plannedCY ?? x.plannedCY ?? null, updatedAt: new Date().toISOString() }
          : x))),
      unscheduleQuote: (id) =>
        setQuotes((list) => list.map((x) => (x.id === id ? { ...x, scheduledDate: null, updatedAt: new Date().toISOString() } : x))),
      deleteQuote: (id) => {
        setQuotes((list) => list.filter((x) => x.id !== id))
        setDeletedIds((d) => (d.includes(id) ? d : [...d, id]))
      },

      // ---- team ----
      updateMember: (key, patch) =>
        setTeam((t) => ({ ...t, members: { ...t.members, [key]: { ...t.members[key], ...patch } } })),
      setPartnerStatus: (key, state, quoteId = null) =>
        setTeam((t) => {
          const prev = t.status?.[key] || {}
          const now = new Date().toISOString()
          return {
            ...t,
            status: {
              ...t.status,
              [key]: {
                state,
                quoteId,
                // keep `since` when only the job changes on the same state
                since: prev.state === state ? prev.since || now : now,
                updatedAt: now,
              },
            },
          }
        }),
      setWhoami,
    }
  }, [seq, setSettings, setBusiness, setLibrary, setCategories, setCustomers, setQuotes, setSeq, setDeletedIds, setSetupDone, setIntroSeen, setTeam, setWhoami])

  // ---- cloud sync (Supabase) ----
  const cloud = useCloudSync(
    { settings, business, library, categories, quotes, customers, seq, deletedIds, team },
    { setSettings, setBusiness, setLibrary, setCategories, setQuotes, setCustomers, setSeq, setDeletedIds, setTeam },
  )

  // ---- website leads (lead_requests table) ----
  const leadsApi = useLeads(cloud.user, { soundOn: settings.leadSound !== false })

  // "Build Quote" on a lead: link (or create) the customer profile, mark the
  // lead converted, and hand back the customerId so the caller can navigate
  // to the quote builder pre-filled. Ambiguous matches are resolved by the
  // caller (picker UI) and passed in as existingCustomerId.
  const convertLeadToQuote = useCallback((lead, existingCustomerId = null) => {
    let customerId = existingCustomerId
    if (!customerId) {
      customerId = actions.upsertCustomer({
        ...splitName(lead.name),
        phone: lead.phone || '',
        email: lead.email || '',
        address: lead.service_address || '',
        notes: lead.notes || '',
        source: 'website',
      })
    }
    leadsApi.updateLead(lead.id, { status: 'converted', customer_id: customerId })
    return customerId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsApi.updateLead])

  // ---- automatic photo backup (Supabase Storage) ----
  // Local-first: photos live in localStorage; whenever we're signed in and
  // online, anything not yet uploaded gets pushed in the background.
  const quotesRef = useRef(quotes)
  quotesRef.current = quotes
  useEffect(() => {
    if (!cloud.user) return
    const patchPhoto = (quoteId, photoId, patch) =>
      setQuotes((list) => list.map((q) => (q.id === quoteId
        ? { ...q, photos: (q.photos || []).map((p) => (p && typeof p === 'object' && p.id === photoId ? { ...p, ...patch } : p)) }
        : q)))
    const run = () => uploadPendingPhotos(quotesRef.current, cloud.user.id, patchPhoto)
    const id = setTimeout(run, 1500) // debounce bursts of new photos
    window.addEventListener('online', run)
    return () => { clearTimeout(id); window.removeEventListener('online', run) }
  }, [cloud.user, quotes, setQuotes])

  const value = {
    settings,
    business,
    library,
    visibleItems,
    categories,
    quotes,
    customers,
    setupDone,
    introSeen,
    team,
    whoami,
    cloud,
    leads: leadsApi.leads,
    unreadLeadCount: leadsApi.unreadLeadCount,
    fetchLeads: leadsApi.fetchLeads,
    updateLead: leadsApi.updateLead,
    updateLeadStatus: leadsApi.updateLeadStatus,
    convertLeadToQuote,
    ...actions,
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}
