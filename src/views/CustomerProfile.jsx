import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Phone, MessageSquare, MapPin, Mail, Plus, FileText, DollarSign, CheckCircle2 } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from '../components/Toast'
import Badge from '../components/Badge'
import { formatMoney, relativeDate, jobElapsedMs, formatDuration } from '../lib/utils'

export default function CustomerProfile({ route, navigate }) {
  const app = useApp()
  const toast = useToast()
  const customer = app.customers.find((c) => c.id === route.params.customerId)

  const quotes = useMemo(() => {
    if (!customer) return []
    return app.quotes
      .filter((q) => q.customer?.id === customer.id)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
  }, [app.quotes, customer])

  const stats = useMemo(() => {
    const won = quotes.filter((q) => ['accepted', 'completed'].includes(q.status))
    const earned = won.reduce((s, q) => s + (q.pricing?.total || 0), 0)
    const unpaid = quotes.filter((q) => q.status === 'completed' && !q.paid)
    const last = quotes[0]
    const timed = quotes.filter((q) => q.status === 'completed' && jobElapsedMs(q) > 0)
    const avgMs = timed.length ? timed.reduce((s, q) => s + jobElapsedMs(q), 0) / timed.length : 0
    return { jobs: won.length, earned, unpaidCount: unpaid.length, last, avgMs }
  }, [quotes])

  const [notes, setNotes] = useState(customer?.notes || '')
  useEffect(() => { setNotes(customer?.notes || '') }, [customer?.id])

  if (!customer) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p className="text-2">Customer not found.</p>
        <button className="accent" onClick={() => navigate('customers')} style={{ marginTop: 12 }}>← Back to customers</button>
      </div>
    )
  }

  const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer'
  const initials = `${(customer.firstName?.[0] || '?')}${customer.lastName?.[0] || ''}`.toUpperCase()

  const saveNotes = () => {
    if (notes !== (customer.notes || '')) {
      app.updateCustomer(customer.id, { notes })
      toast.success('Notes saved')
    }
  }

  const newQuote = () => navigate('builder', { customerId: customer.id })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 14px) 16px 24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <button onClick={() => navigate('customers')} className="surface flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 12, color: 'var(--text)' }}>
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="surface" style={{ borderRadius: 22, padding: 20 }}>
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center font-display" style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--surface2)', color: 'var(--teal-lt)', fontWeight: 800, fontSize: 20 }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-2">
              <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{name}</h1>
              {stats.jobs >= 2 && (
                <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'var(--gold)', color: '#1a1206', flexShrink: 0 }}>
                  REPEAT
                </span>
              )}
            </div>
            {customer.address && <div className="text-2" style={{ fontSize: 13, marginTop: 1 }}>{customer.address}</div>}
          </div>
        </div>

        {/* one-tap contact actions */}
        <div className="grid grid-cols-3 gap-2.5" style={{ marginTop: 16 }}>
          <ContactAction icon={Phone} label="Call" href={customer.phone ? `tel:${customer.phone}` : null} />
          <ContactAction icon={MessageSquare} label="Text" href={customer.phone ? `sms:${customer.phone}` : null} />
          <ContactAction icon={MapPin} label="Map" href={customer.address ? `https://maps.apple.com/?q=${encodeURIComponent(customer.address)}` : null} />
        </div>
        {customer.email && (
          <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-2" style={{ fontSize: 13.5, marginTop: 12 }}>
            <Mail size={14} color="var(--teal-lt)" /> {customer.email}
          </a>
        )}
      </motion.div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-2.5" style={{ marginTop: 12 }}>
        <StatCard icon={DollarSign} label="Earned" value={formatMoney(stats.earned)} />
        <StatCard icon={FileText} label="Jobs won" value={String(stats.jobs)} />
        <StatCard icon={CheckCircle2} label={stats.avgMs ? 'Avg job' : 'Last job'} value={stats.avgMs ? formatDuration(stats.avgMs) : stats.last ? relativeDate(stats.last.updatedAt || stats.last.createdAt) : '—'} />
      </div>

      {stats.unpaidCount > 0 && (
        <div className="surface flex items-center gap-2" style={{ borderRadius: 12, padding: '10px 14px', marginTop: 10, borderLeft: '3px solid var(--warn)' }}>
          <span style={{ fontSize: 13, color: '#e7965b', fontWeight: 600 }}>⚠ {stats.unpaidCount} completed job{stats.unpaidCount > 1 ? 's' : ''} not marked paid</span>
        </div>
      )}

      {/* new quote */}
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={newQuote}
        className="w-full flex items-center justify-center gap-2 shimmer-sweep"
        style={{ marginTop: 12, background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-lt) 100%)', color: '#fff', fontWeight: 800, fontSize: 16, borderRadius: 16, padding: '15px', border: 'none' }}
      >
        <Plus size={19} /> New quote for {customer.firstName || 'them'}
      </motion.button>

      {/* notes */}
      <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
        <span className="micro-label" style={{ display: 'block', marginBottom: 8 }}>Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder="Gate code, dog in yard, parking, preferences…"
          rows={3}
          className="field"
          style={{ resize: 'vertical', lineHeight: 1.45 }}
        />
      </div>

      {/* quotes */}
      <div className="flex items-center justify-between" style={{ marginTop: 22, marginBottom: 12 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Quote history</h2>
        <span className="text-3" style={{ fontSize: 13 }}>{quotes.length}</span>
      </div>
      {quotes.length === 0 ? (
        <div className="surface text-center text-2" style={{ borderRadius: 16, padding: 24, fontSize: 14 }}>
          No quotes yet for this customer.
        </div>
      ) : (
        <div className="space-y-2.5">
          {quotes.map((q, i) => (
            <motion.button
              key={q.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('quote', { quoteId: q.id })}
              className="surface w-full flex items-center gap-3 text-left"
              style={{ borderRadius: 16, padding: '13px 14px' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="tabular font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{q.id}</span>
                  {q.paid && <span style={{ fontSize: 10.5, fontWeight: 700, color: '#4ade80' }}>PAID</span>}
                </div>
                <div className="text-3" style={{ fontSize: 12, marginTop: 2 }}>{relativeDate(q.updatedAt || q.createdAt)}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-display tabular" style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{formatMoney(q.pricing?.total || 0)}</span>
                <Badge status={q.status} />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}

function ContactAction({ icon: Icon, label, href }) {
  const disabled = !href
  const inner = (
    <div
      className="flex flex-col items-center justify-center gap-1.5"
      style={{ padding: '12px 0', borderRadius: 14, background: 'var(--surface2)', border: '1px solid var(--border)', opacity: disabled ? 0.4 : 1 }}
    >
      <Icon size={19} color="var(--teal-lt)" />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{label}</span>
    </div>
  )
  return disabled ? inner : <a href={href}>{inner}</a>
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="surface" style={{ borderRadius: 14, padding: '12px', borderLeft: '3px solid var(--teal)' }}>
      <Icon size={14} color="var(--teal-lt)" style={{ opacity: 0.8 }} />
      <div className="font-display tabular" style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 6 }}>{value}</div>
      <div className="micro-label" style={{ fontSize: 9, marginTop: 1 }}>{label}</div>
    </div>
  )
}
