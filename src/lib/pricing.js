export const DEFAULT_SETTINGS = {
  TRAILER_CY: 12,
  RATE_PER_CY: 50,
  MIN_JOB: 89,
  DUMP_RATE_PER_TON: 36, // legacy fallback when no facility is chosen
  LBS_PER_CY: 150, // density fallback for items without a per-unit weight
  HOURLY_RATE: 25,
  CREW_SIZE: 2,
  GAS_PER_MILE: 0.25,
  MILES_TO_DUMP: 15,
  RUSH_MULTIPLIER: 1.25,
  NORTH_RATE_PER_TON: 83, // North Pointe >1,000 lb out-of-district $/ton
  SOUTH_RATE_PER_TON: 45, // SUVSWD large-load $/ton — ESTIMATE, verify at scale house
  WEIGH_FEE: 5, // North Pointe per-weigh fee
  TRAILER_PAYLOAD_LBS: 2800, // single-axle payload guard — adjust to your trailer's rating
}

export const LANDFILLS = {
  north: { key: 'north', name: 'North Pointe', place: 'Lindon', blurb: '$24 / $48 / $83·ton + $5' },
  south: { key: 'south', name: 'South Valley', place: 'Springville', blurb: '$17 / $56 flat (est.)' },
}

/**
 * North Pointe "participating cities" — loads originating here may qualify
 * for in-district rates (roughly half). Verify with the scale house before
 * relying on it; the in-district toggle on a quote applies these rates.
 */
export const NP_MEMBER_CITIES = [
  'orem', 'vineyard', 'pleasant grove', 'lindon', 'american fork',
  'cedar hills', 'highland', 'lehi', 'saratoga springs',
]
export const isNpMemberCity = (city) => NP_MEMBER_CITIES.includes(String(city || '').trim().toLowerCase())

/**
 * Per-item disposal fees each facility charges us, from the posted fee
 * schedules (npswssdut.gov, June 2026). North Pointe: mattresses $20,
 * electronics $10/item, refrigerant extraction $15/unit, tires $12
 * commercial. Keyed by item-library id; absent items cost nothing extra.
 */
export const ITEM_DUMP_FEES = {
  north: {
    'mattress-king': 20, 'mattress-queen': 20, 'mattress-full': 20, 'mattress-twin': 20,
    'boxspring-king': 20, 'boxspring-queen': 20, 'boxspring-twin': 20,
    'tv-sm': 10, 'tv-lg': 10, 'monitor': 10, 'computer': 10, 'printer': 10,
    'fridge-lg': 15, 'fridge-sm': 15, 'freezer': 15, 'ac-window': 15, 'ac-portable': 15,
    'tire-no-rim': 12, 'tire-with-rim': 12,
  },
  south: {
    'mattress-king': 20, 'mattress-queen': 20, 'mattress-full': 20, 'mattress-twin': 20,
    'tv-sm': 8, 'tv-lg': 12, 'monitor': 3,
    'fridge-lg': 15, 'fridge-sm': 15, 'freezer': 15, 'ac-window': 15, 'ac-portable': 15,
    'tire-no-rim': 2, 'tire-with-rim': 5,
  },
}

/** Total facility per-item disposal cost for a load at the chosen landfill. */
export function itemDisposalFees(items, landfill) {
  const table = ITEM_DUMP_FEES[landfill] || {}
  return (items || []).reduce((s, i) => s + (table[i.itemId || i.id] || 0) * (i.qty || 1), 0)
}

/**
 * Estimated load weight: per-item average weights when known, density
 * fallback (LBS_PER_CY) for custom items that don't carry one.
 */
export function estimateLoadLbs(items, settings = DEFAULT_SETTINGS) {
  const density = settings.LBS_PER_CY || 150
  return (items || []).reduce(
    (s, i) => s + (i.lbs != null ? i.lbs : (i.cy || 0) * density) * (i.qty || 1),
    0,
  )
}

