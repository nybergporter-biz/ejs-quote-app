import { describe, it, expect } from 'vitest'
import {
  dumpFee, dumpFeeDetail, calcQuote, itemDisposalFees, estimateLoadLbs,
  isNpMemberCity, DEFAULT_SETTINGS,
} from './pricing'
import { ITEMS } from './itemLibrary'
import { landfillFor } from './planner'

const S = DEFAULT_SETTINGS
const lib = Object.fromEntries(ITEMS.map((i) => [i.id, i]))
const pick = (id, qty = 1) => ({ itemId: id, cy: lib[id].cy, lbs: lib[id].lbs, qty, surcharge: lib[id].surcharge })

describe('estimateLoadLbs — weight from items', () => {
  it('sums per-item weights × qty', () => {
    // sofa-lg 180 + 2× dining-chair 18 = 216
    expect(estimateLoadLbs([pick('sofa-lg'), pick('dining-chair', 2)], S)).toBe(216)
  })
  it('falls back to density for items without a weight (custom items)', () => {
    expect(estimateLoadLbs([{ cy: 2, qty: 1 }], S)).toBe(2 * S.LBS_PER_CY)
  })
  it('every library item carries a weight', () => {
    expect(ITEMS.every((i) => typeof i.lbs === 'number' && i.lbs > 0)).toBe(true)
  })
})

describe('dumpFee — North Pointe out-of-district tiers (posted schedule)', () => {
  it('≤500 lb = $24 flat + $5 weigh = $29', () => {
    expect(dumpFee(400, 'north', S)).toBeCloseTo(29)
    expect(dumpFee(500, 'north', S)).toBeCloseTo(29)
  })
  it('501–1,000 lb = $48 flat + $5 = $53', () => {
    expect(dumpFee(501, 'north', S)).toBeCloseTo(53)
    expect(dumpFee(1000, 'north', S)).toBeCloseTo(53)
  })
  it('over 1,000 lb = $83/ton + $5', () => {
    expect(dumpFee(1500, 'north', S)).toBeCloseTo(0.75 * 83 + 5)
    expect(dumpFee(2000, 'north', S)).toBeCloseTo(88)
  })
})

describe('dumpFee — North Pointe in-district (member-city loads)', () => {
  it('halves the flat tiers: $12 / $24 + weigh', () => {
    expect(dumpFee(400, 'north', S, { inDistrict: true })).toBeCloseTo(17)
    expect(dumpFee(900, 'north', S, { inDistrict: true })).toBeCloseTo(29)
  })
  it('$41.50/ton above 1,000 lb', () => {
    expect(dumpFee(2000, 'north', S, { inDistrict: true })).toBeCloseTo(41.5 + 5)
  })
})

describe('dumpFeeDetail — tier-boundary nudges', () => {
  it('barely over 500 lb suggests trimming back to the $24 tier', () => {
    const d = dumpFeeDetail(530, 'north', S)
    expect(d.savings).toBeTruthy()
    expect(d.savings.trimLbs).toBe(30)
    expect(d.savings.save).toBe(24)
  })
  it('barely over 1,000 lb suggests trimming back to the $48 tier', () => {
    const d = dumpFeeDetail(1060, 'north', S)
    expect(d.savings.trimLbs).toBe(60)
    expect(d.savings.save).toBeCloseTo((1060 / 2000) * 83 - 48)
  })
  it('no nudge when comfortably inside a tier', () => {
    expect(dumpFeeDetail(800, 'north', S).savings).toBeUndefined()
    expect(dumpFeeDetail(2000, 'north', S).savings).toBeUndefined()
  })
})

describe('dumpFee — South Utah Valley (flat tiers, per-ton estimate above)', () => {
  it('≤500 lb = $17 out-of-district', () => {
    expect(dumpFee(400, 'south', S)).toBe(17)
  })
  it('over 500 lb = $56 flat until per-ton estimate exceeds it', () => {
    expect(dumpFee(900, 'south', S)).toBe(56)
    // 3,000 lbs → 1.5 t × $45 = $67.50 > $56
    expect(dumpFee(3000, 'south', S)).toBeCloseTo(67.5)
  })
})

