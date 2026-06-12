import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Check, X } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from './Toast'
import { useHaptic } from '../hooks/useHaptic'
import { formatMoney, copyText } from '../lib/utils'

const METHODS = [
  { key: 'cash', label: 'Cash', icon: '💵' },
  { key: 'card', label: 'Card', icon: '💳' },
  { key: 'venmo', label: 'Venmo', icon: '📱' },
  { key: 'zelle', label: 'Zelle', icon: '🏦' },
  { key: 'check', label: 'Check', icon: '🖊️' },
]

function receiptText(quote, business, method) {
  const name = `${quote.customer?.firstName || ''} ${quote.customer?.lastName || ''}`.trim() || 'Customer'
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const items = (quote.items || []).map((i) => `• ${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join('\n')
  return (
    `RECEIPT — ${business.companyName || 'Elite Junk Solutions'}\n` +
    `${date}\n\n` +
    `Customer: ${name}\n` +
    `Job: ${quote.id}\n` +
    (items ? `${items}\n` : '') +
    `\nTotal paid: ${formatMoney(quote.pricing?.total || 0)}\n` +
    `Payment method: ${METHODS.find((m) => m.key === method)?.label || method}\n\n` +
    `Thank you! ${business.phone || ''}`.trim()
  )
}

/**
 * Mark Paid: picks the payment method, records it, copies a text-ready
 * receipt, and plays a satisfying check animation. Money in the bank.
 */
export default function MarkPaid({ quote }) {
  const app = useApp()
  const toast = useToast()
  const haptic = useHaptic()
  const [open, setOpen] = useState(false)
  const [justPaid, setJustPaid] = useState(false)

  const pay = async (method) => {
    haptic.success()
    app.setQuotePaid(quote.id, true, method)
    setOpen(false)
    setJustPaid(true)
    setTimeout(() => setJustPaid(false), 1600)
    const ok = await copyText(receiptText(quote, app.business, method))
    toast.success(ok ? 'Paid — receipt copied for texting' : 'Marked paid')
  }

  const unpay = () => {
    app.setQuotePaid(quote.id, false)
    toast.info('Marked unpaid')
  }

  const methodMeta = quote.paidMethod ? METHODS.find((m) => m.key === quote.paidMethod) : null

  return (
    <div className="flex items-center justify-between" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Payment</div>
        <div className="text-3" style={{ fontSize: 12 }}>
          {quote.paid
            ? `Paid ${new Date(quote.paid).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${methodMeta ? ` · ${methodMeta.icon} ${methodMeta.label}` : ''}`
            : 'Not yet collected'}
        </div>
      </div>

      {quote.paid ? (
        <motion.button
          onClick={unpay}
          className="flex items-center gap-2"
          animate={justPaid ? { scale: [1, 1.15, 1] } : {}}
          transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          style={{
            padding: '10px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, minHeight: 44,
            background: 'rgba(30,126,52,0.16)', color: '#4ade80', border: '1px solid rgba(30,126,52,0.4)',
          }}
        >
          <motion.span
            initial={justPaid ? { scale: 0, rotate: -90 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          >
            <Check size={16} />
          </motion.span>
          Paid
        </motion.button>
      ) : (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { haptic.light(); setOpen(true) }}
          className="flex items-center gap-2"
          style={{
            padding: '10px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 800, minHeight: 44,
            background: 'linear-gradient(135deg, var(--ember), var(--ember-lt))',
            color: '#fff', border: 'none', boxShadow: '0 6px 18px rgba(255,107,53,0.3)',
          }}
        >
          <DollarSign size={16} /> Mark paid
        </motion.button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 9100 }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(4,8,15,0.7)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
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
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>How’d they pay?</h3>
                <button onClick={() => setOpen(false)} className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--surface2)', color: 'var(--text2)' }}>
                  <X size={17} />
                </button>
              </div>
              <div className="text-2" style={{ fontSize: 13, marginBottom: 14 }}>
                {formatMoney(quote.pricing?.total || 0)} · a receipt gets copied, ready to text
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {METHODS.map((m) => (
                  <motion.button
                    key={m.key}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => pay(m.key)}
                    className="flex items-center gap-2.5"
                    style={{
                      padding: '15px 14px', borderRadius: 14, fontSize: 15, fontWeight: 700, minHeight: 54,
                      background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)',
                    }}
                  >
                    <span style={{ fontSize: 19 }}>{m.icon}</span> {m.label}
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
