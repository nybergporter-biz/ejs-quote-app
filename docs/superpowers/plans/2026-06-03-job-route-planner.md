# Job & Route Planner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scheduling/route planner that batches junk-removal jobs by city per day and minimizes dump trips, via simple city-grouping + a trailer-capacity running total (no geocoding/routing).

**Architecture:** Quotes gain `scheduledDate` / `city` / `plannedCY`. Pure helpers in `src/lib/planner.js` (unit-tested) compute city grouping, dump-run dividers, savings, and same-city day suggestions. A new `Schedule` view (Today + Week) and a reusable `ScheduleControl` read/write those fields through new store actions. A small "Today" peek goes on the dashboard.

**Tech Stack:** React + Vite (JS/JSX), Tailwind v3, framer-motion, lucide-react, Vitest (new, dev-only), localStorage + Supabase sync (already handles new quote fields).

**Note on checkpoints:** the project has no git repo, so "checkpoint" steps run tests/build instead of committing. (Offer to set up git separately.)

---

## File structure

- `src/lib/planner.js` — **new.** Pure functions: `parseCity`, `jobCY`, `dumpRuns`, `daySavings`, `groupByCity`, `suggestDays`. No React, no I/O.
- `src/lib/planner.test.js` — **new.** Vitest unit tests for the above.
- `vite.config.js` — **modify.** Add Vitest `test` config.
- `package.json` — **modify.** Add `"test": "vitest run"` script + `vitest` devDep.
- `src/store.jsx` — **modify.** Add `scheduleQuote`, `unscheduleQuote` actions.
- `src/components/ScheduleControl.jsx` — **new.** Schedule sheet (date, city, size, suggestions); used on QuoteDetail + QuoteBuilder.
- `src/views/Schedule.jsx` — **new.** Schedule tab: Today + Week modes.
- `src/views/QuoteDetail.jsx` — **modify.** Mount `<ScheduleControl>`.
- `src/views/Dashboard.jsx` — **modify.** Add "Today" peek card.
- `src/App.jsx` — **modify.** Add `schedule` route, lazy import, Schedule nav item.

---

## Task 1: Pure planner helpers + Vitest (TDD)

**Files:**
- Modify: `package.json` (add vitest devDep + test script)
- Modify: `vite.config.js` (add test config)
- Create: `src/lib/planner.js`
- Create: `src/lib/planner.test.js`

- [ ] **Step 1: Install Vitest**

Run: `cd ~/Desktop/ejs-quote-app && npm install -D vitest`
Expected: added vitest, 0 vulnerabilities.

- [ ] **Step 2: Add the test script to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 3: Add Vitest config to vite.config.js**

Add a `test` key to the `defineConfig({...})` object (sibling of `plugins`/`resolve`):
```js
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
```

- [ ] **Step 4: Write the failing tests**

Create `src/lib/planner.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { parseCity, jobCY, dumpRuns, daySavings, groupByCity, suggestDays } from './planner'

describe('parseCity', () => {
  it('pulls the city from a full US address', () => {
    expect(parseCity('1247 Maple St, Saratoga Springs, UT 84045')).toBe('Saratoga Springs')
  })
  it('handles state with no zip', () => {
    expect(parseCity('123 Main St, Lehi, UT')).toBe('Lehi')
  })
  it('returns empty string when unparseable', () => {
    expect(parseCity('Eagle Mountain')).toBe('')
    expect(parseCity('')).toBe('')
  })
})

describe('jobCY', () => {
  it('prefers plannedCY override', () => {
    expect(jobCY({ plannedCY: 6, pricing: { totalCY: 3 } })).toBe(6)
  })
  it('falls back to pricing.totalCY', () => {
    expect(jobCY({ plannedCY: null, pricing: { totalCY: 3 } })).toBe(3)
  })
  it('defaults to 0', () => {
    expect(jobCY({})).toBe(0)
  })
})

describe('dumpRuns', () => {
  it('one small load = one run, divider after last', () => {
    expect(dumpRuns([2.5], 12)).toEqual({ runs: 1, markers: [0] })
  })
  it('exactly full = one run', () => {
    expect(dumpRuns([12], 12)).toEqual({ runs: 1, markers: [0] })
  })
  it('overflow splits into two runs', () => {
    expect(dumpRuns([10, 5], 12)).toEqual({ runs: 2, markers: [0, 1] })
  })
  it('packs to the boundary', () => {
    expect(dumpRuns([6, 6, 6], 12)).toEqual({ runs: 2, markers: [1, 2] })
  })
  it('a single job bigger than the trailer takes multiple runs', () => {
    expect(dumpRuns([18], 12)).toEqual({ runs: 2, markers: [0] })
  })
})

describe('daySavings', () => {
  it('values each avoided dump round-trip', () => {
    // 3 jobs, 2 runs -> 1 avoided trip; 15 miles *2 *0.25 = 7.5
    const settings = { MILES_TO_DUMP: 15, GAS_PER_MILE: 0.25 }
    expect(daySavings([6, 6, 6], 12, settings)).toBeCloseTo(7.5)
  })
})

describe('groupByCity', () => {
  it('groups preserving order', () => {
    const jobs = [{ city: 'Lehi', id: 1 }, { city: 'Lehi', id: 2 }, { city: 'Provo', id: 3 }]
    const g = groupByCity(jobs)
    expect(Object.keys(g)).toEqual(['Lehi', 'Provo'])
    expect(g.Lehi.map((j) => j.id)).toEqual([1, 2])
  })
  it('labels empty city as Other', () => {
    expect(Object.keys(groupByCity([{ city: '', id: 1 }]))).toEqual(['Other'])
  })
})

describe('suggestDays', () => {
  it('suggests upcoming same-city days with room', () => {
    const quotes = [
      { id: 'a', city: 'Lehi', scheduledDate: '2026-06-04', plannedCY: 4, pricing: {} },
      { id: 'b', city: 'Provo', scheduledDate: '2026-06-05', plannedCY: 4, pricing: {} },
    ]
    const incoming = { id: 'c', city: 'Lehi', plannedCY: 3, pricing: {} }
    const out = suggestDays(incoming, quotes, { TRAILER_CY: 12 }, '2026-06-03')
    expect(out[0].date).toBe('2026-06-04')
    expect(out[0].city).toBe('Lehi')
  })
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `planner` module not found / functions undefined.

- [ ] **Step 6: Implement `src/lib/planner.js`**

```js
// Pure planning helpers — no React, no I/O. Unit-tested in planner.test.js.

