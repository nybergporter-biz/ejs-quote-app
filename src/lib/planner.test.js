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
