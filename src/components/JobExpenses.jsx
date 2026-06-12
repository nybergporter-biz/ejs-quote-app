import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, X } from 'lucide-react'
import { useApp } from '../store'
import { useHaptic } from '../hooks/useHaptic'
import { formatMoney } from '../lib/utils'

const KINDS = [
  { kind: 'dump', label: 'Dump fee', icon: '🗑️' },
  { kind: 'fuel', label: 'Fuel', icon: '⛽' },
  { kind: 'other', label: 'Other', icon: '🧾' },
]

export const expenseTotal = (quote) =>
  (quote?.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0)

/**
 * Actual job costs (vs. the pricing engine's estimates). What you really
 * paid at the dump and the pump — this is what makes margin numbers honest.
 */
export default function JobExpenses({ quote }) {
  const app = useApp()
  const haptic = useHaptic()
  const expenses = quote.expenses || []
  const total = expenseTotal(quote)
  const net = (quote.pricing?.total || 0) - total

  const save = (list) => app.saveQuote({ ...quote, expenses: list })
  const add = (k) => {
    haptic.light()
    save([...expenses, { kind: k.kind, label: k.label, amount: 0 }])
  }

  return (
    <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-2">
          <Receipt size={15} color="var(--teal-lt)" />
          <span className="font-display" style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Real expenses</span>
        </div>
        {total > 0 && (
          <span className="tabular text-2" style={{ fontSize: 12.5, fontWeight: 700 }}>
            −{formatMoney(total)} · net {formatMoney(net)}
          </span>
        )}
      </div>

      <div className="flex gap-2" style={{ marginBottom: expenses.length ? 10 : 0 }}>
        {KINDS.map((k) => (
          <motion.button
            key={k.kind}
            whileTap={{ scale: 0.93 }}
            onClick={() => add(k)}
            className="flex items-center gap-1.5"
            style={{
              padding: '8px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, minHeight: 40,
              background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)',
            }}
          >
            <span>{k.icon}</span> {k.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {expenses.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2"
            style={{ overflow: 'hidden' }}
          >
            <div className="flex items-center gap-2" style={{ flex: 1, marginBottom: 8 }}>
              <span style={{ fontSize: 16 }}>{KINDS.find((k) => k.kind === e.kind)?.icon || '🧾'}</span>
              <input
                className="field"
                value={e.label}
                placeholder="What for?"
                onChange={(ev) => save(expenses.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)))}
                style={{ flex: 1, padding: '8px 10px', fontSize: 13.5 }}
              />
              <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <span className="text-3" style={{ paddingLeft: 9, fontSize: 13 }}>$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={e.amount || ''}
                  placeholder="0"
                  onChange={(ev) => save(expenses.map((x, j) => (j === i ? { ...x, amount: Number(ev.target.value) || 0 } : x)))}
                  className="tabular"
                  style={{ width: 62, background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'right', padding: '9px 7px', fontWeight: 700, fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                onClick={() => save(expenses.filter((_, j) => j !== i))}
                style={{ color: 'var(--text3)', padding: 8, minWidth: 36, minHeight: 36 }}
                aria-label="Remove expense"
              >
                <X size={15} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