export function parseCity(address = '') {
  const parts = String(address).split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return ''
  let city = parts[parts.length - 2]
  // strip a trailing "ST" or "ST 12345" if it landed in the city slot
  city = city.replace(/\s+[A-Za-z]{2}\s*\d{0,5}$/, '').trim()
  return city
}

export function jobCY(quote) {
  const v = quote?.plannedCY
  if (v != null && !Number.isNaN(Number(v))) return Number(v)
  return quote?.pricing?.totalCY || 0
}

/**
 * @param cys array of cubic-yard numbers in route order
 * @param capacity trailer capacity (CY)
 * @returns { runs, markers } markers[i] = render a DUMP RUN divider AFTER job index i
 */
export function dumpRuns(cys, capacity) {
  let running = 0
  let runs = 0
  const markers = []
  cys.forEach((cy, i) => {
    if (cy > capacity) {
      if (running > 0) { runs++; markers.push(i - 1); running = 0 }
      runs += Math.ceil(cy / capacity)
      markers.push(i)
      running = 0
      return
    }
    if (running + cy > capacity) {
      runs++
      markers.push(i - 1)
      running = 0
    }
    running += cy
  })
  if (running > 0) { runs++; markers.push(cys.length - 1) }
  // de-dup markers while preserving order
  return { runs, markers: [...new Set(markers)].sort((a, b) => a - b) }
}

export function daySavings(cys, capacity, settings) {
  const { runs } = dumpRuns(cys, capacity)
  const perTrip = (settings?.MILES_TO_DUMP || 0) * 2 * (settings?.GAS_PER_MILE || 0)
  return Math.max(cys.length - runs, 0) * perTrip
}

export function groupByCity(jobs) {
  const out = {}
  for (const j of jobs) {
    const key = j.city && j.city.trim() ? j.city.trim() : 'Other'
    if (!out[key]) out[key] = []
    out[key].push(j)
  }
  return out
}

/**
 * Upcoming dates that already have a job in the same city with room before a new dump run.
 * Returns up to 3 { date, city, fillAfter } ranked by most remaining capacity.
 */
