import { Suspense, lazy, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, Sparkles, Search, FileText, TrendingUp, CheckCircle2, Inbox } from 'lucide-react'
import { useApp } from '../store'
import { useDarkMode } from '../hooks/useDarkMode'
import EJSLogo from '../components/EJSLogo'
import AnimatedNumber from '../components/AnimatedNumber'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import PartnerStrip from '../components/PartnerStrip'
import { greeting, relativeDate, formatMoney, jobElapsedMs } from '../lib/utils'

const MountainBackground = lazy(() => import('../components/MountainBackground'))

function monthKey(d) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${dt.getMonth()}`
}

export default function Dashboard({ navigate }) {
  const { quotes, business, team, whoami, leads, unreadLeadCount } = useApp()
  const { isDark, toggle } = useDarkMode()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [mineOnly, setMineOnly] = useState(false)
  const g = greeting()

  const isAging = (q) =>
    q.status === 'sent' && Date.now() - new Date(q.updatedAt || q.createdAt).getTime() > 3 * 86400000
  const agingCount = quotes.filter(isAging).length

  const todayStops = useMemo(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return quotes.filter((q) => q.scheduledDate === iso)
  }, [quotes])

  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${now.getMonth()}`
    const monthQuotes = quotes.filter((q) => monthKey(q.createdAt) === thisMonth)
    const booked = quotes.filter(
      (q) => ['accepted', 'completed'].includes(q.status) && monthKey(q.updatedAt || q.createdAt) === thisMonth,
    )
    const revenue = booked.reduce((s, q) => s + (q.pricing?.total || 0), 0)

    // 6-month revenue sparkline (gross + net of logged expenses)
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const monthBooked = quotes.filter(
        (q) => ['accepted', 'completed'].includes(q.status) && monthKey(q.updatedAt || q.createdAt) === key,
      )
      const rev = monthBooked.reduce((s, q) => s + (q.pricing?.total || 0), 0)
      const exp = monthBooked.reduce((s, q) => s + (q.expenses || []).reduce((a, e) => a + (Number(e.amount) || 0), 0), 0)
      months.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), rev, net: rev - exp })
    }

    // effective hourly rate from time-tracked completed jobs
    const timed = quotes.filter((q) => q.status === 'completed' && jobElapsedMs(q) > 60000)
    const trackedMs = timed.reduce((s, q) => s + jobElapsedMs(q), 0)
    const trackedRev = timed.reduce((s, q) => s + (q.pricing?.total || 0), 0)
    const hourlyRate = trackedMs > 0 ? trackedRev / (trackedMs / 3600000) : 0

    // win/loss insights (unlocks at 20 logged losses)
    const lost = quotes.filter((q) => q.status === 'declined')
    const reasonCounts = {}
    for (const q of lost) if (q.lossReason) reasonCounts[q.lossReason] = (reasonCounts[q.lossReason] || 0) + 1
    const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0] || null
    const closed = quotes.filter((q) => q.acceptedAt && q.createdAt)
    const avgCloseMs = closed.length
      ? closed.reduce((s, q) => s + Math.max(0, new Date(q.acceptedAt) - new Date(q.createdAt)), 0) / closed.length
      : 0
    const monthDecided = quotes.filter(
      (q) => ['accepted', 'completed', 'declined'].includes(q.status) && monthKey(q.updatedAt || q.createdAt) === thisMonth,
    )
    const monthWon = monthDecided.filter((q) => q.status !== 'declined').length
    const winRate = monthDecided.length ? Math.round((monthWon / monthDecided.length) * 100) : null

    const monthLeads = (leads || []).filter((l) => monthKey(l.created_at) === thisMonth).length

    return {
      monthQuotes: monthQuotes.length, booked: booked.length, revenue, months, hourlyRate,
      timedCount: timed.length, lostCount: lost.length, topReason, avgCloseMs, winRate, monthLeads,
    }
  }, [quotes, leads])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = [...quotes].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    if (mineOnly) list = list.filter((x) => (x.assignedTo || 'p1') === whoami)
    if (statusFilter === 'aging') list = list.filter(isAging)
    else if (statusFilter !== 'all') list = list.filter((x) => x.status === statusFilter)
    if (q) {
      list = list.filter((x) => {
        const name = `${x.customer?.firstName || ''} ${x.customer?.lastName || ''}`.toLowerCase()
        return name.includes(q) || x.id.toLowerCase().includes(q) || (x.notes || '').toLowerCase().includes(q)
      })
    }
    return q || statusFilter !== 'all' || mineOnly ? list : list.slice(0, 12)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, query, statusFilter, mineOnly, whoami])

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <div style={{ position: 'relative', height: 'calc(286px + env(safe-area-inset-top))', overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: '#04080f' }} />}>
          <MountainBackground />
        </Suspense>
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(to bottom, rgba(7,16,30,0.3) 0%, rgba(7,16,30,0.95) 100%)',
          }}
        />
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, padding: 'calc(env(safe-area-inset-top) + 18px) 18px 36px', display: 'flex', flexDirection: 'column' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <EJSLogo size={42} custom={business.logo} />
              <div>
                <div className="font-display" style={{ fontWeight: 800, fontSize: 16, color: '#e8f0f8', lineHeight: 1.05 }}>
                  {business.companyName}
                </div>
                <div className="micro-label" style={{ color: '#5bb5c4' }}>Field Quote Studio</div>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggle}
              className="flex items-center justify-center glass"
              style={{ width: 40, height: 40, borderRadius: 12 }}
              aria-label="Toggle theme"
            >
              <motion.span key={isDark ? 'd' : 'l'} initial={{ rotate: -180, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
                {isDark ? <Moon size={19} color="#5bb5c4" /> : <Sun size={19} color="#d4a017" />}
              </motion.span>
            </motion.button>
          </div>

          <div style={{ margin: 'auto 0' }}>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div style={{ fontSize: 15, color: '#5bb5c4', fontWeight: 500 }}>
                {g.text}, {business.ownerName || 'there'} {g.icon}
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 800, color: '#e8f0f8', marginTop: 2, lineHeight: 1.05 }}>
                Let’s haul something today.
              </h1>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ---------- Body ---------- */}
      <div style={{ padding: '0 16px', maxWidth: 560, margin: '0 auto' }}>
        {/* New website leads — impossible to miss */}
        {unreadLeadCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('leads')}
            className="w-full flex items-center gap-3 text-left"
            style={{
              marginTop: -16, position: 'relative', zIndex: 6, borderRadius: 16, padding: '14px 15px',
              background: 'color-mix(in srgb, #ff6b35 12%, var(--surface))',
              border: '1px solid rgba(255,107,53,0.5)',
              boxShadow: '0 8px 28px rgba(255,107,53,0.25)',
            }}
          >
            <span style={{ position: 'relative', display: 'flex' }}>
              <Inbox size={22} color="#ff8c5a" />
              <motion.span
                animate={{ scale: [1, 1.5, 1], opacity: [0.9, 0.3, 0.9] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
                style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: 999, background: '#ff6b35' }}
              />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: '#ff8c5a' }}>
                {unreadLeadCount} new lead{unreadLeadCount > 1 ? 's' : ''} from your website
              </div>
              <div className="text-2" style={{ fontSize: 12 }}>Reach out fast — speed wins jobs</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ff8c5a', flexShrink: 0 }}>View All →</span>
          </motion.button>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2.5" style={{ marginTop: unreadLeadCount > 0 ? 12 : -16, position: 'relative', zIndex: 5 }}>
          <StatCard icon={FileText} label="Quotes / mo" value={stats.monthQuotes} delay={100} />
          <StatCard icon={CheckCircle2} label="Booked" value={stats.booked} delay={200} />
          <StatCard icon={TrendingUp} label="Revenue" value={stats.revenue} money delay={300} />
          <StatCard icon={Inbox} label="Leads / mo" value={stats.monthLeads} delay={400} />
        </div>

        {/* New Quote CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('builder')}
          className="w-full flex items-center justify-center gap-2.5 shimmer-sweep"
          style={{
            marginTop: 16,
            background: 'linear-gradient(120deg, var(--navy-700, #1a3552) 0%, var(--teal) 60%, var(--teal-lt) 100%)',
            color: '#fff', fontWeight: 800, fontSize: 17, fontFamily: 'Inter, sans-serif',
            borderRadius: 18, padding: '17px 20px', border: 'none',
            boxShadow: '0 10px 30px rgba(42,127,138,0.35)',
          }}
        >
          <Sparkles size={20} /> New Quote
        </motion.button>

        {/* Partner coordination strip */}
        <PartnerStrip navigate={navigate} />

        {/* Money sitting uncollected */}
        <UnpaidAlert quotes={quotes} onTap={(id) => navigate('quote', { quoteId: id })} />

        {/* Today's stops peek */}
        {todayStops.length > 0 && (
          <button
            onClick={() => navigate('schedule')}
            className="surface w-full flex items-center gap-3 text-left"
            style={{ borderRadius: 16, padding: '13px 14px', marginTop: 12, borderLeft: '3px solid var(--teal)' }}
          >
            <div className="flex items-center justify-center font-display" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(42,127,138,0.16)', color: 'var(--teal-lt)', fontWeight: 800, flexShrink: 0 }}>
              {todayStops.length}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="font-display" style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Today’s stops</div>
              <div className="text-3" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                First: {`${todayStops[0].customer?.firstName || ''} ${todayStops[0].customer?.lastName || ''}`.trim() || 'Customer'} · {todayStops[0].city || todayStops[0].customer?.address || ''}
              </div>
            </div>
            <span className="accent" style={{ fontSize: 13, fontWeight: 600 }}>View →</span>
          </button>
        )}

        {/* Sparkline */}
        <Sparkline months={stats.months} hourlyRate={stats.hourlyRate} timedCount={stats.timedCount} />

        {/* Win/loss insights — unlocks once there's enough signal */}
        {stats.lostCount >= 20 && <WinLossCard stats={stats} />}

        {/* Recent quotes */}
        <div className="flex items-center justify-between" style={{ marginTop: 26, marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Recent quotes</h2>
          <div className="flex gap-1" style={{ background: 'var(--surface2)', borderRadius: 999, padding: 3 }}>
            {[{ k: false, l: 'All' }, { k: true, l: 'Mine' }].map((o) => (
              <button
                key={o.l}
                onClick={() => setMineOnly(o.k)}
                style={{
                  padding: '5px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, border: 'none',
                  background: mineOnly === o.k ? 'var(--teal)' : 'transparent',
                  color: mineOnly === o.k ? '#fff' : 'var(--text2)',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* status filter pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: 12, scrollbarWidth: 'none', paddingBottom: 2 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'sent', label: 'Sent' },
            { key: 'accepted', label: 'Accepted' },
            { key: 'completed', label: 'Completed' },
            { key: 'aging', label: agingCount ? `Follow up · ${agingCount}` : 'Follow up' },
          ].map((f) => {
            const active = statusFilter === f.key
            const warn = f.key === 'aging' && agingCount > 0
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="relative whitespace-nowrap"
                style={{
                  padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, flexShrink: 0,
                  background: active ? (warn ? 'var(--warn)' : 'var(--teal)') : 'var(--surface)',
                  color: active ? '#fff' : warn ? '#e7965b' : 'var(--text2)',
                  border: `1px solid ${active ? 'transparent' : warn ? 'rgba(211,84,0,0.4)' : 'var(--border)'}`,
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div className="relative" style={{ marginBottom: 12 }}>
          <Search size={17} color="var(--text3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            className="field"
            style={{ paddingLeft: 38 }}
            placeholder="Search by customer or quote #"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <DashEmptyState onNew={() => navigate('builder')} hasQuotes={quotes.length > 0} />
        ) : (
          <div className="space-y-2.5" style={{ paddingBottom: 20 }}>
            {filtered.map((q, i) => (
              <QuoteRow key={q.id} q={q} i={i} team={team} onClick={() => navigate('quote', { quoteId: q.id })} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const LOSS_LABELS = {
  price: 'Price too high',
  competitor: 'Went with competitor',
  timing: 'Timing didn’t work',
  ghosted: 'No response (ghosted)',
  other: 'Other',
}

function WinLossCard({ stats }) {
  const days = stats.avgCloseMs ? (stats.avgCloseMs / 86400000).toFixed(1) : null
  return (
    <div className="surface" style={{ borderRadius: 18, padding: 16, marginTop: 12 }}>
      <span className="micro-label" style={{ display: 'block', marginBottom: 12 }}>Win / loss insights</span>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <div className="font-display tabular" style={{ fontSize: 20, fontWeight: 800, color: stats.winRate >= 50 ? '#4ade80' : 'var(--ember-lt)' }}>
            {stats.winRate != null ? `${stats.winRate}%` : '—'}
          </div>
          <div className="micro-label" style={{ fontSize: 8.5, marginTop: 2 }}>Win rate / mo</div>
        </div>
        <div>
          <div className="font-display tabular" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
            {days != null ? `${days}d` : '—'}
          </div>
          <div className="micro-label" style={{ fontSize: 8.5, marginTop: 2 }}>Avg to close</div>
        </div>
        <div>
          <div className="font-display tabular" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{stats.lostCount}</div>
          <div className="micro-label" style={{ fontSize: 8.5, marginTop: 2 }}>Quotes lost</div>
        </div>
      </div>
      {stats.topReason && (
        <div className="flex items-center gap-2" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14 }}>📉</span>
          <span className="text-2" style={{ fontSize: 12.5 }}>
            Most common loss: <b style={{ color: 'var(--text)' }}>{LOSS_LABELS[stats.topReason[0]] || stats.topReason[0]}</b> ({stats.topReason[1]}×)
          </span>
        </div>
      )}
    </div>
  )
}

function UnpaidAlert({ quotes, onTap }) {
  const unpaid = quotes.filter((q) => q.status === 'completed' && !q.paid)
  if (unpaid.length === 0) return null
  const total = unpaid.reduce((s, q) => s + (q.pricing?.total || 0), 0)
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onTap(unpaid[0].id)}
      className="w-full flex items-center gap-3 text-left"
      style={{
        marginTop: 12, borderRadius: 16, padding: '13px 14px',
        background: 'color-mix(in srgb, var(--ember) 10%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--ember) 40%, transparent)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span style={{ fontSize: 22 }}>💸</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ember-lt)' }}>
          {formatMoney(total)} uncollected
        </div>
        <div className="text-2" style={{ fontSize: 12 }}>
          {unpaid.length} finished job{unpaid.length > 1 ? 's' : ''} not marked paid
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ember-lt)' }}>Collect →</span>
    </motion.button>
  )
}

function StatCard({ icon: Icon, label, value, money, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, type: 'spring', stiffness: 300, damping: 26 }}
      className="surface relative overflow-hidden"
      style={{ borderRadius: 16, padding: '13px 12px', borderLeft: '3px solid var(--teal)' }}
    >
      <Icon size={15} color="var(--teal-lt)" style={{ position: 'absolute', top: 11, right: 11, opacity: 0.7 }} />
      <div className="font-display tabular" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
        {money ? <AnimatedNumber value={value} format="money" delay={delay} /> : <AnimatedNumber value={value} format="int" delay={delay} />}
      </div>
      <div className="micro-label" style={{ marginTop: 2, fontSize: 9.5 }}>{label}</div>
    </motion.div>
  )
}

function Sparkline({ months, hourlyRate = 0, timedCount = 0 }) {
  const [mode, setMode] = useState('rev') // rev | net
  const hasExpenses = months.some((m) => m.net !== m.rev)
  const val = (m) => (mode === 'net' ? m.net : m.rev)
  const max = Math.max(...months.map(val), 1)
  const total = months.reduce((s, m) => s + val(m), 0)
  return (
    <div className="surface" style={{ borderRadius: 18, padding: 16, marginTop: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div className="flex items-center gap-2">
          <span className="micro-label">{mode === 'net' ? 'Net margin' : 'Revenue'} · 6 mo</span>
          {hasExpenses && (
            <div className="flex gap-0.5" style={{ background: 'var(--surface2)', borderRadius: 999, padding: 2 }}>
              {[{ k: 'rev', l: 'Gross' }, { k: 'net', l: 'Net' }].map((o) => (
                <button
                  key={o.k}
                  onClick={() => setMode(o.k)}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 700, border: 'none',
                    background: mode === o.k ? 'var(--teal)' : 'transparent',
                    color: mode === o.k ? '#fff' : 'var(--text3)',
                  }}
                >
                  {o.l}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="font-display tabular" style={{ fontSize: 14, fontWeight: 800, color: 'var(--teal-lt)' }}>
          {formatMoney(total)}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1.5" style={{ height: 64 }}>
        {months.map((m, i) => {
          const h = max ? (val(m) / max) * 100 : 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5" style={{ height: '100%' }}>
              <div className="flex-1 flex items-end w-full">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(h, 4)}%` }}
                  transition={{ delay: 0.1 + i * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
                  style={{
                    width: '100%',
                    borderRadius: 6,
                    background: i === months.length - 1
                      ? 'linear-gradient(180deg, var(--teal-lt), var(--teal))'
                      : 'color-mix(in srgb, var(--teal) 40%, transparent)',
                  }}
                />
              </div>
              <span className="tabular" style={{ fontSize: 9.5, color: 'var(--text3)' }}>{m.label}</span>
            </div>
          )
        })}
      </div>
      {hourlyRate > 0 && (
        <div className="flex items-center justify-between" style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <span className="micro-label">Effective rate · {timedCount} timed job{timedCount > 1 ? 's' : ''}</span>
          <span className="font-display tabular" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
            {formatMoney(hourlyRate)}/hr
          </span>
        </div>
      )}
    </div>
  )
}

function QuoteRow({ q, i, team, onClick }) {
  const name = `${q.customer?.firstName || ''} ${q.customer?.lastName || ''}`.trim() || 'No customer'
  const ownerKey = q.assignedTo || 'p1'
  const ownerColor = team?.members?.[ownerKey]?.color || 'var(--teal-lt)'
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 28 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="surface w-full flex items-center gap-3 text-left"
      style={{ borderRadius: 16, padding: '13px 14px' }}
    >
      <div
        className="relative flex items-center justify-center font-display"
        style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface2)', color: 'var(--teal-lt)', fontWeight: 800, fontSize: 15 }}
      >
        {(q.customer?.firstName?.[0] || '#').toUpperCase()}
        <span
          title={team?.members?.[ownerKey]?.name || ''}
          style={{
            position: 'absolute', bottom: -2, right: -2, width: 11, height: 11, borderRadius: 999,
            background: ownerColor, border: '2px solid var(--surface)',
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{name}</span>
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
          <span className="tabular text-3" style={{ fontSize: 12 }}>{q.id}</span>
          <span className="text-3" style={{ fontSize: 12 }}>·</span>
          <span className="text-3" style={{ fontSize: 12 }}>{relativeDate(q.updatedAt || q.createdAt)}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="font-display tabular" style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>
          {formatMoney(q.pricing?.total || 0)}
        </span>
        <Badge status={q.status} />
      </div>
    </motion.button>
  )
}

function DashEmptyState({ onNew, hasQuotes }) {
  return (
    <EmptyState
      art="truck"
      title={hasQuotes ? 'No matches' : 'The trailer’s empty'}
      message={hasQuotes ? 'Try a different search or filter.' : 'Build your first quote in under 60 seconds — right from the customer’s driveway.'}
      actionLabel={hasQuotes ? undefined : 'Create a quote'}
      onAction={onNew}
    />
  )
}
