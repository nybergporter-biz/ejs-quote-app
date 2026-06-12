export const DEFAULT_SETTINGS = {
  TRAILER_CY: 12,
  RATE_PER_CY: 50,
  MIN_JOB: 89,
  DUMP_RATE_PER_TON: 36, // legacy fallback when no facility is chosen
  LBS_PER_CY: 150,
  HOURLY_RATE: 25,
  CREW_SIZE: 2,
  GAS_PER_MILE: 0.25,
  MILES_TO_DUMP: 15,
  RUSH_MULTIPLIER: 1.25,
  // Utah County landfill out-of-district rates (June 2026 fee schedules)
  NORTH_RATE_PER_TON: 83, // North Pointe Transfer Station, Lindon
  SOUTH_RATE_PER_TON: 45, // South Utah Valley SWD, Spanish Fork
  WEIGH_FEE: 5, // North Pointe per-weigh fee
}

export const LANDFILLS = {
  north: { key: 'north', name: 'North Pointe', place: 'Lindon', blurb: '$83/ton' },
  south: { key: 'south', name: 'South Valley', place: 'Spanish Fork', blurb: '$45/ton' },
}

/**
 * Per-item disposal fees each facility charges us (June-2026 fee schedules).
 * Keyed by item-library id. Items absent from a table cost nothing extra there.
 */
export const ITEM_DUMP_FEES = {
  north: {
    'mattress-king': 20, 'mattress-queen': 20, 'mattress-full': 20, 'mattress-twin': 20,
    'boxspring-king': 20, 'boxspring-queen': 20, 'boxspring-twin': 20,
    'tv-sm': 10, 'tv-lg': 10, 'monitor': 10, 'computer': 10, 'printer': 10,
    'fridge-lg': 15, 'fridge-sm': 15, 'freezer': 15, 'ac-window': 15, 'ac-portable': 15,
    'tire-no-rim': 5, 'tire-with-rim': 5,
  },
  south: {
    'tv-sm': 8, 'tv-lg': 12, 'monitor': 3,
    'fridge-lg': 10, 'fridge-sm': 10, 'freezer': 10, 'ac-window': 10, 'ac-portable': 10,
    'tire-no-rim': 2, 'tire-with-rim': 5,
  },
}

/** Total facility per-item disposal cost for a load at the chosen landfill. */
export function itemDisposalFees(items, landfill) {
  const table = ITEM_DUMP_FEES[landfill] || {}
  return (items || []).reduce((s, i) => s + (table[i.itemId || i.id] || 0) * (i.qty || 1), 0)
}

/**
 * Out-of-district dump fee for a load, per the June-2026 fee schedules.
 * North Pointe: $24 flat ≤500 lbs · $48 flat 501–1,000 lbs · $83/ton above, + $5 weigh fee.
 * South Utah Valley: commercial loads billed by weight at $45/ton ($12 floor).
 */
export function dumpFee(totalCY, landfill, settings = DEFAULT_SETTINGS) {
  const lbs = totalCY * (settings.LBS_PER_CY || 150)
  const tons = lbs / 2000
  if (landfill === 'south') {
    return Math.max(tons * (settings.SOUTH_RATE_PER_TON ?? 45), 12)
  }
  if (landfill === 'north') {
    const base = lbs <= 500 ? 24 : lbs <= 1000 ? 48 : tons * (settings.NORTH_RATE_PER_TON ?? 83)
    return base + (settings.WEIGH_FEE ?? 5)
  }
  return Math.max(tons * (settings.DUMP_RATE_PER_TON || 36), 8)
}

/**
 * @param items  array of { cy, qty, surcharge }
 * @param jobParams { estHours, driveMinutes, distanceMiles, isRush }
 * @param settings see DEFAULT_SETTINGS
 * @param extras { discount, additionalCharges: [{label, amount}] }
 */
export function calcQuote(items, jobParams, settings = DEFAULT_SETTINGS, extras = {}) {
  const { estHours = 1.5, driveMinutes = 20, distanceMiles = 10, isRush = false, landfill = null } = jobParams || {}
  const { discount = 0, additionalCharges = [] } = extras || {}

  const totalCY = items.reduce((s, i) => s + i.cy * i.qty, 0)
  const surcharges = items.reduce((s, i) => s + (i.surcharge || 0) * i.qty, 0)

  let base = Math.max(totalCY * settings.RATE_PER_CY, settings.MIN_JOB)
  if (isRush) base *= settings.RUSH_MULTIPLIER

  const additional = additionalCharges.reduce((s, c) => s + (Number(c.amount) || 0), 0)
  const total = Math.max(base + surcharges + additional - (Number(discount) || 0), 0)

  const totalHours = estHours + (driveMinutes * 2) / 60
  const labor = totalHours * settings.CREW_SIZE * settings.HOURLY_RATE
  const gas = (distanceMiles + settings.MILES_TO_DUMP * 2) * settings.GAS_PER_MILE
  const dump = dumpFee(totalCY, landfill, settings)
  const disposal = itemDisposalFees(items, landfill)
  const cost = labor + gas + dump + disposal

  return {
    totalCY,
    base,
    surcharges,
    additional,
    discount: Number(discount) || 0,
    total,
    fillPct: Math.min((totalCY / settings.TRAILER_CY) * 100, 100),
    fillPctRaw: (totalCY / settings.TRAILER_CY) * 100,
    over: totalCY > settings.TRAILER_CY,
    labor,
    gas,
    dump,
    disposal,
    cost,
    profit: total - cost,
    margin: total > 0 ? ((total - cost) / total) * 100 : 0,
  }
}

/** Good/Better/Best quote tiers. Prices derive from the base quote total. */
export const TIERS = [
  { key: 'basic', label: 'Basic', desc: 'Haul only', mult: 1 },
  { key: 'standard', label: 'Standard', desc: 'Haul + light demo', mult: 1.35 },
  { key: 'premium', label: 'Premium', desc: 'Haul + demo + same-day + cleanup', mult: 1.75 },
]

/** Tier prices rounded to the nearest $5 so they sound like real quotes. */
export function tierPrices(total) {
  return TIERS.map((t) => ({ ...t, price: Math.round((total * t.mult) / 5) * 5 }))
}

export function fillTone(pct, over) {
  if (over) return { label: 'Over capacity', color: 'var(--danger)' }
  if (pct >= 85) return { label: 'Nearly full', color: 'var(--warn)' }
  if (pct >= 55) return { label: 'Filling up', color: 'var(--gold)' }
  return { label: 'Plenty of room', color: 'var(--teal-lt)' }
}
