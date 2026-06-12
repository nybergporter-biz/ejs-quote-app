import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp, PARTNER_STATES } from '../store'
import { useHaptic } from '../hooks/useHaptic'

/**
 * Live two-partner status strip. Your own card is tappable and opens a
 * one-tap state picker; your partner's card is read-only and updates in
 * real time through cloud sync. Shows the active job + elapsed time.
 */
export default function PartnerStrip({ navigate }) {
  const { team, whoami, quotes, setPartnerStatus } = useApp()
  const haptic = useHaptic()
  const [pickerFor, setPickerFor] = useState(null)

  const partnerKey = whoami === 'p1' ? 'p2' : 'p1'
  const hasPartner = (team.members?.p2?.name || '').trim() !== '' || whoami === 'p2'
  const order = [whoami, partnerKey]

  return (
    <div className="surface" style={{ borderRadius: 18, padding: '12px 14px', marginTop: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span className="micro-label">Crew status</span>
        {!hasPartner && (
          <button onClick={() => navigate('settings')} className="accent" style={{ fontSize: 11.5, fontWeight: 600 }}>
            Add your partner →
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {order.map((key) => (
          <PartnerCard
            key={key}
            memberKey={key}
            member={team.members?.[key]}
            status={team.status?.[key]}
            isMe={key === whoami}
            quotes={quotes}
            onTap={() => {
              if (key !== whoami) return
              haptic.light()
              setPickerFor((v) => (v ? null : key))
            }}
            onJobTap={(quoteId) => navigate('quote', { quoteId })}
          />
        ))}
      </div>

      <AnimatePresence>
        {pickerFor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="grid grid-cols-2 gap-2" style={{ marginTop: 10 }}>
              {PARTNER_STATES.map((s) => {
                const active = team.status?.[pickerFor]?.state === s.key
                return (
                  <motion.button
                    key={s.key}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      haptic.medium()
                      setPartnerStatus(pickerFor, s.key, s.key === 'available' ? null : team.status?.[pickerFor]?.quoteId || null)
                      setPickerFor(null)
                    }}
                    className="flex items-center gap-2"
                    style={{
                      padding: '11px 12px', borderRadius: 12, fontSize: 13.5, fontWeight: 700,
                      minHeight: 44,
                      background: active ? 'color-mix(in srgb, var(--teal) 22%, transparent)' : 'var(--surface2)',
                      color: active ? 'var(--teal-lt)' : 'var(--text)',
                      border: `1px solid ${active ? 'var(--teal)' : 'var(--border)'}`,
                    }}
                  >
                    <span>{s.icon}</span> {s.label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const STATE_META = {
  available: { color: '#4ade80', ring: 'rgba(74,222,128,0.35)' },
  enroute: { color: '#e7c14f', ring: 'rgba(231,193,79,0.35)' },
  onsite: { color: 'var(--ember-lt)', ring: 'rgba(255,107,53,0.35)' },
  wrapping: { color: '#5bb5c4', ring: 'rgba(91,181,196,0.35)' },
}

function PartnerCard({ memberKey, member, status, isMe, quotes, onTap, onJobTap }) {
  const state = PARTNER_STATES.find((s) => s.key === status?.state) || PARTNER_STATES[0]
  const meta = STATE_META[state.key] || STATE_META.available
  const name = (member?.name || '').trim() || (memberKey === 'p1' ? 'Porter' : 'Partner')
  const job = status?.quoteId ? quotes.find((q) => q.id === status.quoteId) : null
  const jobName = job
    ? `${job.customer?.firstName || ''} ${job.customer?.lastName || ''}`.trim() || job.id
    : null

  return (
    <motion.button
      whileTap={isMe ? { scale: 0.97 } : {}}
      onClick={onTap}
      className="surface-2 text-left relative overflow-hidden"
      style={{
        borderRadius: 14, padding: '11px 12px', minHeight: 78,
        border: `1px solid ${isMe ? 'color-mix(in srgb, var(--teal) 50%, var(--border))' : 'var(--border)'}`,
        cursor: isMe ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex" style={{ width: 9, height: 9 }}>
          <span className="absolute inline-flex h-full w-full rounded-full" style={{ background: meta.ring, animation: state.key !== 'available' ? 'ping 1.6s cubic-bezier(0,0,0.2,1) infinite' : 'none' }} />
          <span className="relative inline-flex rounded-full" style={{ width: 9, height: 9, background: meta.color }} />
        </span>
        <span className="font-display" style={{ fontWeight: 800, fontSize: 13.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}{isMe ? ' (you)' : ''}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={state.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{ marginTop: 5 }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: meta.color }}>
            {state.icon} {state.label}
            {status?.since && state.key !== 'available' && <Elapsed since={status.since} />}
          </div>
        </motion.div>
      </AnimatePresence>
      {jobName && (
        <div
          role={onJobTap ? 'link' : undefined}
          onClick={(e) => { e.stopPropagation(); onJobTap?.(status.quoteId) }}
          className="text-3"
          style={{ fontSize: 11.5, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}
        >
          {jobName}{job?.customer?.address ? ` · ${job.customer.address}` : ''}
        </div>
      )}
      {isMe && (
        <div className="micro-label" style={{ fontSize: 8.5, marginTop: 5, color: 'var(--text3)' }}>
          Tap to update
        </div>
      )}
    </motion.button>
  )
}

function Elapsed({ since }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])
  const mins = Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60000))
  const label = mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
  return <span className="text-3" style={{ fontSize: 11, fontWeight: 600, marginLeft: 6 }}>· {label}</span>
}
