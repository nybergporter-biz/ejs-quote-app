import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, X } from 'lucide-react'
import { useApp } from '../store'
import { parseCity, suggestDays } from '../lib/planner'
import { formatCY } from '../lib/utils'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function prettyDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ScheduleControl({ quote }) {
  const app = useApp()
  const cap = app.settings.TRAILER_CY || 12
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(quote.scheduledDate || todayISO())
  const [city, setCity] = useState(quote.city || parseCity(quote.customer?.address || ''))
  const [cy, setCy] = useState(quote.plannedCY ?? quote.pricing?.totalCY ?? 0)

  const suggestions = useMemo(
    () => suggestDays({ ...quote, city, plannedCY: cy }, app.quotes, app.settings, todayISO()),
    [quote, city, cy, app.quotes, app.settings],
  )
  const fulls = (n) => {
    const f = n / cap
    const r = Math.round(f * 100) / 100
    return `${r} trailer${r === 1 ? '' : 's'}`
  }

  const save = () => { app.scheduleQuote(quote.id, { date, city, plannedCY: Number(cy) }); setOpen(false) }
  const remove = () => { app.unscheduleQuote(quote.id); setOpen(false) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="surface w-full flex items-center gap-3 text-left"
        style={{ borderRadius: 14, padding: '12px 14px' }}
      >
        <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(42,127,138,0.16)', color: 'var(--teal-lt)', flexShrink: 0 }}>
          <CalendarDays size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {quote.scheduledDate ? `Scheduled · ${prettyDate(quote.scheduledDate)}` : 'Schedule this job'}
          </div>
          <div className="text-3" style={{ fontSize: 12 }}>{quote.city || city || 'Set a date & city'}</div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 9000 }} initial="h" animate="s" exit="h">
            <motion.div className="absolute inset-0" style={{ background: 'rgba(4,8,15,0.7)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              className="relative w-full sm:max-w-md"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px 24px 0 0', padding: '20px 18px calc(env(safe-area-inset-bottom) + 20px)' }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Schedule job</h3>
                <button onClick={() => setOpen(false)} className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: 'var(--surface2)', color: 'var(--text2)' }}><X size={17} /></button>
              </div>

              {suggestions.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <span className="micro-label" style={{ display: 'block', marginBottom: 8 }}>You’re already in {city} on…</span>
                  <div className="flex gap-2 flex-wrap">
                    {suggestions.map((s) => (
                      <button key={s.date} onClick={() => setDate(s.date)} style={{ padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: date === s.date ? 'var(--teal)' : 'var(--surface2)', color: date === s.date ? '#fff' : 'var(--text)', border: '1px solid var(--border)' }}>
                        {prettyDate(s.date)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className="block" style={{ marginBottom: 12 }}>
                <span className="micro-label" style={{ display: 'block', marginBottom: 6 }}>Date</span>
                <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label className="block" style={{ marginBottom: 12 }}>
                <span className="micro-label" style={{ display: 'block', marginBottom: 6 }}>City</span>
                <input className="field" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Saratoga Springs" />
              </label>
              <div style={{ marginBottom: 16 }}>
                <span className="micro-label" style={{ display: 'block', marginBottom: 6 }}>Trailer space · {fulls(Number(cy) || 0)}</span>
                <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <button onClick={() => setCy((v) => Math.max(0, +(Number(v) - cap * 0.25).toFixed(2)))} style={{ padding: '10px 16px', color: 'var(--text2)', fontWeight: 700 }}>−</button>
                  <span className="tabular" style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{formatCY(Number(cy) || 0)} CY</span>
                  <button onClick={() => setCy((v) => +(Number(v) + cap * 0.25).toFixed(2))} style={{ padding: '10px 16px', color: 'var(--teal-lt)', fontWeight: 700 }}>+</button>
                </div>
              </div>

              <button onClick={save} className="w-full" style={{ padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, var(--teal), var(--teal-lt))', color: '#fff', fontWeight: 800, fontSize: 16, border: 'none' }}>
                {quote.scheduledDate ? 'Update schedule' : 'Add to schedule'}
              </button>
              {quote.scheduledDate && (
                <button onClick={remove} className="w-full" style={{ padding: '12px', marginTop: 8, color: 'var(--text3)', fontSize: 13.5, fontWeight: 600 }}>Remove from schedule</button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
