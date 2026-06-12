// Pure planning helpers — no React, no I/O. Unit-tested in planner.test.js.

export function parseCity(address = '') {
  const parts = String(address).split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return ''
  let city = parts[parts.length - 2]
  // strip a trailing "ST" or "ST 12345" if it landed in the city slot
  city = city.replace(/\s+[A-Za-z]{2}\s*\d{0,5}$/, '').trim()
  return city
}

// District cities per each facility's published service area (June 2026).
const SOUTH_CITIES = new Set([
  'provo', 'spanish fork', 'springville', 'mapleton', 'salem', 'goshen', 'woodland hills',
  'payson', 'santaquin', 'elk ridge', 'benjamin', 'genola', 'west mountain', 'palmyra', 'lake shore',
])
const NORTH_CITIES = new Set([
  'orem', 'vineyard', 'pleasant grove', 'lindon', 'american fork', 'cedar hills', 'highland',
  'lehi', 'saratoga springs', 'eagle mountain', 'alpine', 'cedar fort', 'fairfield',
  'draper', 'bluffdale', 'south jordan', 'riverton', 'herriman',
])

/** Which dump facility a job's city points to: 'north' (North Pointe, Lindon) or 'south' (Spanish Fork). */
export function landfillFor(city) {
  const c = (city || '').trim().toLowerCase()
  if (SOUTH_CITIES.has(c)) return 'south'
  if (NORTH_CITIES.has(c)) return 'north'
  return 'north' // base is South Jordan — North Pointe is the default haul
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
 * Upcoming dates that already have a job in the same city.
 * Returns up to 3 { date, city, fillAfter } ranked by soonest date.
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
