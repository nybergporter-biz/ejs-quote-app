import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Pencil, Check, X } from 'lucide-react'
import EJSLogo from './EJSLogo'
import AnimatedNumber from './AnimatedNumber'
import ParticleBurst from './ParticleBurst'
import { formatMoney, formatCY } from '../lib/utils'
import { useHaptic } from '../hooks/useHaptic'

const item = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 380, damping: 30 } },
}

export default function QuoteReveal({ open, quote, business = {}, onClose, onAccept, onShare, onEdit }) {
  const haptic = useHaptic()
  const [burst, setBurst] = useState(false)
  const [showActions, setShowActions] = useState(false)

  useEffect(() => {
    if (!open) {
      setBurst(false)
      setShowActions(false)
      return
    }
    haptic.success()
    // Fire the burst exactly as the total finishes counting up
    const t1 = setTimeout(() => setBurst(true), 950)
    const t2 = setTimeout(() => setShowActions(true), 1250)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!quote) return null
  const p = quote.pricing || {}
  const c = quote.customer || {}
  const surchargeLines = (quote.items || []).filter((it) => it.surcharge)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-end sm:items-center justify-center"
          style={{ zIndex: 9000 }}
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          {/* dim backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(4,8,15,0.82)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* modal */}
          <motion.div
            className="relative w-full sm:max-w-md max-h-[94vh] overflow-y-auto"
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28, bounce: 0.25 }}
            style={{
              background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '26px 26px 0 0',
              boxShadow: '0 -20px 80px rgba(0,0,0,0.6)',
              padding: '22px 20px 26px',
            }}
          >
            <div
              className="mx-auto mb-4 sm:hidden"
              style={{ width: 44, height: 5, borderRadius: 999, background: 'var(--border)' }}
            />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex items-center justify-center rounded-full"
              style={{ width: 34, height: 34, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              <X size={18} />
            </button>

            <motion.div variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
              {/* Header */}
              <motion.div variants={item} className="flex items-center gap-3">
                <EJSLogo size={42} custom={business.logo} />
                <div>
                  <div className="font-display" style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                    {business.companyName || 'Elite Junk Solutions'}
                  </div>
                  <div className="micro-label">{quote.id}</div>
                </div>
              </motion.div>

              {/* Prepared for */}
              <motion.div variants={item} className="mt-5">
                <div className="micro-label">Prepared for</div>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 20, color: 'var(--text)', marginTop: 2 }}>
                  {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Your home'}
                </div>
                {c.address && <div className="text-2" style={{ fontSize: 13, marginTop: 2 }}>{c.address}</div>}
              </motion.div>

              {/* Items */}
              <motion.div variants={item} className="mt-5 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(quote.items || []).map((it, i) => (
                  <motion.div
                    key={i}
                    variants={item}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < quote.items.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 ? 'var(--surface)' : 'transparent' }}
                  >
                    <span style={{ fontSize: 20 }}>{it.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{it.name}</span>
                    {it.qty > 1 && <span className="tabular text-2" style={{ fontSize: 13 }}>×{it.qty}</span>}
                  </motion.div>
                ))}
              </motion.div>

              {/* Volume */}
              <motion.div variants={item} className="mt-4 text-center">
                <span className="text-2" style={{ fontSize: 13 }}>
                  Approximately <b style={{ color: 'var(--teal-lt)' }}>{formatCY(p.totalCY)} CY</b> — {Math.round(Math.min(p.fillPct ?? 0, 100))}% of trailer
                </span>
              </motion.div>

              {/* Price lines */}
              <motion.div variants={item} className="mt-4 space-y-2">
                <PriceLine label="Base removal" value={formatMoney(p.base)} />
                {surchargeLines.map((it, i) => (
                  <PriceLine
                    key={i}
                    label={`${it.surchargeLabel || 'Special item fee'}${it.qty > 1 ? ` ×${it.qty}` : ''}`}
                    value={formatMoney(it.surcharge * it.qty)}
                    muted
                  />
                ))}
                {(quote.additionalCharges || []).map((ch, i) => (
                  <PriceLine key={`a${i}`} label={ch.label || 'Additional'} value={formatMoney(ch.amount)} muted />
                ))}
                {p.discount > 0 && <PriceLine label="Discount" value={`−${formatMoney(p.discount)}`} good />}
              </motion.div>

              {/* divider draws across */}
              <motion.div
                className="my-4"
                style={{ height: 2, background: 'var(--teal)', transformOrigin: 'left' }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
              />

              {/* THE TOTAL */}
              <div className="relative flex flex-col items-center justify-center py-3">
                {/* glow ring */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 220, height: 120,
                    background: 'radial-gradient(closest-side, rgba(91,181,196,0.35), transparent)',
                    filter: 'blur(18px)',
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: [0, 0.9, 0.5], scale: [0.6, 1.15, 1] }}
                  transition={{ delay: 0.7, duration: 1, ease: 'easeOut' }}
                />
                <ParticleBurst fire={burst} count={60} />
                <div className="micro-label" style={{ position: 'relative' }}>Your total</div>
                <motion.div
                  className="relative font-display tabular"
                  style={{ fontWeight: 800, fontSize: 52, color: 'var(--text)', lineHeight: 1.05 }}
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [0.9, 1.08, 1] }}
                  transition={{ delay: 0.3, duration: 1.2, times: [0, 0.85, 1] }}
                >
                  <AnimatedNumber value={p.total || 0} format="money" duration={1200} delay={300} />
                </motion.div>
                <div className="text-3" style={{ fontSize: 12, marginTop: 2, position: 'relative' }}>
                  All-in. No surprises on the truck.
                </div>
              </div>

              {/* Actions */}
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="mt-4 grid grid-cols-3 gap-2.5"
                  >
                    <ActionBtn icon={Share2} label="Share" onClick={onShare} />
                    <ActionBtn icon={Pencil} label="Edit" onClick={onEdit} />
                    <ActionBtn
                      icon={Check}
                      label="Accept"
                      primary
                      onClick={() => { haptic.success(); onAccept && onAccept() }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function PriceLine({ label, value, muted, good }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 14, color: muted ? 'var(--text2)' : 'var(--text)' }}>{label}</span>
      <span className="tabular" style={{ fontSize: 14, fontWeight: 600, color: good ? '#4ade80' : 'var(--text)' }}>
        {value}
      </span>
    </div>
  )
}

function ActionBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-3 shimmer-sweep"
      style={{
        background: primary ? 'linear-gradient(135deg, var(--teal) 0%, var(--teal-lt) 100%)' : 'var(--surface2)',
        border: `1px solid ${primary ? 'transparent' : 'var(--border)'}`,
        color: primary ? '#fff' : 'var(--text)',
      }}
    >
      <Icon size={19} />
      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
    </motion.button>
  )
}
