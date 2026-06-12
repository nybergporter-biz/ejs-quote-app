import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, ArrowRight, MessageSquare, X } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from './Toast'
import { useHaptic } from '../hooks/useHaptic'
import ParticleBurst from './ParticleBurst'
import { formatMoney, formatDuration, jobElapsedMs, copyText } from '../lib/utils'

function reviewText(quote, business) {
  const first = quote.customer?.firstName || 'there'
  const company = business.companyName || 'Elite Junk Solutions'
  return `Hi ${first}, thanks for letting ${company} handle your haul today! If you were happy with the work, a quick Google review would mean the world to our two-man crew. Thanks again! 🙏`
}

/**
 * The end-of-job ritual. One orange button: completes the job, stops the
 * timer, stamps the completion time, copies the review-request text, fires
 * the celebration, then shows a summary card.
 */
export default function JobDone({ quote, navigate }) {
  const app = useApp()
  const toast = useToast()
  const haptic = useHaptic()
  const [summary, setSummary] = useState(null)

  const finish = async () => {
    haptic.success()
    const now = new Date()
    // stop a running timer and bank the time
    const t = quote.timer || { startedAt: null, totalMs: 0 }
    const totalMs = jobElapsedMs(quote, now.getTime())
    const timer = { startedAt: null, totalMs }

    app.saveQuote({ ...quote, status: 'completed', completedAt: now.toISOString(), timer })

    const copied = await copyText(reviewText(quote, app.business))

    // next scheduled job after this one (today first, then soonest)
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const next = app.quotes
      .filter((q) => q.id !== quote.id && q.scheduledDate && q.scheduledDate >= todayIso && q.status !== 'completed')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0]

    setSummary({ totalMs, copied, next, hadTimer: !!(t.startedAt || t.totalMs) })
  }

  return (
    <>
      {quote.status === 'accepted' && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          whileHover={{ scale: 1.01 }}
          onClick={finish}
          className="w-full flex items-center justify-center gap-2.5 shimmer-sweep"
          style={{
            marginTop: 14,
            background: 'linear-gradient(135deg, var(--ember) 0%, var(--ember-lt) 100%)',
            color: '#fff', fontWeight: 900, fontSize: 19, letterSpacing: '0.01em',
            borderRadius: 18, padding: '19px 20px', border: 'none', minHeight: 60,
            boxShadow: '0 10px 32px rgba(255,107,53,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <CheckCircle2 size={24} /> JOB DONE
        </motion.button>
      )}

      <AnimatePresence>
        {summary && (
          <motion.div className="fixed inset-0 flex items-end sm:items-center justify-center" style={{ zIndex: 9100 }}>
            <motion.div
              className="absolute inset-0"
              style={{ background: 'rgba(4,8,15,0.8)', backdropFilter: 'blur(6px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full sm:max-w-md"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              style={{
                background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%)',
                border: '1px solid var(--border)', borderRadius: '26px 26px 0 0',
                padding: '26px 20px calc(env(safe-area-inset-bottom) + 24px)',
                boxShadow: '0 -20px 80px rgba(0,0,0,0.6)',
              }}
            >
              <button
                onClick={() => setSummary(null)}
                className="absolute top-4 right-4 flex items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)' }}
              >
                <X size={18} />
              </button>

              <div className="relative flex flex-col items-center text-center">
                <ParticleBurst fire count={60} />
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.1 }}
                  className="flex items-center justify-center"
                  style={{ width: 72, height: 72, borderRadius: 999, background: 'color-mix(in srgb, var(--ember) 16%, transparent)', border: '2px solid var(--ember)' }}
                >
                  <CheckCircle2 size={38} color="var(--ember-lt)" />
                </motion.div>
                <h3 className="font-display" style={{ fontSize: 24, fontWeight: 900, color: 'var(--text)', marginTop: 14 }}>
                  Job done. Nice work. 💪
                </h3>

                <div className="grid grid-cols-2 gap-2.5 w-full" style={{ marginTop: 18 }}>
                  <div className="surface-2" style={{ borderRadius: 14, padding: '13px 10px', border: '1px solid var(--border)' }}>
                    <Clock size={15} color="var(--teal-lt)" />
                    <div className="font-display tabular" style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginTop: 5 }}>
                      {summary.hadTimer ? formatDuration(summary.totalMs) : '—'}
                    </div>
                    <div className="micro-label" style={{ fontSize: 9 }}>Time on job</div>
                  </div>
                  <div className="surface-2" style={{ borderRadius: 14, padding: '13px 10px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 15 }}>💵</span>
                    <div className="font-display tabular" style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', marginTop: 5 }}>
                      {formatMoney(quote.pricing?.total || 0)}
                    </div>
                    <div className="micro-label" style={{ fontSize: 9 }}>Final price</div>
                  </div>
                </div>

                <div
                  className="flex items-center gap-2 w-full"
                  style={{ marginTop: 12, padding: '11px 13px', borderRadius: 12, background: 'color-mix(in srgb, var(--teal) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--teal) 30%, transparent)' }}
                >
                  <MessageSquare size={16} color="var(--teal-lt)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>
                    {summary.copied ? 'Review request copied — paste it into Messages.' : 'Couldn’t copy the review text automatically.'}
                  </span>
                </div>

                {summary.next ? (
                  <button
                    onClick={() => { setSummary(null); navigate('quote', { quoteId: summary.next.id }) }}
                    className="surface-2 w-full flex items-center gap-3 text-left"
                    style={{ marginTop: 12, borderRadius: 14, padding: '12px 14px', border: '1px solid var(--border)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="micro-label" style={{ fontSize: 9 }}>Up next · {summary.next.scheduledDate}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginTop: 3 }}>
                        {`${summary.next.customer?.firstName || ''} ${summary.next.customer?.lastName || ''}`.trim() || summary.next.id}
                      </div>
                    </div>
                    <ArrowRight size={17} color="var(--teal-lt)" />
                  </button>
                ) : (
                  <div className="text-3" style={{ fontSize: 13, marginTop: 12 }}>Nothing else scheduled — go enjoy the day.</div>
                )}

                <button
                  onClick={() => { setSummary(null); toast.success('Marked completed') }}
                  className="w-full"
                  style={{
                    marginTop: 16, padding: '14px', borderRadius: 14, border: 'none',
                    background: 'linear-gradient(135deg, var(--teal), var(--teal-lt))',
                    color: '#fff', fontWeight: 800, fontSize: 15,
                  }}
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
