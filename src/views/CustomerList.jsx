import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronRight, MessageSquare } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'
import { formatMoney, relativeDate, copyText } from '../lib/utils'

export default function CustomerList({ navigate }) {
  const { customers, quotes, business } = useApp()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const enriched = useMemo(() => {
    const byCust = {}
    quotes.forEach((q) => {
      const id = q.customer?.id
      if (!id) return
      if (!byCust[id]) byCust[id] = { count: 0, revenue: 0, won: 0, last: 0, quotes: [] }
      byCust[id].count++
      byCust[id].quotes.push(q)
      if (['accepted', 'completed'].includes(q.status)) { byCust[id].revenue += q.pricing?.total || 0; byCust[id].won++ }
      byCust[id].last = Math.max(byCust[id].last, new Date(q.updatedAt || q.createdAt).getTime())
    })
    const THIRTY = 30 * 86400000
    const NINETY = 90 * 86400000
    let list = customers.map((c) => {
      const e = byCust[c.id] || { count: 0, revenue: 0, won: 0, last: new Date(c.createdAt).getTime(), quotes: [] }
      const quiet = e.count > 0 && e.won === 0 && Date.now() - e.last > THIRTY
      const recurring = e.won >= 2
      const followUp = e.won > 0 && Date.now() - e.last > NINETY
      return { ...c, ...e, quiet, recurring, followUp }
    })
    return list
  }, [customers, quotes])

  const quietCount = enriched.filter((c) => c.quiet).length
  const recurringCount = enriched.filter((c) => c.recurring).length
  const followUpCount = enriched.filter((c) => c.followUp).length

  const shown = useMemo(() => {
    let list = enriched
    if (filter === 'quiet') list = list.filter((c) => c.quiet)
    else if (filter === 'recurring') list = list.filter((c) => c.recurring)
    else if (filter === 'followup') list = list.filter((c) => c.followUp)
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => `${c.firstName} ${c.lastName} ${c.phone} ${c.email} ${c.address}`.toLowerCase().includes(q))
    return [...list].sort((a, b) => b.last - a.last)
  }, [enriched, filter, query])

  const totalRevenue = enriched.reduce((s, c) => s + c.revenue, 0)

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 18px) 16px 24px' }}>
      <div className="flex items-end justify-between" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Customers</h1>
          <span className="text-2" style={{ fontSize: 13.5 }}>{customers.length} contacts · {formatMoney(totalRevenue)} booked</span>
        </div>
      </div>

      <div className="relative" style={{ marginBottom: 12 }}>
        <Search size={17} color="var(--text3)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="field" style={{ paddingLeft: 38 }} placeholder="Search by name, phone, or street" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {/* filter pills */}
      {customers.length > 0 && (
        <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: 14, scrollbarWidth: 'none', paddingBottom: 2 }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'recurring', label: recurringCount ? `Recurring · ${recurringCount}` : 'Recurring' },
            { key: 'followup', label: followUpCount ? `Time to follow up · ${followUpCount}` : 'Time to follow up' },
            { key: 'quiet', label: quietCount ? `Gone quiet · ${quietCount}` : 'Gone quiet' },
          ].map((f) => {
            const active = filter === f.key
            const warn = (f.key === 'quiet' && quietCount > 0) || (f.key === 'followup' && followUpCount > 0)
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 600,
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
      )}

      {shown.length === 0 ? (
        <EmptyState
          art="customers"
          title={customers.length === 0 ? 'No customers yet' : 'No matches'}
          message={customers.length === 0 ? 'Customers are saved automatically when you add their info to a quote.' : 'Try a different search or filter.'}
          actionLabel={customers.length === 0 ? 'Start a quote' : undefined}
          onAction={() => navigate('builder')}
        />
      ) : (
        <div className="space-y-2.5">
          {shown.map((c, i) => (
            <motion.button
              key={c.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('customer', { customerId: c.id })}
              className="surface w-full flex items-center gap-3 text-left"
              style={{ borderRadius: 16, padding: '13px 14px' }}
            >
              <div className="flex items-center justify-center font-display" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', color: 'var(--teal-lt)', fontWeight: 800, fontSize: 16 }}>
                {(c.firstName?.[0] || '?').toUpperCase()}{(c.lastName?.[0] || '').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                    {`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer'}
                  </span>
                  {c.recurring && (
                    <span style={{ fontSize: 8.5, fontWeight: 800, padding: '2px 6px', borderRadius: 999, background: 'var(--gold)', color: '#1a1206' }}>
                      REPEAT
                    </span>
                  )}
                  {c.quiet && <span style={{ fontSize: 9.5, fontWeight: 700, color: '#e7965b' }}>QUIET</span>}
                </div>
                <div className="text-3" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.address || c.phone || c.email || '—'}
                </div>
              </div>
              {c.followUp ? (
                <span
                  role="button"
                  onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await copyText(`Hey ${c.firstName || 'there'}, hope everything's going well — need another haul? We can swing by this week. — ${business.companyName || 'Elite Junk Solutions'}`)
                    toast.success(ok ? 'Follow-up text copied' : 'Couldn’t copy')
                  }}
                  className="flex items-center justify-center"
                  style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: 'color-mix(in srgb, var(--ember) 14%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--ember) 40%, transparent)',
                  }}
                  title="Copy follow-up text"
                >
                  <MessageSquare size={17} color="var(--ember-lt)" />
                </span>
              ) : (
                <div className="flex flex-col items-end">
                  <span className="tabular" style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{c.count} quote{c.count !== 1 ? 's' : ''}</span>
                  <span className="text-3" style={{ fontSize: 11.5 }}>{c.last ? relativeDate(new Date(c.last).toISOString()) : ''}</span>
                </div>
              )}
              <ChevronRight size={18} color="var(--text3)" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  )
}
