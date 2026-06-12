import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Inbox, Phone, MessageSquare, Sparkles, Check, X, RefreshCw } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from '../components/Toast'
import { useHaptic } from '../hooks/useHaptic'
import EmptyState from '../components/EmptyState'
import { leadPhotoUrl, smsTemplate, matchCustomersByPhone, formatPreferred, phoneDigits } from '../lib/leads'
import { ensurePushSubscription } from '../lib/push'
import { relativeDate, copyText } from '../lib/utils'

const LEAD_BADGE = {
  new:       { label: 'New',       bg: 'rgba(255,107,53,0.16)',  fg: '#ff8c5a', dot: '#ff6b35' },
  contacted: { label: 'Contacted', bg: 'rgba(91,181,196,0.16)',  fg: '#5bb5c4', dot: '#3d9baa' },
  converted: { label: 'Converted', bg: 'rgba(30,126,52,0.18)',   fg: '#4ade80', dot: '#1e7e34' },
  stale:     { label: 'Stale',     bg: 'rgba(192,57,43,0.16)',   fg: '#f08a7e', dot: '#c0392b' },
}

export default function LeadsInbox({ navigate }) {
  const { leads, unreadLeadCount, fetchLeads, updateLead, updateLeadStatus, convertLeadToQuote, customers, business, cloud } = useApp()
  const toast = useToast()
  const haptic = useHaptic()
  const [smsLead, setSmsLead] = useState(null)       // lead in the price-range sheet
  const [pickerLead, setPickerLead] = useState(null) // lead with ambiguous customer matches
  const [fullPhoto, setFullPhoto] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const visible = useMemo(() => leads.filter((l) => l.status !== 'archived'), [leads])

  // Register this device for push the first time the inbox is opened while
  // signed in — the user has clearly "used the app" by now.
  useEffect(() => {
    if (cloud.user) ensurePushSubscription(cloud.user.id)
  }, [cloud.user])

  const refresh = async () => {
    setRefreshing(true)
    await fetchLeads()
    setRefreshing(false)
  }

  const buildQuote = (lead) => {
    haptic.light()
    if (lead.customer_id && customers.some((c) => c.id === lead.customer_id)) {
      convertLeadToQuote(lead, lead.customer_id)
      navigate('builder', { customerId: lead.customer_id, leadId: lead.id })
      return
    }
    const matches = matchCustomersByPhone(lead, customers)
    if (matches.length > 1) { setPickerLead({ lead, matches }); return }
    const customerId = convertLeadToQuote(lead, matches[0]?.id || null)
    navigate('builder', { customerId, leadId: lead.id })
  }

  return (
    <div style={{ padding: '0 16px', maxWidth: 560, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: 'calc(env(safe-area-inset-top) + 22px) 2px 14px' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,107,53,0.14)' }}>
            <Inbox size={21} color="#ff6b35" />
          </div>
          <div>
            <h1 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>Leads</h1>
            <div className="text-3" style={{ fontSize: 12 }}>
              {unreadLeadCount > 0 ? `${unreadLeadCount} new from your website` : 'From elitejunkut.com'}
            </div>
          </div>
        </div>
        <motion.button whileTap={{ scale: 0.88, rotate: 180 }} onClick={refresh} className="flex items-center justify-center glass" style={{ width: 40, height: 40, borderRadius: 12 }} aria-label="Refresh leads">
          <RefreshCw size={18} color="var(--teal-lt)" className={refreshing ? 'animate-spin' : ''} />
        </motion.button>
      </div>

      {!cloud.user && (
        <div className="surface" style={{ borderRadius: 16, padding: '14px 16px', marginBottom: 12, borderLeft: '3px solid var(--warn, #d35400)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Sign in to see leads</div>
          <div className="text-2" style={{ fontSize: 12.5, marginTop: 2 }}>
            Website leads are private — sign in under Settings → Cloud Sync to load them.
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          art="truck"
          title="No leads yet"
          message="When someone requests a pickup on elitejunkut.com, it lands here instantly — with their photos."
        />
      ) : (
        <div className="space-y-3" style={{ paddingBottom: 24 }}>
          <AnimatePresence>
            {visible.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onBuildQuote={() => buildQuote(lead)}
                onSendPrice={() => setSmsLead(lead)}
                onContacted={() => { updateLeadStatus(lead.id, 'contacted'); toast.success('Marked contacted') }}
                onArchive={() => { updateLeadStatus(lead.id, 'archived'); toast.info('Lead archived') }}
                onPhoto={setFullPhoto}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Price range SMS sheet */}
      <AnimatePresence>
        {smsLead && (
          <PriceRangeSheet
            lead={smsLead}
            ownerName={business.ownerName || 'Porter'}
            onClose={() => setSmsLead(null)}
            onSent={() => {
              updateLead(smsLead.id, { price_range_sent: true })
              toast.success('Price range copied — paste it into Messages')
              setSmsLead(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* Ambiguous customer match picker */}
      <AnimatePresence>
        {pickerLead && (
          <Sheet onClose={() => setPickerLead(null)} title="Which customer is this?">
            <p className="text-2" style={{ fontSize: 13, marginBottom: 12 }}>
              {pickerLead.matches.length} profiles share this phone number. Pick one, or create a fresh profile.
            </p>
            <div className="space-y-2">
              {pickerLead.matches.map((c) => (
                <button
                  key={c.id}
                  className="surface w-full text-left"
                  style={{ borderRadius: 14, padding: '12px 14px' }}
                  onClick={() => {
                    const customerId = convertLeadToQuote(pickerLead.lead, c.id)
                    setPickerLead(null)
                    navigate('builder', { customerId, leadId: pickerLead.lead.id })
                  }}
                >
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unnamed'}
                  </div>
                  <div className="text-3" style={{ fontSize: 12 }}>{c.phone} {c.address ? `· ${c.address}` : ''}</div>
                </button>
              ))}
              <button
                className="w-full"
                style={{ borderRadius: 14, padding: '12px 14px', border: '1.5px dashed var(--border)', color: 'var(--teal-lt)', fontSize: 14, fontWeight: 600, background: 'transparent' }}
                onClick={() => {
                  const customerId = convertLeadToQuote(pickerLead.lead, null)
                  setPickerLead(null)
                  navigate('builder', { customerId, leadId: pickerLead.lead.id })
                }}
              >
                + Create new customer
              </button>
            </div>
          </Sheet>
        )}
      </AnimatePresence>

      {/* Full-screen photo viewer */}
      <AnimatePresence>
        {fullPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFullPhoto(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(4,8,15,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={fullPhoto} alt="Lead photo"
              style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain' }}
            />
            <button aria-label="Close photo" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', right: 18, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 999, width: 38, height: 38, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LeadCard({ lead, onBuildQuote, onSendPrice, onContacted, onArchive, onPhoto }) {
  const x = useMotionValue(0)
  const archiveHint = useTransform(x, [-120, -40], [1, 0])
  const isNew = lead.status === 'new'
  const badge = LEAD_BADGE[lead.status] || LEAD_BADGE.new
  const photos = (lead.photo_urls || []).map(leadPhotoUrl).filter(Boolean)
  const preferred = formatPreferred(lead)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -80, transition: { duration: 0.18 } }}
      style={{ position: 'relative' }}
    >
      {/* archive affordance revealed behind the card on swipe */}
      <motion.div style={{ opacity: archiveHint, position: 'absolute', inset: 0, borderRadius: 18, background: 'rgba(192,57,43,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 18 }}>
        <span style={{ color: '#f08a7e', fontWeight: 700, fontSize: 13 }}>Archive</span>
      </motion.div>
      <motion.div
        className="surface"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.05 }}
        style={{ x, borderRadius: 18, padding: 16, borderLeft: isNew ? '3px solid #ff6b35' : '3px solid transparent' }}
        onDragEnd={(_, info) => { if (info.offset.x < -110) onArchive() }}
      >
        {/* top row: name + status */}
        <div className="flex items-start justify-between gap-2">
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-2">
              {isNew && (
                <motion.span
                  animate={{ scale: [1, 1.35, 1], opacity: [1, 0.55, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  style={{ width: 9, height: 9, borderRadius: 999, background: '#ff6b35', flexShrink: 0 }}
                />
              )}
              <span className="font-display" style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{lead.name || 'Unknown'}</span>
            </div>
            <a
              href={`tel:${phoneDigits(lead.phone)}`}
              className="flex items-center gap-1.5"
              style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: 'var(--teal-lt)', textDecoration: 'none' }}
            >
              <Phone size={14} /> {lead.phone}
            </a>
          </div>
          <div className="flex flex-col items-end gap-1.5" style={{ flexShrink: 0 }}>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: badge.bg, color: badge.fg }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: badge.dot }} />
              {badge.label}
            </span>
            <span className="text-3 tabular" style={{ fontSize: 11.5 }}>{relativeDate(lead.created_at)}</span>
          </div>
        </div>

        {/* job facts */}
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
          {lead.service_type && <Chip>{lead.service_type}</Chip>}
          {lead.volume_estimate && <Chip accent>{lead.volume_estimate}</Chip>}
          {preferred && <Chip>🗓 {preferred}</Chip>}
        </div>

        {lead.service_address && (
          <div className="text-2" style={{ fontSize: 12.5, marginTop: 8 }}>📍 {lead.service_address}</div>
        )}

        {lead.notes && (
          <div
            className="text-2"
            style={{ fontSize: 13, marginTop: 8, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
          >
            {lead.notes}
          </div>
        )}

        {/* photo strip */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto" style={{ marginTop: 10, scrollbarWidth: 'none', paddingBottom: 2 }}>
            {photos.map((url, i) => (
              <button key={i} onClick={() => onPhoto(url)} style={{ flexShrink: 0, padding: 0, border: 'none', background: 'none' }} aria-label={`View photo ${i + 1}`}>
                <img src={url} alt="" loading="lazy" style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />
              </button>
            ))}
          </div>
        )}

        {/* actions */}
        <div className="flex gap-2" style={{ marginTop: 14 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onBuildQuote}
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(120deg, var(--teal) 0%, var(--teal-lt) 100%)', color: '#fff', fontWeight: 800, fontSize: 14, borderRadius: 13, padding: '11px 10px', border: 'none', boxShadow: '0 6px 18px rgba(42,127,138,0.3)' }}
          >
            <Sparkles size={15} /> Build Quote
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSendPrice}
            className="flex-1 flex items-center justify-center gap-1.5"
            style={{ background: 'rgba(255,107,53,0.14)', color: '#ff8c5a', fontWeight: 800, fontSize: 14, borderRadius: 13, padding: '11px 10px', border: '1px solid rgba(255,107,53,0.35)' }}
          >
            <MessageSquare size={15} /> {lead.price_range_sent ? 'Range sent ✓' : 'Send Price Range'}
          </motion.button>
          {isNew && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onContacted}
              aria-label="Mark contacted"
              title="Mark contacted"
              className="flex items-center justify-center"
              style={{ width: 42, borderRadius: 13, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <Check size={17} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function Chip({ children, accent }) {
  return (
    <span
      style={{
        fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 999,
        background: accent ? 'rgba(255,107,53,0.12)' : 'var(--surface2)',
        color: accent ? '#ff8c5a' : 'var(--text2)',
        border: `1px solid ${accent ? 'rgba(255,107,53,0.3)' : 'var(--border)'}`,
      }}
    >
      {children}
    </span>
  )
}

function Sheet({ title, onClose, children }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(4,8,15,0.6)' }}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="glass"
        style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9100, borderRadius: '22px 22px 0 0', padding: '18px 18px calc(env(safe-area-inset-bottom) + 18px)', maxWidth: 560, margin: '0 auto' }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, background: 'var(--border)', margin: '0 auto 14px' }} />
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <h2 className="font-display" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'var(--surface2)', border: 'none', borderRadius: 999, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </>
  )
}

function PriceRangeSheet({ lead, ownerName, onClose, onSent }) {
  const [text, setText] = useState(() => smsTemplate(lead, ownerName))

  const copy = async () => {
    const ok = await copyText(text)
    if (ok) onSent()
  }

  // iOS wants `&body=`, everything else `?body=`
  const sep = /iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'
  const smsHref = `sms:${phoneDigits(lead.phone)}${sep}body=${encodeURIComponent(text)}`

  return (
    <Sheet title="Send price range" onClose={onClose}>
      <p className="text-2" style={{ fontSize: 12.5, marginBottom: 10 }}>
        Tweak it if you want, then copy — or jump straight into Messages.
      </p>
      <textarea
        className="field"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ fontSize: 14.5, lineHeight: 1.5 }}
      />
      <div className="flex gap-2" style={{ marginTop: 12 }}>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={copy}
          className="flex-1 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(120deg, #ff6b35 0%, #ff8c5a 100%)', color: '#fff', fontWeight: 800, fontSize: 15, borderRadius: 14, padding: '13px 12px', border: 'none', boxShadow: '0 8px 22px rgba(255,107,53,0.35)' }}
        >
          📋 Copy to clipboard
        </motion.button>
        <motion.a
          whileTap={{ scale: 0.96 }}
          href={smsHref}
          onClick={onSent}
          className="flex items-center justify-center gap-2"
          style={{ background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 15, borderRadius: 14, padding: '13px 16px', border: '1px solid var(--border)', textDecoration: 'none' }}
        >
          <MessageSquare size={16} /> Messages
        </motion.a>
      </div>
    </Sheet>
  )
}
