import { useMemo, useState } from 'react'
import { Truck, Navigation } from 'lucide-react'
import { useApp } from '../store'
import EmptyState from '../components/EmptyState'
import TodayRoute from '../components/TodayRoute'
import { jobCY, dumpRuns, daySavings, groupByCity } from '../lib/planner'
import { formatMoney, formatCY } from '../lib/utils'

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
function pretty(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
const mapsHref = (addr) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || '')}`

export default function Schedule({ navigate }) {
  const app = useApp()
  const cap = app.settings.TRAILER_CY || 12
  const [mode, setMode] = useState('today')
  const [date, setDate] = useState(todayISO())

  const scheduled = useMemo(() => app.quotes.filter((q) => q.scheduledDate), [app.quotes])
  const dayJobs = useMemo(
    () => scheduled.filter((q) => q.scheduledDate === date).sort((a, b) => (a.city || '').localeCompare(b.city || '')),
    [scheduled, date],
  )
  const cys = dayJobs.map((q) => jobCY(q))
  const { runs, markers } = dumpRuns(cys, cap)
  const markerSet = new Set(markers)
  const totalCY = cys.reduce((s, c) => s + c, 0)
  const saved = daySavings(cys, cap, app.settings)
  const cities = [...new Set(dayJobs.map((q) => q.city || 'Other'))]

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 18px) 16px 24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Schedule</h1>
        <div className="flex gap-1" style={{ background: 'var(--surface2)', borderRadius: 999, padding: 3 }}>
          {['today', 'week'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', background: mode === m ? 'var(--teal)' : 'transparent', color: mode === m ? '#fff' : 'var(--text2)', border: 'none' }}>{m}</button>
          ))}
        </div>
      </div>

      {mode === 'today' ? (
        <>
          {/* date strip */}
          <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: 14, scrollbarWidth: 'none' }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const d = addDays(todayISO(), i)
              const n = scheduled.filter((q) => q.scheduledDate === d).length
              const active = d === date
              return (
                <button key={d} onClick={() => setDate(d)} className="flex flex-col items-center" style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 12, background: active ? 'var(--teal)' : 'var(--surface)', color: active ? '#fff' : 'var(--text2)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{i === 0 ? 'Today' : pretty(d).split(',')[0]}</span>
                  <span className="tabular" style={{ fontSize: 16, fontWeight: 800 }}>{d.split('-')[2]}</span>
                  <span style={{ fontSize: 10, opacity: 0.8 }}>{n ? `${n} job${n > 1 ? 's' : ''}` : '—'}</span>
                </button>
              )
            })}
          </div>

          {dayJobs.length === 0 ? (
            <EmptyState
              art="calendar"
              title="Nothing scheduled"
              message="Open a quote and tap “Schedule this job” — same-city days get suggested automatically."
            />
          ) : (
            <>
              <div className="surface" style={{ borderRadius: 16, padding: 14, marginBottom: 12 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{dayJobs.length} stops · {formatCY(totalCY)} CY</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: cities.length === 1 ? '#4ade80' : '#e7965b' }}>📍 {cities.length === 1 ? '1 area' : `${cities.length} areas`}</span>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                  <Truck size={15} color="var(--teal-lt)" />
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{runs} dump run{runs > 1 ? 's' : ''}</span>
                  {saved > 0 && <span className="text-3" style={{ fontSize: 12.5, marginLeft: 'auto' }}>saves ~{formatMoney(saved)} vs dumping each</span>}
                </div>
              </div>

              {/* capacity gauge + maps handoff */}
              <TodayRoute jobs={dayJobs} allQuotes={app.quotes} runs={runs} />

              {Object.entries(groupByCity(dayJobs)).map(([cityName, jobs]) => (
                <div key={cityName} style={{ marginBottom: 14 }}>
                  <div className="micro-label" style={{ marginBottom: 8, paddingLeft: 4 }}>{cityName} · {jobs.length}</div>
                  <div className="space-y-2.5">
                    {jobs.map((q) => {
                      const globalIdx = dayJobs.indexOf(q)
                      const name = `${q.customer?.firstName || ''} ${q.customer?.lastName || ''}`.trim() || 'Customer'
                      return (
                        <div key={q.id}>
                          <div className="surface flex items-center gap-3" style={{ borderRadius: 16, padding: '12px 14px' }}>
                            <button onClick={() => navigate('quote', { quoteId: q.id })} className="text-left" style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0 }}>
                              <div className="font-display" style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{name}</div>
                              <div className="text-3" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.customer?.address || '—'} · {formatCY(jobCY(q))} CY</div>
                            </button>
                            <a href={mapsHref(q.customer?.address)} target="_blank" rel="noreferrer" className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface2)', color: 'var(--teal-lt)', flexShrink: 0 }}>
                              <Navigation size={18} />
                            </a>
                          </div>
                          {markerSet.has(globalIdx) && (
                            <div className="flex items-center gap-2" style={{ margin: '10px 4px' }}>
                              <div style={{ flex: 1, height: 1, background: 'var(--warn)', opacity: 0.5 }} />
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--warn)' }}>🛻 DUMP RUN</span>
                              <div style={{ flex: 1, height: 1, background: 'var(--warn)', opacity: 0.5 }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      ) : (
        <div className="space-y-2.5">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(todayISO(), i)
            const jobs = scheduled.filter((q) => q.scheduledDate === d)
            const grouped = groupByCity(jobs)
            const r = dumpRuns(jobs.map((q) => jobCY(q)), cap).runs
            return (
              <button key={d} onClick={() => { setDate(d); setMode('today') }} className="surface w-full text-left" style={{ borderRadius: 16, padding: 14, opacity: jobs.length ? 1 : 0.6 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{i === 0 ? 'Today' : pretty(d)}</span>
                  <span className="text-3" style={{ fontSize: 12.5 }}>{jobs.length ? `${jobs.length} stops · ${r} dump run${r > 1 ? 's' : ''}` : 'open'}</span>
                </div>
                {jobs.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap" style={{ marginTop: 8 }}>
                    {Object.entries(grouped).map(([c, js]) => (
                      <span key={c} style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: 'var(--surface2)', color: 'var(--teal-lt)' }}>{c} ×{js.length}</span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