/**
 * Gate-fee detail for an estimated load weight at a facility.
 *
 * North Pointe (npswssdut.gov, June 2026), + $5 weigh fee:
 *   out-of-district: ≤500 lb $24 · 501–1,000 lb $48 · over $83/ton
 *   in-district:     ≤500 lb $12 · 501–1,000 lb $24 · over $41.50/ton
 * South Utah Valley (suvswd.org): ≤500 lb $17 ($12 in-district) ·
 *   over 500 lb $56 flat ($46 in-district) for standard loads; big loads
 *   estimated per-ton (SOUTH_RATE_PER_TON) — verify at the scale house.
 *
 * Returns { fee, label, savings } where savings (if present) describes the
 * next-cheaper tier: { trimLbs, save }.
 */
export function dumpFeeDetail(lbs, landfill, settings = DEFAULT_SETTINGS, { inDistrict = false } = {}) {
  const tons = lbs / 2000

  if (landfill === 'north') {
    const [t1, t2, perTon] = inDistrict ? [12, 24, 41.5] : [24, 48, settings.NORTH_RATE_PER_TON ?? 83]
    const weigh = settings.WEIGH_FEE ?? 5
    let base, label
    if (lbs <= 500) { base = t1; label = '≤500 lb flat' }
    else if (lbs <= 1000) { base = t2; label = '501–1,000 lb flat' }
    else { base = tons * perTon; label = `$${perTon}/ton` }
    const detail = { fee: base + weigh, label: label + (inDistrict ? ' · in-district' : '') }
    // tier-boundary nudge: barely over a cheaper flat tier
    if (lbs > 500 && lbs <= 575) detail.savings = { trimLbs: Math.ceil(lbs - 500), save: t2 - t1 }
    else if (lbs > 1000 && lbs <= 1150) detail.savings = { trimLbs: Math.ceil(lbs - 1000), save: tons * perTon - t2 }
    return detail
  }

  if (landfill === 'south') {
    const [t1, t2] = inDistrict ? [12, 46] : [17, 56]
    if (lbs <= 500) return { fee: t1, label: '≤500 lb flat' }
    const fee = Math.max(t2, tons * (settings.SOUTH_RATE_PER_TON ?? 45))
    return { fee, label: fee === t2 ? 'over 500 lb flat' : `~$${settings.SOUTH_RATE_PER_TON ?? 45}/ton (verify)` }
  }

  return { fee: Math.max(tons * (settings.DUMP_RATE_PER_TON || 36), 8), label: 'estimate' }
}

/** Gate fee only — convenience over dumpFeeDetail. Takes POUNDS. */
export function dumpFee(lbs, landfill, settings = DEFAULT_SETTINGS, opts = {}) {
  return dumpFeeDetail(lbs, landfill, settings, opts).fee
}

/**
 * @param items  array of { cy, lbs, qty, surcharge }
 * @param jobParams { estHours, driveMinutes, distanceMiles, isRush, landfill, inDistrict }
 * @param settings see DEFAULT_SETTINGS
 * @param extras { discount, additionalCharges: [{label, amount}] }
 */
export function calcQuote(items, jobParams, settings = DEFAULT_SETTINGS, extras = {}) {
  const { estHours = 1.5, driveMinutes = 20, distanceMiles = 10, isRush = false, landfill = null, inDistrict = false } = jobParams || {}
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
  const estLbs = estimateLoadLbs(items, settings)
  const dumpDetail = dumpFeeDetail(estLbs, landfill, settings, { inDistrict })
  const dump = dumpDetail.fee
  const disposal = itemDisposalFees(items, landfill)
  const cost = labor + gas + dump + disposal

  return {
    totalCY,
    estLbs,
    base,
    surcharges,
    additional,
    discount: Number(discount) || 0,
    total,
    fillPct: Math.min((totalCY / settings.TRAILER_CY) * 100, 100),
    fillPctRaw: (totalCY / settings.TRAILER_CY) * 100,
    over: totalCY > settings.TRAILER_CY,
    overweight: estLbs > (settings.TRAILER_PAYLOAD_LBS || 2800),
    labor,
    gas,
    dump,
    dumpDetail,
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
