import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus } from 'lucide-react'
import { useHaptic } from '../hooks/useHaptic'

export default function ItemCard({ item, qty = 0, onAdd, onRemove, compact = false }) {
  const haptic = useHaptic()
  const added = qty > 0

  return (
    <motion.div
      layout
      role="button"
      tabIndex={0}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      onClick={() => {
        haptic.light()
        onAdd(item)
      }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); haptic.light(); onAdd(item) } }}
      className="relative text-left rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: added ? 'var(--surface2)' : 'var(--surface)',
        border: `1px solid ${added ? 'var(--teal)' : 'var(--border)'}`,
        padding: compact ? '10px 12px' : '14px',
        boxShadow: added ? '0 0 0 1px rgba(42,127,138,0.4), 0 6px 20px rgba(42,127,138,0.12)' : 'none',
        transition: 'background .2s, border-color .2s, box-shadow .2s',
      }}
    >
      {/* qty badge */}
      <AnimatePresence>
        {added && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            className="absolute top-2 right-2 flex items-center justify-center font-display"
            style={{
              minWidth: 22,
              height: 22,
              padding: '0 6px',
              borderRadius: 999,
              background: 'var(--teal)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {qty}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex items-start gap-3">
        <span style={{ fontSize: compact ? 22 : 28, lineHeight: 1 }}>{item.icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            className="font-display"
            style={{ fontWeight: 700, fontSize: compact ? 13 : 14, color: 'var(--text)', lineHeight: 1.15, paddingRight: added ? 26 : 0 }}
          >
            {item.name}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="tabular" style={{ fontSize: 11.5, color: 'var(--text2)' }}>
              {item.cy} CY
            </span>
            {item.surcharge > 0 && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--gold)',
                  background: 'rgba(212,160,23,0.12)',
                  borderRadius: 6,
                  padding: '1px 6px',
                }}
              >
                +${item.surcharge} fee
              </span>
            )}
          </div>
        </div>
      </div>

      {/* stepper appears when added */}
      <AnimatePresence>
        {added && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => { haptic.light(); onRemove(item) }}
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              <Minus size={18} />
            </motion.button>
            <span className="font-display tabular" style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
              {qty}
            </span>
            <motion.button
              whileTap={{ scale: 0.85 }}
              type="button"
              onClick={() => { haptic.light(); onAdd(item) }}
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: 'var(--teal)', color: '#fff', border: 'none' }}
            >
              <Plus size={18} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