export function suggestDays(incoming, quotes, settings, fromDate) {
  const cap = settings?.TRAILER_CY || 12
  const city = (incoming.city || '').trim().toLowerCase()
  if (!city) return []
  const incomingCY = jobCY(incoming)
  const byDate = {}
  for (const q of quotes) {
    if (!q.scheduledDate || q.id === incoming.id) continue
    if ((q.city || '').trim().toLowerCase() !== city) continue
    if (q.scheduledDate < fromDate) continue
    ;(byDate[q.scheduledDate] ||= []).push(q)
  }
  return Object.entries(byDate)
    .map(([date, jobs]) => {
      const used = jobs.reduce((s, j) => s + jobCY(j), 0)
      const fillAfter = used + incomingCY
      return { date, city: jobs[0].city, fillAfter, remaining: cap - (used % cap || 0) }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green.

- [ ] **Step 8: Checkpoint** — `npm run build` succeeds.

---

## Task 2: Store actions

**Files:**
- Modify: `src/store.jsx` (actions object + dependency array)

- [ ] **Step 1: Add the actions** (in the `actions` useMemo, after `setQuotePaid`):

```js
      scheduleQuote: (id, { date, city, plannedCY }) =>
        setQuotes((list) => list.map((x) => (x.id === id
          ? { ...x, scheduledDate: date || null, city: city ?? x.city, plannedCY: plannedCY ?? x.plannedCY ?? null, updatedAt: new Date().toISOString() }
          : x))),
      unscheduleQuote: (id) =>
        setQuotes((list) => list.map((x) => (x.id === id ? { ...x, scheduledDate: null, updatedAt: new Date().toISOString() } : x))),
```

- [ ] **Step 2: Checkpoint** — `npm run build` succeeds (actions referenced later).

---

## Task 3: ScheduleControl component

**Files:**
- Create: `src/components/ScheduleControl.jsx`

- [ ] **Step 1: Implement the component**

```jsx
import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, X, MapPin } from 'lucide-react'
import { useApp } from '../store'
import { parseCity, jobCY, suggestDays } from '../lib/planner'
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
  const fulls = (n) => `${(n / cap).toFixed(2).replace(/\.?0+$/, '')} trailer${n / cap === 1 ? '' : 's'}`

  const save = () => { app.scheduleQuote(quote.id, { date, city, plannedCY: Number(cy) }); setOpen(false) }
  const remove = () => { app.unscheduleQuote(quote.id); setOpen(false) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="surface w-full flex items-center gap-3 text-left"
        style={{ borderRadius: 14, padding: '12px 14px' }}
      >
        <div className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(42,127,138,0.16)', color: 'var(--teal-lt)' }}>
          <CalendarDays size={18} />
        </div>
        <div style={{ flex: 1 }}>
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
                  <span className="micro-label" style={{ display: 'block', marginBottom: 8 }}>You're already in {city} on…</span>
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
```

- [ ] **Step 2: Checkpoint** — `npm run build` succeeds.

---

## Task 4: Mount ScheduleControl on QuoteDetail

**Files:**
- Modify: `src/views/QuoteDetail.jsx`

- [ ] **Step 1: Import it** — add near the other imports:
```js
import ScheduleControl from '../components/ScheduleControl'
```

- [ ] **Step 2: Render it** — directly AFTER the `</motion.div>` that closes the quote card (before the `{/* photos */}` block):
```jsx
      <div style={{ marginTop: 12 }}>
        <ScheduleControl quote={quote} />
      </div>
```

- [ ] **Step 3: Checkpoint** — `npm run build` succeeds; in preview, open a quote → tap "Schedule this job" → sheet opens, save sets a date.

---

## Task 5: Schedule view (Today + Week)

**Files:**
- Create: `src/views/Schedule.jsx`

- [ ] **Step 1: Implement the view**

```jsx
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Truck, MapPin, Navigation, CalendarDays } from 'lucide-react'
import { useApp } from '../store'
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
  const { markers } = dumpRuns(cys, cap)
  const markerSet = new Set(markers)
  const totalCY = cys.reduce((s, c) => s + c, 0)
  const runs = dumpRuns(cys, cap).runs
  const saved = daySavings(cys, cap, app.settings)
  const cities = [...new Set(dayJobs.map((q) => (q.city || 'Other')))]

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 18px) 16px 24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>Schedule</h1>
        <div className="flex gap-1" style={{ background: 'var(--surface2)', borderRadius: 999, padding: 3 }}>
          {['today', 'week'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', background: mode === m ? 'var(--teal)' : 'transparent', color: mode === m ? '#fff' : 'var(--text2)' }}>{m}</button>
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
            <div className="surface text-center" style={{ borderRadius: 18, padding: '34px 20px' }}>
              <CalendarDays size={28} color="var(--teal-lt)" />
              <div className="font-display" style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginTop: 10 }}>Nothing scheduled</div>
              <p className="text-2" style={{ fontSize: 13.5, marginTop: 4 }}>Open a quote and tap “Schedule this job.”</p>
            </div>
          ) : (
            <>
              {/* day summary */}
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

              {/* stops, grouped by city, with dump dividers */}
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
                            <button onClick={() => navigate('quote', { quoteId: q.id })} className="text-left" style={{ flex: 1, minWidth: 0 }}>
                              <div className="font-display" style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)' }}>{name}</div>
                              <div className="text-3" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.customer?.address || '—'} · {formatCY(jobCY(q))} CY</div>
                            </button>
                            <a href={mapsHref(q.customer?.address)} target="_blank" rel="noreferrer" className="flex items-center justify-center" style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface2)', color: 'var(--teal-lt)' }}>
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
        /* WEEK MODE */
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
```

- [ ] **Step 2: Checkpoint** — `npm run build` succeeds.

---

## Task 6: Wire the Schedule tab into the router + nav

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Lazy import** (with the other view imports):
```js
const Schedule = lazy(() => import('./views/Schedule'))
```

- [ ] **Step 2: Route** — in `renderView()`'s switch, add:
```js
      case 'schedule':
        return <Schedule route={route} navigate={navigate} />
```

- [ ] **Step 3: Nav item** — in `App.jsx`, change the `NAV` array to include Schedule, and import `CalendarDays`:
```js
import { Home, Users, Settings as SettingsIcon, Plus, CalendarDays } from 'lucide-react'
```
```js
const NAV = [
  { key: 'dashboard', icon: Home, label: 'Home' },
  { key: 'schedule', icon: CalendarDays, label: 'Schedule' },
  { key: 'customers', icon: Users, label: 'Customers' },
  { key: 'settings', icon: SettingsIcon, label: 'Settings' },
]
```
In `BottomNav`, the layout currently splits `NAV.slice(0,1)` (left of FAB) and `NAV.slice(1)` (right). Change to put two items on each side of the FAB:
```js
        {NAV.slice(0, 2).map((n) => (
          <NavItem key={n.key} n={n} active={route.view === n.key} onClick={() => navigate(n.key)} />
        ))}
```
…(FAB unchanged)…
```js
        {NAV.slice(2).map((n) => (
          <NavItem key={n.key} n={n} active={route.view === n.key} onClick={() => navigate(n.key)} />
        ))}
```

- [ ] **Step 4: Checkpoint** — `npm run build` succeeds; preview shows a 4-tab nav (Home · Schedule · Customers · Settings) with the FAB centered; Schedule tab renders.

---

## Task 7: Dashboard "Today" peek

**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Compute today's scheduled jobs** — inside the component, after `stats`/`filtered` memos:
```js
  const todayStops = useMemo(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return quotes.filter((q) => q.scheduledDate === iso)
  }, [quotes])
```

- [ ] **Step 2: Render the peek** — directly AFTER the New Quote CTA `motion.button` (before the `<Sparkline …/>`):
```jsx
        {todayStops.length > 0 && (
          <button
            onClick={() => navigate('schedule')}
            className="surface w-full flex items-center gap-3 text-left"
            style={{ borderRadius: 16, padding: '13px 14px', marginTop: 12, borderLeft: '3px solid var(--teal)' }}
          >
            <div className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(42,127,138,0.16)', color: 'var(--teal-lt)' }}>
              <span style={{ fontWeight: 800 }}>{todayStops.length}</span>
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
```

Note: requires `CalendarDays` import already present in Dashboard? It does not use it — no new import needed (uses inline number). Confirm no missing imports.

- [ ] **Step 2b: Checkpoint** — `npm run build` succeeds.

---

## Task 8: Full verification + deploy

- [ ] **Step 1: Unit tests** — `npm test` → all planner suites pass.
- [ ] **Step 2: Build** — `npm run build` → zero errors.
- [ ] **Step 3: Manual (preview, mobile viewport):**
  - Seed/create 3 quotes with addresses in 2 cities. Open each → Schedule → pick dates (use a same-city suggestion chip for one).
  - Schedule tab → Today: jobs grouped by city, a 🛻 DUMP RUN divider appears once cumulative CY crosses 12, "saves ~$X" + "1 area/2 areas" badge correct, tap-to-navigate opens maps.
  - Week mode: day cards show city chips (`Saratoga Springs ×N`) + dump-run counts; tapping a day opens it.
  - Dashboard shows the "Today's stops" peek when something is scheduled today.
- [ ] **Step 4: Deploy** — `npx -y netlify-cli deploy --prod --dir=dist`.

---

## Self-review

- **Spec coverage:** data model (Task 2 fields via actions; fields written by ScheduleControl) ✓; planner helpers + tests (Task 1) ✓; ScheduleControl with suggestions/override (Task 3) ✓; QuoteDetail mount (Task 4) ✓; Schedule Today+Week (Task 5) ✓; nav/route (Task 6) ✓; Dashboard peek (Task 7) ✓; verify+deploy (Task 8) ✓. Phase-2 items intentionally excluded.
- **Placeholders:** none — all steps contain real code/commands.
- **Type/name consistency:** `dumpRuns` returns `{runs, markers}` and is used that way in Task 5; `jobCY`, `groupByCity`, `daySavings`, `suggestDays`, `parseCity` signatures match between `planner.js`, tests, and consumers; store actions `scheduleQuote`/`unscheduleQuote` names match ScheduleControl usage. Fields `scheduledDate`/`city`/`plannedCY` consistent throughout.
