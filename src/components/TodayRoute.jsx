import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Navigation, Map } from 'lucide-react'
import { jobElapsedMs, formatDuration } from '../lib/utils'

const WORKDAY_HOURS = 10 // generous field day; slack thresholds below

/**
 * Capacity gauge for the day — NOT navigation. Job time comes from your
 * own tracked history when it exists, drive time from each quote's
 * estimate. The route itself opens in Google/Apple Maps, which brings
 * live traffic for free.
 */
export default function TodayRoute({ jobs, allQuotes, runs }) {
  const est = useMemo(() => {
    // historical average from time-tracked completed jobs, else the quote's own estimate
    const timed = allQuotes.filter((q) => q.status === 'completed' && jobElapsedMs(q) > 60000)
    const histAvgMs = timed.length ? timed.reduce((s, q) => s + jobElapsedMs(q), 0) / timed.length : null

    let jobMs = 0
    for (const q of jobs) {
      jobMs += histAvgMs ?? (q.jobParams?.estHours || 1.5) * 3600000
    }
    const driveMs = jobs.reduce((s, q) => s + (q.jobParams?.driveMinutes || 20) * 60000, 0)
    const dumpMs = runs * 45 * 60000 // ~45 min per dump run
    const totalMs = jobMs + driveMs + dumpMs
    const slackMs = WORKDAY_HOURS * 3600000 - totalMs
    return { jobMs, driveMs, dumpMs, totalMs, slackMs, fromHistory: histAvgMs != null, timedCount: timed.length }
  }, [jobs, allQuotes, runs])

  const slackH = est.slackMs / 3600000
  const tone = slackH >= 2
    ? { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.4)', label: 'Room for one more', icon: '✅' }
    : slackH >= 0.75
    ? { color: '#e7c14f', bg: 'rgba(231,193,79,0.12)', border: 'rgba(231,193,79,0.4)', label: 'Tight — squeeze only small jobs', icon: '⚠️' }
    : { color: 'var(--ember-lt)', bg: 'color-mix(in srgb, var(--ember) 12%, transparent)', border: 'color-mix(in srgb, var(--ember) 45%, transparent)', label: 'Day is full', icon: '🛑' }

  const addresses = jobs.map((q) => q.customer?.address).filter(Boolean)
  const firstOpen = jobs.find((q) => q.status !== 'completed')
  const firstAddr = firstOpen?.customer?.address

  const googleRoute = addresses.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addresses[addresses.length - 1])}` +
      (addresses.length > 1 ? `&waypoints=${addresses.slice(0, -1).map(encodeURIComponent).join('%7C')}` : '') +
      '&travelmode=driving'
    : null
  const appleFirst = firstAddr ? `https://maps.apple.com/?daddr=${encodeURIComponent(firstAddr)}&dirflg=d` : null

  return (
    <div className="surface" style={{ borderRadius: 16, padding: 14, marginBottom: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <span className="micro-label">Today’s route · capacity</span>
        <span className="text-3 tabular" style={{ fontSize: 11.5 }}>
          ~{formatDuration(est.totalMs)} committed
        </span>
      </div>

      {/* slack indicator */}
      <div
        className="flex items-center gap-2.5"
        style={{ padding: '10px 13px', borderRadius: 12, background: tone.bg, border: `1px solid ${tone.border}`, marginBottom: 10 }}
      >
        <span style={{ fontSize: 17 }}>{tone.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: tone.color }}>{tone.label}</div>
          <div className="text-3" style={{ fontSize: 11.5 }}>
            {slackH > 0 ? `~${formatDuration(est.slackMs)} of slack` : `~${formatDuration(-est.slackMs)} over a ${WORKDAY_HOURS}h day`}
            {' · '}jobs {formatDuration(est.jobMs)} + driving {formatDuration(est.driveMs)} + dump {formatDuration(est.dumpMs)}
          </div>
        </div>
      </div>

      <div className="text-3" style={{ fontSize: 10.5, marginBottom: 10 }}>
        {est.fromHistory
          ? `Job times from your ${est.timedCount} tracked job${est.timedCount > 1 ? 's' : ''}; live traffic comes from the maps app.`
          : 'Job times are quote estimates — start using the job timer and this gets smarter.'}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <motion.a
          whileTap={{ scale: 0.96 }}
          href={googleRoute || undefined}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2"
          style={{
            padding: '12px 10px', borderRadius: 12, fontSize: 13, fontWeight: 800, minHeight: 48,
            background: googleRoute ? 'linear-gradient(135deg, var(--teal), var(--teal-lt))' : 'var(--surface2)',
            color: googleRoute ? '#fff' : 'var(--text3)', textDecoration: 'none',
            pointerEvents: googleRoute ? 'auto' : 'none',
          }}
        >
          <Map size={16} /> Full route · Google
        </motion.a>
        <motion.a
          whileTap={{ scale: 0.96 }}
          href={appleFirst || undefined}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2"
          style={{
            padding: '12px 10px', borderRadius: 12, fontSize: 13, fontWeight: 800, minHeight: 48,
            background: 'var(--surface2)', color: appleFirst ? 'var(--text)' : 'var(--text3)',
            border: '1px solid var(--border)', textDecoration: 'none',
            pointerEvents: appleFirst ? 'auto' : 'none',
          }}
        >
          <Navigation size={16} /> First stop · Apple
        </motion.a>
      </div>
    </div>
  )
}
