import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Share2, Pencil, Download, Trash2, Check, X, Phone, Mail, MapPin, Copy } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from '../components/Toast'
import Badge from '../components/Badge'
import ScheduleControl from '../components/ScheduleControl'
import JobDone from '../components/JobDone'
import JobNotes from '../components/JobNotes'
import MarkPaid from '../components/MarkPaid'
import JobTimer from '../components/JobTimer'
import JobExpenses from '../components/JobExpenses'
import PhotoDock from '../components/PhotoDock'
import { normalizePhotos } from '../lib/photos'
import EJSLogo from '../components/EJSLogo'
import { formatMoney, formatCY, formatDuration, jobElapsedMs } from '../lib/utils'
import { calcQuote, tierPrices } from '../lib/pricing'
import { downloadQuotePdf, shareQuotePdf } from '../lib/pdf'

const STATUS_FLOW = [
  { key: 'sent', label: 'Mark sent', icon: Share2 },
  { key: 'accepted', label: 'Accepted', icon: Check },
  { key: 'completed', label: 'Completed', icon: Check },
  { key: 'declined', label: 'Declined', icon: X },
]

const LOSS_REASONS = [
  { key: 'price', label: 'Price too high', icon: '💰' },
  { key: 'competitor', label: 'Went with competitor', icon: '🏃' },
  { key: 'timing', label: 'Timing didn’t work', icon: '📅' },
  { key: 'ghosted', label: 'No response (ghosted)', icon: '👻' },
  { key: 'other', label: 'Other', icon: '🤷' },
]

