import { describe, it, expect } from 'vitest'
import { dumpFee, calcQuote, itemDisposalFees, DEFAULT_SETTINGS } from './pricing'
import { landfillFor } from './planner'

const S = DEFAULT_SETTINGS // LBS_PER_CY = 150
const cyFor = (lbs) => lbs / S.LBS_PER_CY

describe('dumpFee — North Pointe (matches the doc estimator)', () => {
  it('small load ~500 lbs = $24 flat + $5 weigh = $29', () => {
    expect(dumpFee(cyFor(500), 'north', S)).toBeCloseTo(29)
  })
  it('501–1,000 lbs = $48 flat + $5 weigh = $53', () => {
    expect(dumpFee(cyFor(750), 'north', S)).toBeCloseTo(53)
  })
  it('medium ~1,500 lbs = $62.25 + $5 = $67.25', () => {
    expect(dumpFee(cyFor(1500), 'north', S)).toBeCloseTo(67.25)
  })
  it('full ~2,000 lbs = $83 + $5 = $88', () => {
    expect(dumpFee(cyFor(2000), 'north', S)).toBeCloseTo(88)
  })
})

describe('dumpFee — South Utah Valley', () => {
  it('commercial by weight at $45/ton', () => {
    expect(dumpFee(cyFor(1500), 'south', S)).toBeCloseTo(33.75)
  })
  it('has a $12 floor for tiny loads', () => {
    expect(dumpFee(cyFor(100), 'south', S)).toBe(12)
  })
})

describe('dumpFee — legacy fallback (no facility)', () => {
  it('uses DUMP_RATE_PER_TON', () => {
    expect(dumpFee(cyFor(1500), null, S)).toBeCloseTo(27)
  })
})

describe('calcQuote uses the selected landfill', () => {
  it('south is cheaper than north on the same load', () => {
    const items = [{ cy: 10, qty: 1, surcharge: 0 }] // 1,500 lbs
    const north = calcQuote(items, { landfill: 'north' }, S)
    const south = calcQuote(items, { landfill: 'south' }, S)
    expect(north.dump).toBeCloseTo(67.25)
    expect(south.dump).toBeCloseTo(33.75)
    expect(south.profit).toBeGreaterThan(north.profit)
  })
})

describe('itemDisposalFees — per-item facility charges', () => {
  it('North Pointe: mattress $20, freon $15, electronics $10', () => {
    const items = [
      { itemId: 'mattress-queen', qty: 2 }, // 40
      { itemId: 'fridge-lg', qty: 1 },      // 15
      { itemId: 'tv-lg', qty: 1 },          // 10
      { itemId: 'sofa-lg', qty: 1 },        // 0 — no facility fee
    ]
    expect(itemDisposalFees(items, 'north')).toBe(65)
  })
  it('South Valley: no mattress fee, cheaper electronics/freon/tires', () => {
    const items = [
      { itemId: 'mattress-queen', qty: 2 }, // 0
      { itemId: 'fridge-lg', qty: 1 },      // 10
      { itemId: 'tv-lg', qty: 1 },          // 12
      { itemId: 'tire-no-rim', qty: 2 },    // 4
    ]
    expect(itemDisposalFees(items, 'south')).toBe(26)
  })
  it('no facility selected → no per-item fees', () => {
    expect(itemDisposalFees([{ itemId: 'fridge-lg', qty: 3 }], null)).toBe(0)
  })
  it('calcQuote folds disposal into cost', () => {
    const items = [{ itemId: 'fridge-lg', cy: 1.75, qty: 1, surcharge: 35 }]
    const withFee = calcQuote(items, { landfill: 'north' }, S)
    const without = calcQuote(items, { landfill: 'north' }, S)
    expect(withFee.disposal).toBe(15)
    expect(withFee.cost).toBeCloseTo(without.labor + without.gas + without.dump + 15)
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
