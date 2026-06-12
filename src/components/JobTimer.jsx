import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Square, Clock } from 'lucide-react'
import { useApp } from '../store'
import { useHaptic } from '../hooks/useHaptic'
import { jobElapsedMs, formatDuration } from '../lib/utils'

/**
 * Per-job stopwatch. Start when you pull up, stop when you leave (or let
 * the JOB DONE button stop it). Banked time lives on quote.timer.totalMs.
 */
export default function JobTimer({ quote }) {
  const app = useApp()
  const haptic = useHaptic()
  const running = !!quote.timer?.startedAt
  const [, tick] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const elapsed = jobElapsedMs(quote)

  const start = () => {
    haptic.medium()
    app.saveQuote({ ...quote, timer: { startedAt: new Date().toISOString(), totalMs: quote.timer?.totalMs || 0 } })
  }
  const stop = () => {
    haptic.medium()
    app.saveQuote({ ...quote, timer: { startedAt: null, totalMs: jobElapsedMs(quote) } })
  }

  const clock = (() => {
    const s = Math.floor(elapsed / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`
  })()

  return (
    <div className="surface flex items-center gap-3" style={{ borderRadius: 14, padding: '12px 14px', marginTop: 12 }}>
      <div
        className="flex items-center justify-center"
        style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: running ? 'color-mix(in srgb, var(--ember) 16%, transparent)' : 'rgba(42,127,138,0.16)',
          color: running ? 'var(--ember-lt)' : 'var(--teal-lt)',
        }}
      >
        <Clock size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="flex items-baseline gap-2">
          <span className="font-display tabular" style={{ fontSize: 19, fontWeight: 800, color: running ? 'var(--ember-lt)' : 'var(--text)' }}>
            {clock}
          </span>
          {running && (
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--ember-lt)' }}
            >
              ● ON THE CLOCK
            </motion.span>
          )}
        </div>
        <div className="text-3" style={{ fontSize: 11.5 }}>
          {running ? 'Timer running' : elapsed > 0 ? `Tracked: ${formatDuration(elapsed)}` : 'Track time to learn your real hourly rate'}
        </div>
      </div>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={running ? stop : start}
        className="flex items-center gap-1.5"
        style={{
          padding: '11px 16px', borderRadius: 999, fontSize: 13.5, fontWeight: 800, minHeight: 44,
          background: running ? 'var(--surface2)' : 'linear-gradient(135deg, var(--teal), var(--teal-lt))',
          color: running ? 'var(--ember-lt)' : '#fff',
          border: running ? '1px solid color-mix(in srgb, var(--ember) 45%, transparent)' : 'none',
        }}
      >
        {running ? <><Square size={14} /> Stop</> : <><Play size={14} /> Start</>}
      </motion.button>
    </div>
  )
}