describe('dumpFee — legacy fallback (no facility)', () => {
  it('uses DUMP_RATE_PER_TON with an $8 floor', () => {
    expect(dumpFee(1500, null, S)).toBeCloseTo(27)
    expect(dumpFee(100, null, S)).toBe(8)
  })
})

describe('calcQuote — weight-aware costs', () => {
  it('computes estLbs from real item weights, not volume', () => {
    // fridge-lg: 1.75 CY would be 262 lb by density, but the real weight is 250
    const q = calcQuote([pick('fridge-lg')], { landfill: 'north' }, S)
    expect(q.estLbs).toBe(250)
    expect(q.dump).toBeCloseTo(29) // ≤500 lb tier + weigh
  })
  it('a heavy small load prices by weight, not volume', () => {
    // 1 CY of concrete = 2,400 lb → over-1,000 tier at $83/ton
    const q = calcQuote([pick('concrete')], { landfill: 'north' }, S)
    expect(q.estLbs).toBe(2400)
    expect(q.dump).toBeCloseTo((2400 / 2000) * 83 + 5)
  })
  it('flags overweight loads for a single-axle trailer', () => {
    const q = calcQuote([pick('concrete', 2)], { landfill: 'north' }, S)
    expect(q.overweight).toBe(true)
  })
  it('in-district flows through jobParams', () => {
    const out = calcQuote([pick('sofa-lg', 3)], { landfill: 'north' }, S)
    const ind = calcQuote([pick('sofa-lg', 3)], { landfill: 'north', inDistrict: true }, S)
    expect(ind.dump).toBeLessThan(out.dump)
  })
})

describe('itemDisposalFees — per-item facility charges', () => {
  it('North Pointe: mattress $20, freon $15, electronics $10, tires $12 commercial', () => {
    const items = [
      { itemId: 'mattress-queen', qty: 2 }, // 40
      { itemId: 'fridge-lg', qty: 1 },      // 15
      { itemId: 'tv-lg', qty: 1 },          // 10
      { itemId: 'tire-no-rim', qty: 1 },    // 12
      { itemId: 'sofa-lg', qty: 1 },        // 0
    ]
    expect(itemDisposalFees(items, 'north')).toBe(77)
  })
  it('no facility selected → no per-item fees', () => {
    expect(itemDisposalFees([{ itemId: 'fridge-lg', qty: 3 }], null)).toBe(0)
  })
})

describe('NP member cities', () => {
  it.each(['Orem', 'lehi', ' Pleasant Grove ', 'SARATOGA SPRINGS'])('%s is a member', (c) => {
    expect(isNpMemberCity(c)).toBe(true)
  })
  it.each(['Provo', 'Eagle Mountain', ''])('%s is not', (c) => {
    expect(isNpMemberCity(c)).toBe(false)
  })
})

describe('landfillFor — city → facility', () => {
  it.each([
    ['Lehi', 'north'], ['Saratoga Springs', 'north'], ['American Fork', 'north'],
    ['Orem', 'north'], ['Highland', 'north'], ['Eagle Mountain', 'north'],
  ])('%s → north', (city, want) => expect(landfillFor(city)).toBe(want))
  it.each([
    ['Provo', 'south'], ['Spanish Fork', 'south'], ['Springville', 'south'],
    ['Mapleton', 'south'], ['Payson', 'south'],
  ])('%s → south', (city, want) => expect(landfillFor(city)).toBe(want))
  it('is case/whitespace tolerant and defaults to north', () => {
    expect(landfillFor('  PROVO ')).toBe('south')
    expect(landfillFor('')).toBe('north')
    expect(landfillFor('Somewhere Else')).toBe('north')
  })
})
