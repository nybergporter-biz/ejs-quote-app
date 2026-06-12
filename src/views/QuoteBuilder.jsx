import { Suspense, lazy, useMemo, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronDown, Mic, Search, User, Lock, Zap, ArrowRight, RotateCcw, Plus, X, Percent } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from '../components/Toast'
import { useHaptic } from '../hooks/useHaptic'
import ItemCard from '../components/ItemCard'
import AnimatedNumber from '../components/AnimatedNumber'
import QuoteReveal from '../components/QuoteReveal'
import PhotoDock from '../components/PhotoDock'
import { normalizePhotos } from '../lib/photos'
import { calcQuote, fillTone, tierPrices, LANDFILLS, ITEM_DUMP_FEES } from '../lib/pricing'
import { parseCity, landfillFor } from '../lib/planner'
import { formatCY, formatMoney, relativeDate } from '../lib/utils'
import { shareQuotePdf } from '../lib/pdf'

const Trailer3D = lazy(() => import('../components/Trailer3D'))

export default function QuoteBuilder({ route, navigate }) {
  const app = useApp()
  const { settings, business, visibleItems, categories } = app
  const toast = useToast()
  const haptic = useHaptic()

  const editing = route?.params?.quoteId
    ? app.quotes.find((q) => q.id === route.params.quoteId)
    : null
  // Duplicate: seed items/job from an existing quote but save as a brand-new quote.
  const dupeSource = route?.params?.dupeFrom
    ? app.quotes.find((q) => q.id === route.params.dupeFrom)
    : null
  const seedFrom = editing || dupeSource
  // Pre-fill the customer when starting a quote from a customer profile.
  const prefillCustomer = route?.params?.customerId
    ? app.customers.find((c) => c.id === route.params.customerId)
    : null
  const blankCustomer = { firstName: '', lastName: '', phone: '', email: '', address: '' }

  const [qtyMap, setQtyMap] = useState(() => {
    if (!seedFrom) return {}
    const m = {}
    seedFrom.items.forEach((it) => { m[it.itemId || it.id] = (m[it.itemId || it.id] || 0) + it.qty })
    return m
  })
  // Editing → that quote's customer; from a profile → prefill; duplicate/new → blank.
  const [customer, setCustomer] = useState(
    editing?.customer || (prefillCustomer ? { ...blankCustomer, ...prefillCustomer } : blankCustomer),
  )
  const [jobParams, setJobParams] = useState(
    editing?.jobParams || dupeSource?.jobParams || { estHours: 1.5, driveMinutes: 20, distanceMiles: 10, isRush: false },
  )
  const [query, setQuery] = useState('')
  const [activeCat, setActiveCat] = useState(categories[0])
  const [custOpen, setCustOpen] = useState(!!prefillCustomer)
  const [custSearch, setCustSearch] = useState('')
  const [internalOpen, setInternalOpen] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [listening, setListening] = useState(false)
  const [discount, setDiscount] = useState(editing?.discount || 0)
  const [assignedTo, setAssignedTo] = useState(editing?.assignedTo || dupeSource?.assignedTo || app.whoami || 'p1')
  const [tiered, setTiered] = useState(editing?.tiered || dupeSource?.tiered || false)
  const [additionalCharges, setAdditionalCharges] = useState(
    editing?.additionalCharges || dupeSource?.additionalCharges || [],
  )
  const [photos, setPhotos] = useState(() => normalizePhotos(editing?.photos))

  // ---- crash-proof draft autosave (never lose an in-progress quote) ----
  const DRAFT_KEY = 'ejs.builderDraft'
  const [resumeDraft, setResumeDraft] = useState(() => {
    if (editing || dupeSource) return null
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null')
      return d && d.qtyMap && Object.keys(d.qtyMap).length ? d : null
    } catch { return null }
  })
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }

  useEffect(() => {
    if (editing) return
    const hasContent = Object.keys(qtyMap).length > 0
    const id = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ qtyMap, customer, jobParams, discount, additionalCharges, ts: Date.now() }))
        }
      } catch { /* storage full / private mode — ignore */ }
    }, 400)
    return () => clearTimeout(id)
  }, [qtyMap, customer, jobParams, discount, additionalCharges, editing])

  const itemById = useMemo(() => Object.fromEntries(app.library.map((i) => [i.id, i])), [app.library])

  // existing-customer matches for autofill / dedupe
  const custMatches = useMemo(() => {
    const s = custSearch.trim().toLowerCase()
    if (!s) return []
    return app.customers
      .filter((c) => `${c.firstName || ''} ${c.lastName || ''} ${c.phone || ''} ${c.address || ''} ${c.email || ''}`.toLowerCase().includes(s))
      .slice(0, 6)
  }, [custSearch, app.customers])

  // automatic repeat-customer detection: phone digits or full-name match
  const digits = (s) => String(s || '').replace(/\D/g, '')
  const returning = useMemo(() => {
    if (customer.id) return null // already linked to a profile
    const phone = digits(customer.phone)
    const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim().toLowerCase()
    const match = app.customers.find((c) => {
      const cPhone = digits(c.phone)
      if (phone.length >= 7 && cPhone.length >= 7 && (cPhone.endsWith(phone) || phone.endsWith(cPhone))) return true
      const cName = `${c.firstName || ''} ${c.lastName || ''}`.trim().toLowerCase()
      return name.length > 4 && cName === name
    })
    if (!match) return null
    const history = app.quotes
      .filter((q) => q.customer?.id === match.id)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    if (history.length === 0) return null
    const won = history.filter((q) => ['accepted', 'completed'].includes(q.status))
    return { match, count: history.length, won: won.length, last: history[0] }
  }, [customer.id, customer.phone, customer.firstName, customer.lastName, app.customers, app.quotes])

  const selectedItems = useMemo(() => {
    return Object.entries(qtyMap)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ ...itemById[id], qty }))
      .filter((i) => i.id)
  }, [qtyMap, itemById])

  // Dump facility: auto-picked from the job's city unless manually toggled
  const jobCity = (editing?.city || '').trim() || parseCity(customer.address || '')
  const suggestedLandfill = landfillFor(jobCity)
  const landfill = jobParams.landfill || suggestedLandfill

  const pricing = useMemo(
    () => calcQuote(
      selectedItems.map((i) => ({ itemId: i.id, cy: i.cy, qty: i.qty, surcharge: i.surcharge })),
      { ...jobParams, landfill },
      settings,
      { discount, additionalCharges },
    ),
    [selectedItems, jobParams, landfill, settings, discount, additionalCharges],
  )

  // Items whose customer surcharge doesn't cover what the facility charges us per unit
  const underCovered = useMemo(() => {
    const table = ITEM_DUMP_FEES[landfill] || {}
    return selectedItems.filter((i) => (table[i.id] || 0) > (i.surcharge || 0))
  }, [selectedItems, landfill])

  const tone = fillTone(pricing.fillPct, pricing.over)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q) return visibleItems.filter((i) => i.name.toLowerCase().includes(q))
    return visibleItems.filter((i) => i.category === activeCat)
  }, [visibleItems, query, activeCat])

  const add = (item) => setQtyMap((m) => ({ ...m, [item.id]: (m[item.id] || 0) + 1 }))
  const remove = (item) => setQtyMap((m) => {
    const next = { ...m, [item.id]: Math.max((m[item.id] || 0) - 1, 0) }
    if (next[item.id] === 0) delete next[item.id]
    return next
  })

  // voice search
  const recogRef = useRef(null)
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.info('Voice search isn’t supported on this device'); return }
    const r = new SR()
    r.lang = 'en-US'
    r.interimResults = false
    r.onresult = (e) => { setQuery(e.results[0][0].transcript); setListening(false) }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recogRef.current = r
    setListening(true)
    haptic.light()
    r.start()
  }
  useEffect(() => () => recogRef.current?.abort?.(), [])

  const buildQuote = () => {
    const id = editing?.id || app.nextQuoteId()
    let customerId = editing?.customer?.id || customer.id
    if (customer.firstName || customer.lastName || customer.phone) {
      customerId = app.upsertCustomer({ ...customer, id: customerId })
    }
    return {
      id,
      createdAt: editing?.createdAt || new Date().toISOString(),
      status: editing?.status || 'draft',
      customer: { ...customer, id: customerId },
      items: selectedItems.map((i) => ({
        itemId: i.id, name: i.name, icon: i.icon, cy: i.cy, qty: i.qty,
        surcharge: i.surcharge || 0, surchargeLabel: i.surchargeLabel,
      })),
      jobParams: { ...jobParams, landfill },
      additionalCharges,
      discount: Number(discount) || 0,
      assignedTo,
      tiered,
      photos,
      notes: editing?.notes || '',
      pricing,
    }
  }

  const [draftQuote, setDraftQuote] = useState(null)
  const generate = () => {
    if (selectedItems.length === 0) { toast.warn('Add at least one item first'); return }
    haptic.success()
    const q = buildQuote()
    setDraftQuote(q)
    // Save BEFORE the reveal animation runs, so a hiccup can never lose the quote.
    app.saveQuote(q)
    clearDraft()
    setReveal(true)
  }

  const onAccept = () => {
    const q = { ...draftQuote, status: 'sent' }
    app.saveQuote(q)
    clearDraft()
    setReveal(false)
    toast.success('Quote saved & ready to send')
    navigate('quote', { quoteId: q.id })
  }
  const onShare = async () => {
    app.saveQuote(draftQuote)
    clearDraft()
    const res = await shareQuotePdf(draftQuote, business, settings)
    toast.success(res === 'shared' ? 'Shared!' : 'PDF downloaded')
  }

  const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0)

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 'calc(env(safe-area-inset-bottom) + 172px)' }}>
      {/* ---------- Sticky trailer header ---------- */}
      <div className="sticky top-0" style={{ zIndex: 40 }}>
        <div style={{ position: 'relative', background: 'var(--bg)', paddingTop: 'env(safe-area-inset-top)' }}>
          <div style={{ height: 232, position: 'relative' }}>
            <Suspense fallback={<div style={{ position: 'absolute', inset: 0 }} />}>
              <Trailer3D
                fillPercent={pricing.fillPct}
                totalCY={pricing.totalCY}
                capacityCY={settings.TRAILER_CY}
                items={selectedItems}
              />
            </Suspense>

            <button
              onClick={() => navigate('dashboard')}
              className="absolute glass flex items-center justify-center"
              style={{ top: 12, left: 14, width: 38, height: 38, borderRadius: 12, color: 'var(--text)', zIndex: 5 }}
            >
              <ChevronLeft size={20} />
            </button>
            <div className="absolute glass" style={{ top: 12, right: 14, padding: '6px 12px', borderRadius: 999, zIndex: 5 }}>
              <span className="micro-label" style={{ fontSize: 10, color: tone.color }}>{tone.label}</span>
            </div>
          </div>

          {/* stats + fill bar */}
          <div style={{ padding: '0 16px 12px', maxWidth: 560, margin: '0 auto' }}>
            <div className="flex items-end justify-between" style={{ marginBottom: 8 }}>
              <div>
                <span className="font-display tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                  <AnimatedNumber value={pricing.totalCY} format="cy" duration={500} />
                </span>
                <span className="text-2" style={{ fontSize: 14 }}> / {settings.TRAILER_CY} CY</span>
              </div>
              <span className="font-display tabular" style={{ fontSize: 15, fontWeight: 700, color: tone.color }}>
                {Math.round(pricing.fillPctRaw)}% full
              </span>
            </div>
            <div style={{ height: 12, borderRadius: 999, background: 'var(--surface2)', overflow: 'hidden' }}>
              <motion.div
                className="liquid-wave"
                animate={{ width: `${Math.min(pricing.fillPct, 100)}%` }}
                transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                style={{
                  height: '100%',
                  borderRadius: 999,
                  background: pricing.over
                    ? 'linear-gradient(90deg, #d35400, #c0392b)'
                    : 'linear-gradient(90deg, var(--teal), var(--teal-lt))',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div style={{ padding: '4px 16px 0', maxWidth: 560, margin: '0 auto' }}>
        {/* Resume unsaved draft */}
        {resumeDraft && Object.keys(qtyMap).length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface flex items-center gap-3"
            style={{ borderRadius: 14, padding: '11px 14px', marginBottom: 12, borderLeft: '3px solid var(--teal)' }}
          >
            <RotateCcw size={18} color="var(--teal-lt)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Resume your last quote?</div>
              <div className="text-3" style={{ fontSize: 11.5 }}>
                {Object.keys(resumeDraft.qtyMap).length} item type(s), unsaved
              </div>
            </div>
            <button
              onClick={() => {
                setQtyMap(resumeDraft.qtyMap || {})
                setCustomer(resumeDraft.customer || customer)
                setJobParams(resumeDraft.jobParams || jobParams)
                if (resumeDraft.discount != null) setDiscount(resumeDraft.discount)
                if (resumeDraft.additionalCharges) setAdditionalCharges(resumeDraft.additionalCharges)
                setResumeDraft(null)
                haptic.light()
              }}
              style={{ padding: '7px 13px', borderRadius: 10, background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none' }}
            >
              Resume
            </button>
            <button
              onClick={() => { clearDraft(); setResumeDraft(null) }}
              style={{ padding: '7px 10px', borderRadius: 10, color: 'var(--text3)', fontSize: 13, fontWeight: 600 }}
            >
              Discard
            </button>
          </motion.div>
        )}

        {/* Customer */}
        <Collapsible
          open={custOpen}
          onToggle={() => setCustOpen((v) => !v)}
          icon={User}
          title="Customer info"
          subtitle={`${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Optional — add who this is for'}
        >
          {/* Search existing customers → autofill (also prevents duplicates) */}
          <div className="relative" style={{ marginBottom: 10 }}>
            <Search size={16} color="var(--text3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="field"
              style={{ paddingLeft: 36 }}
              placeholder="Search existing customers…"
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
            />
          </div>
          {custSearch.trim() && (
            <div className="space-y-1.5" style={{ marginBottom: 12 }}>
              {custMatches.length === 0 ? (
                <div className="text-3" style={{ fontSize: 12.5, padding: '4px 2px' }}>
                  No match — fill the fields below to add them as a new customer.
                </div>
              ) : (
                custMatches.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setCustomer({ ...blankCustomer, ...m }); setCustSearch(''); haptic.light() }}
                    className="surface-2 w-full flex items-center gap-2.5 text-left"
                    style={{ borderRadius: 12, padding: '9px 11px', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center justify-center font-display" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface)', color: 'var(--teal-lt)', fontWeight: 800, fontSize: 12 }}>
                      {(m.firstName?.[0] || '?').toUpperCase()}{(m.lastName?.[0] || '').toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{`${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Customer'}</div>
                      <div className="text-3" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.address || m.phone || m.email}</div>
                    </div>
                    <span className="accent" style={{ fontSize: 12, fontWeight: 600 }}>Use</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Welcome back — auto repeat-customer detection */}
          <AnimatePresence>
            {returning && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  className="flex items-center gap-2.5"
                  style={{
                    marginBottom: 10, padding: '11px 13px', borderRadius: 12,
                    background: 'color-mix(in srgb, var(--teal) 12%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--teal) 40%, transparent)',
                  }}
                >
                  <span style={{ fontSize: 20 }}>👋</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--teal-lt)' }}>
                      Welcome back, {returning.match.firstName || 'friend'}!
                      {returning.won >= 2 && (
                        <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gold)', color: '#1a1206', verticalAlign: 'middle' }}>
                          REPEAT
                        </span>
                      )}
                    </div>
                    <div className="text-2" style={{ fontSize: 11.5 }}>
                      {returning.count} quote{returning.count > 1 ? 's' : ''} · last {relativeDate(returning.last.updatedAt || returning.last.createdAt)} · {formatMoney(returning.last.pricing?.total || 0)}
                    </div>
                  </div>
                  <button
                    onClick={() => { setCustomer({ ...blankCustomer, ...returning.match }); haptic.light() }}
                    style={{ padding: '8px 13px', borderRadius: 10, background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 12.5, border: 'none', flexShrink: 0 }}
                  >
                    Link
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-2.5">
            <input className="field" placeholder="First name" value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} />
            <input className="field" placeholder="Last name" value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} />
            <input className="field" inputMode="tel" placeholder="Phone" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <input className="field" inputMode="email" placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <input className="field col-span-2" placeholder="Service address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </div>
        </Collapsible>

        {/* Search */}
        <div className="relative" style={{ margin: '14px 0 10px' }}>
          <Search size={17} color="var(--text3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="field"
            style={{ paddingLeft: 38, paddingRight: 46 }}
            placeholder="Search 65+ items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={startVoice}
            className="absolute flex items-center justify-center"
            style={{
              right: 7, top: '50%', transform: 'translateY(-50%)',
              width: 34, height: 34, borderRadius: 10,
              background: listening ? 'var(--teal)' : 'var(--surface2)',
              color: listening ? '#fff' : 'var(--text2)',
            }}
            aria-label="Voice search"
          >
            <motion.span animate={listening ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }}>
              <Mic size={17} />
            </motion.span>
          </motion.button>
        </div>

        {/* Category pills */}
        {!query && (
          <div className="flex gap-2 overflow-x-auto" style={{ paddingBottom: 8, marginBottom: 6, scrollbarWidth: 'none' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className="relative whitespace-nowrap"
                style={{ padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, flexShrink: 0, color: activeCat === cat ? '#fff' : 'var(--text2)' }}
              >
                {activeCat === cat && (
                  <motion.span layoutId="cat-pill" className="absolute inset-0" style={{ background: 'var(--teal)', borderRadius: 999 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                )}
                <span style={{ position: 'relative' }}>{cat}</span>
              </button>
            ))}
          </div>
        )}

        {/* Item grid */}
        <motion.div layout className="grid grid-cols-2 gap-2.5" style={{ paddingBottom: 16 }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                qty={qtyMap[item.id] || 0}
                onAdd={add}
                onRemove={remove}
                compact={settings.compact}
              />
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-2 text-center text-2" style={{ padding: 28, fontSize: 14 }}>
              No items match “{query}”.
            </div>
          )}
        </motion.div>

        {/* Job params */}
        <div className="surface" style={{ borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Job details</span>
            <button
              onClick={() => { haptic.light(); setJobParams((j) => ({ ...j, isRush: !j.isRush })) }}
              className="flex items-center gap-1.5"
              style={{
                padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
                background: jobParams.isRush ? 'rgba(211,84,0,0.16)' : 'var(--surface2)',
                color: jobParams.isRush ? '#e7965b' : 'var(--text2)',
                border: `1px solid ${jobParams.isRush ? 'rgba(211,84,0,0.4)' : 'var(--border)'}`,
              }}
            >
              <Zap size={13} /> Rush {jobParams.isRush ? 'on' : 'off'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <MiniField label="Est. hours" value={jobParams.estHours} step={0.5} onChange={(v) => setJobParams({ ...jobParams, estHours: v })} />
            <MiniField label="Drive (min)" value={jobParams.driveMinutes} step={5} onChange={(v) => setJobParams({ ...jobParams, driveMinutes: v })} />
            <MiniField label="Miles" value={jobParams.distanceMiles} step={1} onChange={(v) => setJobParams({ ...jobParams, distanceMiles: v })} />
          </div>

          {/* Who's running this job */}
          <div style={{ marginTop: 12 }}>
            <span className="micro-label" style={{ display: 'block', marginBottom: 6, fontSize: 9 }}>Assigned to</span>
            <div className="grid grid-cols-2 gap-2">
              {['p1', 'p2'].map((key) => {
                const m = app.team?.members?.[key]
                const name = (m?.name || '').trim() || (key === 'p1' ? 'Porter' : 'Partner')
                const active = assignedTo === key
                return (
                  <button
                    key={key}
                    onClick={() => { haptic.light(); setAssignedTo(key) }}
                    className="flex items-center gap-2"
                    style={{
                      padding: '10px 12px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, minHeight: 44,
                      background: active ? 'color-mix(in srgb, var(--teal) 18%, transparent)' : 'var(--surface2)',
                      border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                      color: active ? 'var(--teal-lt)' : 'var(--text2)',
                    }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: 999, background: m?.color || 'var(--teal-lt)', flexShrink: 0 }} />
                    {name}{key === app.whoami ? ' (you)' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Dump facility toggle (auto-picked from the job's city) */}
          <div style={{ marginTop: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="micro-label" style={{ fontSize: 9 }}>
                Dump site{!jobParams.landfill && jobCity ? ` · auto (${jobCity})` : !jobParams.landfill ? ' · auto' : ''}
              </span>
              {jobParams.landfill && (
                <button onClick={() => setJobParams({ ...jobParams, landfill: null })} className="accent" style={{ fontSize: 11, fontWeight: 600 }}>
                  Use auto
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(LANDFILLS).map((lf) => {
                const active = landfill === lf.key
                return (
                  <button
                    key={lf.key}
                    onClick={() => { haptic.light(); setJobParams({ ...jobParams, landfill: lf.key }) }}
                    style={{
                      padding: '9px 10px', borderRadius: 12, textAlign: 'left',
                      background: active ? 'rgba(42,127,138,0.18)' : 'var(--surface2)',
                      border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--teal-lt)' : 'var(--text)' }}>{lf.name}</div>
                    <div className="text-3" style={{ fontSize: 11 }}>{lf.place} · {lf.blurb}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Quote style: simple vs Good/Better/Best */}
        <div className="surface flex items-center justify-between" style={{ borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Quote style</span>
            <div className="text-3" style={{ fontSize: 11.5 }}>
              {tiered ? `Basic / Standard / Premium from ${formatMoney(tierPrices(pricing.total)[0].price)}` : 'One price, one option'}
            </div>
          </div>
          <div className="flex gap-1" style={{ background: 'var(--surface2)', borderRadius: 999, padding: 3 }}>
            {[{ k: false, l: 'Simple' }, { k: true, l: 'Tiered' }].map((o) => (
              <button
                key={o.l}
                onClick={() => { haptic.light(); setTiered(o.k) }}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, border: 'none',
                  background: tiered === o.k ? 'var(--teal)' : 'transparent',
                  color: tiered === o.k ? '#fff' : 'var(--text2)',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Adjustments: discount + extra charges */}
        <div className="surface" style={{ borderRadius: 16, padding: 14, marginBottom: 12 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <span className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Adjustments</span>
            <button
              onClick={() => setAdditionalCharges((c) => [...c, { label: '', amount: 0 }])}
              className="flex items-center gap-1.5"
              style={{ padding: '6px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: 'var(--surface2)', color: 'var(--teal-lt)', border: '1px solid var(--border)' }}
            >
              <Plus size={13} /> Add charge
            </button>
          </div>

          {/* extra charges */}
          {additionalCharges.map((ch, i) => (
            <div key={i} className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <input
                className="field"
                placeholder="e.g. Stairs / long carry"
                value={ch.label}
                onChange={(e) => setAdditionalCharges((list) => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                style={{ flex: 1 }}
              />
              <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <span className="text-3" style={{ paddingLeft: 10, fontSize: 13 }}>$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={ch.amount}
                  onChange={(e) => setAdditionalCharges((list) => list.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)))}
                  className="tabular"
                  style={{ width: 64, background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'right', padding: '9px 6px', fontWeight: 600, fontSize: 14, outline: 'none' }}
                />
              </div>
              <button onClick={() => setAdditionalCharges((list) => list.filter((_, j) => j !== i))} style={{ color: 'var(--text3)', padding: 4 }}>
                <X size={16} />
              </button>
            </div>
          ))}

          {/* discount */}
          <div className="flex items-center justify-between gap-3" style={{ marginTop: additionalCharges.length ? 4 : 0 }}>
            <span className="flex items-center gap-1.5" style={{ fontSize: 14, color: 'var(--text)' }}>
              <Percent size={14} color="var(--text3)" /> Discount
            </span>
            <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span className="text-3" style={{ paddingLeft: 10, fontSize: 13 }}>−$</span>
              <input
                type="number"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="tabular"
                style={{ width: 72, background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'right', padding: '9px 8px', fontWeight: 600, fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Photos — before/after, stamped + geotagged */}
        <div style={{ marginBottom: 12, marginTop: -12 }}>
          <PhotoDock photos={photos} onChange={setPhotos} />
        </div>

        {/* Internal cost panel */}
        {settings.showInternal && (
          <Collapsible
            open={internalOpen}
            onToggle={() => setInternalOpen((v) => !v)}
            icon={Lock}
            title="Staff only — cost & margin"
            subtitle={`Profit ${formatMoney(pricing.profit)} · ${Math.round(pricing.margin)}% margin`}
            accent
          >
            <div className="space-y-2">
              <CostRow label="Labor" value={pricing.labor} />
              <CostRow label="Gas" value={pricing.gas} />
              <CostRow label={`Dump fees · ${LANDFILLS[landfill]?.name || 'Dump'}`} value={pricing.dump} />
              {pricing.disposal > 0 && (
                <CostRow label={`Item fees · ${LANDFILLS[landfill]?.name || 'Dump'}`} value={pricing.disposal} />
              )}
              {underCovered.length > 0 && (
                <div style={{ fontSize: 12, color: '#e7a23d', lineHeight: 1.5, padding: '4px 0' }}>
                  ⚠ Customer fee doesn’t cover the dump’s charge for:{' '}
                  {underCovered.map((i) => `${i.name} (we pay $${(ITEM_DUMP_FEES[landfill] || {})[i.id]}, charge $${i.surcharge || 0})`).join(' · ')}
                  {' '}— raise its fee under Settings → Items.
                </div>
              )}
              <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
              <CostRow label="Total cost" value={pricing.cost} bold />
              <CostRow label="Quoted total" value={pricing.total} bold />
              <div className="flex items-center justify-between" style={{ paddingTop: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Profit</span>
                <span className="tabular" style={{ fontSize: 16, fontWeight: 800, color: pricing.profit >= 0 ? '#4ade80' : '#f08a7e' }}>
                  {formatMoney(pricing.profit)} · {Math.round(pricing.margin)}%
                </span>
              </div>
            </div>
          </Collapsible>
        )}
        <div style={{ height: 20 }} />
      </div>

      {/* ---------- Sticky bottom bar ---------- */}
      <div className="fixed left-0 right-0 bottom-0 pb-safe" style={{ zIndex: 60 }}>
        <div className="glass" style={{ maxWidth: 560, margin: '0 auto', borderRadius: '20px 20px 0 0', padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)', borderBottom: 'none' }}>
          {/* Owner-only margin guard (no customer ever sees the app) */}
          {settings.showInternal && totalQty > 0 && (() => {
            const loss = pricing.profit < 0
            const low = !loss && pricing.margin < 20
            const c = loss ? '#f0786b' : low ? '#e7a23d' : '#4ade80'
            const label = loss ? 'LOSS — under cost' : low ? 'Low margin' : 'Healthy margin'
            return (
              <div
                className="flex items-center justify-between"
                style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 10, background: `color-mix(in srgb, ${c} 14%, transparent)`, border: `1px solid color-mix(in srgb, ${c} 35%, transparent)` }}
              >
                <span className="micro-label" style={{ fontSize: 9.5, color: c }}>
                  {loss ? '⚠ ' : ''}{label}
                </span>
                <span className="tabular" style={{ fontSize: 12.5, fontWeight: 700, color: c }}>
                  {formatMoney(pricing.profit)} profit · {Math.round(pricing.margin)}%
                </span>
              </div>
            )
          })()}
          <div className="flex items-center gap-3">
            <div className="flex flex-col" style={{ minWidth: 64 }}>
              <span className="micro-label" style={{ fontSize: 9 }}>{totalQty} items</span>
              <span className="font-display tabular" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {formatCY(pricing.totalCY)} CY
              </span>
            </div>
            <ArrowRight size={16} color="var(--text3)" />
            <div className="flex flex-col" style={{ flex: 1 }}>
              <span className="micro-label" style={{ fontSize: 9 }}>Total</span>
              <span className="font-display tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                <AnimatedNumber value={pricing.total} format="money" duration={500} />
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={generate}
              className="flex items-center gap-2 shimmer-sweep"
              style={{
                background: 'linear-gradient(135deg, var(--gold), #e7c14f)',
                color: '#1a1206', fontWeight: 800, fontSize: 15, fontFamily: 'Inter, sans-serif',
                borderRadius: 14, padding: '13px 18px', border: 'none',
                boxShadow: '0 8px 24px rgba(212,160,23,0.35)',
              }}
            >
              Generate ✦
            </motion.button>
          </div>
        </div>
      </div>

      <QuoteReveal
        open={reveal}
        quote={draftQuote}
        business={business}
        onClose={() => setReveal(false)}
        onAccept={onAccept}
        onShare={onShare}
        onEdit={() => setReveal(false)}
      />
    </div>
  )
}

function Collapsible({ open, onToggle, icon: Icon, title, subtitle, children, accent }) {
  return (
    <div className="surface" style={{ borderRadius: 16, overflow: 'hidden' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 text-left" style={{ padding: 14 }}>
        <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 10, background: accent ? 'rgba(212,160,23,0.14)' : 'var(--surface2)', color: accent ? 'var(--gold)' : 'var(--teal-lt)', flexShrink: 0 }}>
          <Icon size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{title}</div>
          <div className="text-2" style={{ fontSize: 12.5, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={18} color="var(--text3)" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 14px 14px' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MiniField({ label, value, step = 1, onChange }) {
  return (
    <div>
      <span className="micro-label" style={{ display: 'block', marginBottom: 4, fontSize: 9 }}>{label}</span>
      <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <button onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))} style={{ padding: '8px 10px', color: 'var(--text2)', fontWeight: 700 }}>−</button>
        <span className="tabular" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{value}</span>
        <button onClick={() => onChange(+(value + step).toFixed(2))} style={{ padding: '8px 10px', color: 'var(--teal-lt)', fontWeight: 700 }}>+</button>
      </div>
    </div>
  )
}

function CostRow({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 13.5, color: bold ? 'var(--text)' : 'var(--text2)', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span className="tabular" style={{ fontSize: 13.5, fontWeight: bold ? 700 : 500, color: 'var(--text)' }}>{formatMoney(value)}</span>
    </div>
  )
}