export default function QuoteDetail({ route, navigate }) {
  const app = useApp()
  const toast = useToast()
  const [lossPicker, setLossPicker] = useState(false)
  const quote = app.quotes.find((q) => q.id === route.params.quoteId)

  if (!quote) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p className="text-2">Quote not found.</p>
        <button className="accent" onClick={() => navigate('dashboard')} style={{ marginTop: 12 }}>← Back home</button>
      </div>
    )
  }

  const p = quote.pricing || {}
  const c = quote.customer || {}
  const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'No customer'
  const surcharges = (quote.items || []).filter((it) => it.surcharge)

  const setStatus = (s) => {
    if (s === 'declined' && quote.status !== 'declined') { setLossPicker(true); return }
    app.setQuoteStatus(quote.id, s)
    toast.success(`Marked ${s}`)
  }
  const declineWithReason = (reason) => {
    app.setQuoteStatus(quote.id, 'declined', { lossReason: reason })
    setLossPicker(false)
    toast.info('Logged — this feeds your win/loss insights')
  }
  const share = async () => {
    const res = await shareQuotePdf(quote, app.business, app.settings)
    toast.success(res === 'shared' ? 'Shared!' : 'PDF downloaded')
  }
  const del = () => {
    if (window.confirm('Delete this quote?')) { app.deleteQuote(quote.id); toast.info('Quote deleted'); navigate('dashboard') }
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 24px' }}>
      {/* header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('dashboard')} className="surface flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 12, color: 'var(--text)' }}>
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {quote.paid && (
            <span className="inline-flex items-center gap-1 rounded-full" style={{ padding: '4px 10px', background: 'rgba(30,126,52,0.16)', color: '#4ade80', fontSize: 12, fontWeight: 700 }}>
              <Check size={12} /> Paid
            </span>
          )}
          <Badge status={quote.status} />
        </div>
      </div>

      {/* quote card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface"
        style={{ borderRadius: 22, padding: 20, overflow: 'hidden' }}
      >
        <div className="flex items-center justify-between">
          <EJSLogo size={40} custom={app.business.logo} />
          <div style={{ textAlign: 'right' }}>
            <div className="font-display tabular" style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{quote.id}</div>
            <div className="text-3" style={{ fontSize: 11.5 }}>
              {new Date(quote.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ height: 2, background: 'var(--teal)', margin: '16px 0', opacity: 0.7 }} />

        <div className="micro-label">Prepared for</div>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', marginTop: 2 }}>{name}</div>
        <div className="flex flex-col gap-1" style={{ marginTop: 8 }}>
          {c.phone && <ContactLine icon={Phone} text={c.phone} href={`tel:${c.phone}`} />}
          {c.email && <ContactLine icon={Mail} text={c.email} href={`mailto:${c.email}`} />}
          {c.address && <ContactLine icon={MapPin} text={c.address} href={`https://maps.apple.com/?q=${encodeURIComponent(c.address)}`} />}
        </div>

        {/* items */}
        <div style={{ marginTop: 18 }} className="rounded-2xl overflow-hidden" >
          {(quote.items || []).map((it, i) => (
            <div key={i} className="flex items-center gap-3" style={{ padding: '11px 0', borderBottom: i < quote.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{it.name}</span>
              <span className="tabular text-2" style={{ fontSize: 13 }}>{formatCY(it.cy * it.qty)} CY</span>
              {it.qty > 1 && <span className="tabular text-3" style={{ fontSize: 13, minWidth: 26, textAlign: 'right' }}>×{it.qty}</span>}
            </div>
          ))}
        </div>

        <div className="text-center text-2" style={{ fontSize: 13, margin: '14px 0' }}>
          Approximately <b style={{ color: 'var(--teal-lt)' }}>{formatCY(p.totalCY)} CY</b> — {Math.round(Math.min(p.fillPct ?? 0, 100))}% of trailer
        </div>

        {/* pricing */}
        <div className="space-y-2" style={{ marginTop: 6 }}>
          <Row label="Base removal" value={formatMoney(p.base)} />
          {surcharges.map((it, i) => (
            <Row key={i} muted label={`${it.surchargeLabel || 'Special item fee'}${it.qty > 1 ? ` ×${it.qty}` : ''}`} value={formatMoney(it.surcharge * it.qty)} />
          ))}
          {(quote.additionalCharges || []).map((ch, i) => <Row key={`a${i}`} muted label={ch.label} value={formatMoney(ch.amount)} />)}
          {p.discount > 0 && <Row good label="Discount" value={`−${formatMoney(p.discount)}`} />}
        </div>

        <div style={{ height: 1.5, background: 'var(--teal)', margin: '14px 0' }} />
        <div className="flex items-center justify-between">
          <span className="font-display" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Total</span>
          <span className="font-display tabular" style={{ fontWeight: 800, fontSize: 30, color: 'var(--teal-lt)' }}>{formatMoney(p.total)}</span>
        </div>
      </motion.div>

      {/* good / better / best */}
      {quote.tiered && <TierPicker quote={quote} app={app} toast={toast} />}

      {/* job clock — live for booked jobs, read-only history after */}
      {(quote.status === 'accepted' || jobElapsedMs(quote) > 0) && quote.status !== 'completed' && (
        <JobTimer quote={quote} />
      )}

      {/* the end-of-job ritual — stays mounted through completion so the
          summary sheet survives the status flip */}
      {['accepted', 'completed'].includes(quote.status) && <JobDone quote={quote} navigate={navigate} />}

      {/* schedule */}
      <div style={{ marginTop: 12 }}>
        <ScheduleControl quote={quote} />
      </div>

      {/* notes with hold-to-talk */}
      <JobNotes quote={quote} />

      {/* actual costs — dump, fuel, misc */}
      {['accepted', 'completed'].includes(quote.status) && <JobExpenses quote={quote} />}

      {/* photos — before/after with capture */}
      <PhotoDock
        photos={normalizePhotos(quote.photos)}
        onChange={(updater) => {
          const next = typeof updater === 'function' ? updater(normalizePhotos(quote.photos)) : updater
          app.saveQuote({ ...quote, photos: next })
        }}
      />

      {/* internal margin */}
      {app.settings.showInternal && (
        <div className="surface flex items-center justify-between" style={{ borderRadius: 14, padding: '12px 16px', marginTop: 12 }}>
          <span className="micro-label">
            Internal · cost {formatMoney(p.cost)}
            {quote.status === 'completed' && jobElapsedMs(quote) > 0 && ` · ${formatDuration(jobElapsedMs(quote))} on site`}
          </span>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700, color: p.profit >= 0 ? '#4ade80' : '#f08a7e' }}>
            {formatMoney(p.profit)} profit · {Math.round(p.margin || 0)}%
          </span>
        </div>
      )}

      {/* primary actions */}
      <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: 14 }}>
        <ActionBtn icon={Share2} label="Share PDF" primary onClick={share} />
        <ActionBtn icon={Download} label="Download" onClick={() => { downloadQuotePdf(quote, app.business, app.settings); toast.success('PDF downloaded') }} />
        <ActionBtn icon={Pencil} label="Edit" onClick={() => navigate('builder', { quoteId: quote.id })} />
        <ActionBtn icon={Copy} label="Duplicate" onClick={() => { toast.info('New quote from this one'); navigate('builder', { dupeFrom: quote.id }) }} />
        <div className="col-span-2">
          <ActionBtn icon={Trash2} label="Delete quote" danger onClick={del} />
        </div>
      </div>

      {/* assignment */}
      <div className="surface flex items-center justify-between" style={{ borderRadius: 14, padding: '12px 14px', marginTop: 14 }}>
        <span className="micro-label">Assigned to</span>
        <div className="flex gap-2">
          {['p1', 'p2'].map((key) => {
            const m = app.team?.members?.[key]
            const name = (m?.name || '').trim() || (key === 'p1' ? 'Porter' : 'Partner')
            const active = (quote.assignedTo || 'p1') === key
            return (
              <button
                key={key}
                onClick={() => { app.saveQuote({ ...quote, assignedTo: key }); toast.success(`Assigned to ${name}`) }}
                className="flex items-center gap-1.5"
                style={{
                  padding: '7px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 700,
                  background: active ? 'color-mix(in srgb, var(--teal) 20%, transparent)' : 'var(--surface2)',
                  color: active ? 'var(--teal-lt)' : 'var(--text2)',
                  border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: m?.color || 'var(--teal-lt)' }} />
                {name}
              </button>
            )
          })}
        </div>
      </div>

      {/* status flow */}
      <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 14 }}>
        <div className="micro-label" style={{ marginBottom: 10 }}>Update status</div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FLOW.map((s) => {
            const Icon = s.icon
            const active = quote.status === s.key
            return (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className="flex items-center gap-1.5"
                style={{
                  padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600,
                  background: active ? 'var(--teal)' : 'var(--surface2)',
                  color: active ? '#fff' : 'var(--text2)',
                  border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                }}
              >
                <Icon size={14} /> {s.label}
              </button>
            )
          })}
        </div>

        {/* payment */}
        <MarkPaid quote={quote} />

        {quote.status === 'declined' && quote.lossReason && (
          <div className="text-3" style={{ fontSize: 12, marginTop: 10 }}>
            Lost: {LOSS_REASONS.find((r) => r.key === quote.lossReason)?.label || quote.lossReason}
          </div>
        )}
      </div>

      {/* why'd we lose it? */}
      <AnimatePresence>
        {lossPicker && (
          <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 9100 }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(4,8,15,0.7)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setLossPicker(false)}
            />
            <motion.div
              className="relative w-full sm:max-w-md"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '24px 24px 0 0', padding: '20px 18px calc(env(safe-area-inset-bottom) + 20px)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>Why’d this one slip away?</h3>
              <p className="text-2" style={{ fontSize: 13, marginBottom: 14 }}>One tap — it builds your win/loss picture over time.</p>
              <div className="space-y-2">
                {LOSS_REASONS.map((r) => (
                  <motion.button
                    key={r.key}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => declineWithReason(r.key)}
                    className="w-full flex items-center gap-3 text-left"
                    style={{
                      padding: '13px 14px', borderRadius: 13, fontSize: 14.5, fontWeight: 700, minHeight: 50,
                      background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{r.icon}</span> {r.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Tier selection writes a "package upgrade" line into additionalCharges and
 * recomputes pricing, so paid amounts / revenue / margins all stay honest.
 */
function TierPicker({ quote, app, toast }) {
  const upgradeCharge = (quote.additionalCharges || []).find((c) => c._tier)
  const baseTotal = (quote.pricing?.total || 0) - (upgradeCharge ? Number(upgradeCharge.amount) || 0 : 0)
  const tiers = tierPrices(baseTotal)
  const selected = quote.tierChoice || (upgradeCharge ? upgradeCharge._tier : 'basic')

  const choose = (tier) => {
    const charges = (quote.additionalCharges || []).filter((c) => !c._tier)
    if (tier.mult > 1) {
      charges.push({ label: `${tier.label} package`, amount: tier.price - tiers[0].price, _tier: tier.key })
    }
    const pricing = calcQuote(
      (quote.items || []).map((i) => ({ itemId: i.itemId, cy: i.cy, qty: i.qty, surcharge: i.surcharge })),
      quote.jobParams,
      app.settings,
      { discount: quote.discount, additionalCharges: charges },
    )
    app.saveQuote({ ...quote, additionalCharges: charges, tierChoice: tier.key, pricing })
    toast.success(`${tier.label} — ${formatMoney(tier.price)}`)
  }

  return (
    <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 14 }}>
      <div className="micro-label" style={{ marginBottom: 10 }}>Pick a package</div>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((t, i) => {
          const active = selected === t.key
          return (
            <motion.button
              key={t.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => choose(t)}
              className="relative flex flex-col items-center text-center"
              style={{
                padding: '13px 6px 11px', borderRadius: 14, minHeight: 92,
                background: active ? 'color-mix(in srgb, var(--teal) 18%, transparent)' : 'var(--surface2)',
                border: `1.5px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
              }}
            >
              {i === 1 && (
                <span style={{ position: 'absolute', top: -8, fontSize: 8, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: 'var(--gold)', color: '#1a1206', letterSpacing: '0.06em' }}>
                  POPULAR
                </span>
              )}
              <span style={{ fontSize: 12, fontWeight: 800, color: active ? 'var(--teal-lt)' : 'var(--text)' }}>{t.label}</span>
              <span className="font-display tabular" style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginTop: 3 }}>
                {formatMoney(t.price)}
              </span>
              <span className="text-3" style={{ fontSize: 9, marginTop: 3, lineHeight: 1.3 }}>{t.desc}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

function ContactLine({ icon: Icon, text, href }) {
  const inner = (
    <span className="flex items-center gap-2 text-2" style={{ fontSize: 13.5 }}>
      <Icon size={14} color="var(--teal-lt)" /> {text}
    </span>
  )
  return href ? <a href={href}>{inner}</a> : inner
}

function Row({ label, value, muted, good }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 14, color: muted ? 'var(--text2)' : 'var(--text)' }}>{label}</span>
      <span className="tabular" style={{ fontSize: 14, fontWeight: 600, color: good ? '#4ade80' : 'var(--text)' }}>{value}</span>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary, danger }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full"
      style={{
        padding: '13px', borderRadius: 14, fontWeight: 700, fontSize: 14,
        background: primary ? 'linear-gradient(135deg, var(--teal), var(--teal-lt))' : 'var(--surface)',
        color: primary ? '#fff' : danger ? '#f08a7e' : 'var(--text)',
        border: `1px solid ${primary ? 'transparent' : 'var(--border)'}`,
      }}
    >
      <Icon size={17} /> {label}
    </motion.button>
  )
}
