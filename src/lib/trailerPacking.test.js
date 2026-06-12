import { describe, it, expect } from 'vitest'
import { packTrailer } from './trailerPacking'
import { unitsForItems, dimsFor, ITEM_3D } from './trailerItems'
import { ITEMS } from './itemLibrary'

const TRAILER = { L: 16, W: 6 }

// placed extents come straight from the packer (pl along z, pw across)
const ext = (p) => ({
  x0: p.x - p.pw / 2, x1: p.x + p.pw / 2,
  z0: p.z - p.pl / 2, z1: p.z + p.pl / 2,
  y0: p.y, y1: p.y + p.ph,
})

const insideWalls = (p) => {
  const e = ext(p)
  return e.x0 >= -3.01 && e.x1 <= 3.01 && e.z0 >= -8.01 && e.z1 <= 8.01
}

describe('trailer item registry', () => {
  it('covers every library item with real dimensions', () => {
    for (const item of ITEMS) {
      const spec = ITEM_3D[item.id]
      expect(spec, `missing 3D spec for ${item.id}`).toBeTruthy()
      expect(spec.ft.every((v) => v > 0), `bad dims for ${item.id}`).toBe(true)
      expect(spec.model).toBeTruthy()
    }
  })

  it('no item is wider than the 6ft interior as loaded', () => {
    for (const item of ITEMS) {
      const spec = ITEM_3D[item.id]
      expect(spec.ft[1], `${item.id} too wide to load`).toBeLessThanOrEqual(6)
    }
  })

  it('falls back to a CY-sized tarp pile for custom items', () => {
    const spec = dimsFor('item-custom123', 2)
    expect(spec.model).toBe('tarp')
    expect(spec.ft[0]).toBeGreaterThan(1)
  })
})

describe('packTrailer', () => {
  it('EVERY item stays inside the walls — even on a stupidly big load', () => {
    const units = unitsForItems([
      { itemId: 'sofa-lg', cy: 2.5, qty: 3 },
      { itemId: 'mattress-queen', cy: 1.25, qty: 3 },
      { itemId: 'fridge-lg', cy: 1.75, qty: 2 },
      { itemId: 'washer', cy: 1.25, qty: 2 },
      { itemId: 'dryer', cy: 1.25, qty: 1 },
      { itemId: 'dresser-lg', cy: 2, qty: 2 },
      { itemId: 'boxes-lg', cy: 0.3, qty: 8 },
      { itemId: 'tire-no-rim', cy: 0.5, qty: 4 },
      { itemId: 'hot-tub', cy: 8, qty: 1 },
    ])
    const placed = packTrailer(units, TRAILER)
    expect(placed.length).toBe(units.length) // nothing vanishes
    for (const p of placed) expect(insideWalls(p), `${p.key} escaped the trailer`).toBe(true)
  })

  it('two couches sit side by side at the front, both inside', () => {
    const units = unitsForItems([{ itemId: 'sofa-lg', cy: 2.5, qty: 2 }])
    const [a, b] = packTrailer(units, TRAILER)
    expect(insideWalls(a)).toBe(true)
    expect(insideWalls(b)).toBe(true)
    expect(a.y).toBe(0)
    expect(b.y).toBe(0)
    // same row (z overlap), different lanes (x apart)
    expect(Math.abs(a.z - b.z)).toBeLessThan(1)
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(2.5)
    // both lengthwise along the trailer
    expect(a.rotY).toBe(0)
    expect(b.rotY).toBe(0)
    // loaded toward the front (tongue), not at the gate
    expect(a.z).toBeGreaterThan(0)
  })

  it('never overlaps two items at the same height', () => {
    const units = unitsForItems([
      { itemId: 'sofa-lg', cy: 2.5, qty: 2 },
      { itemId: 'dresser-lg', cy: 2, qty: 2 },
      { itemId: 'washer', cy: 1.25, qty: 2 },
      { itemId: 'tire-no-rim', cy: 0.5, qty: 3 },
      { itemId: 'boxes-sm', cy: 0.15, qty: 4 },
    ])
    const placed = packTrailer(units, TRAILER)
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = ext(placed[i])
        const b = ext(placed[j])
        const xz = a.x0 < b.x1 - 0.05 && a.x1 > b.x0 + 0.05 && a.z0 < b.z1 - 0.05 && a.z1 > b.z0 + 0.05
        const y = a.y0 < b.y1 - 0.05 && a.y1 > b.y0 + 0.05
        expect(xz && y, `${placed[i].key} intersects ${placed[j].key}`).toBe(false)
      }
    }
  })

  it('leans mattresses against a wall, loaded from the front', () => {
    const units = unitsForItems([{ itemId: 'mattress-king', cy: 1.5, qty: 1 }])
    const [p] = packTrailer(units, TRAILER)
    expect(Math.abs(p.x)).toBeGreaterThan(2.3) // hugging a wall
    expect(p.lean).not.toBe(0)
    expect(p.z).toBeGreaterThan(2) // toward the tongue, not the gate
    expect(insideWalls(p)).toBe(true)
  })

  it('lays extra mattresses flat on the load when both walls are full', () => {
    const units = unitsForItems([{ itemId: 'mattress-queen', cy: 1.25, qty: 5 }])
    const placed = packTrailer(units, TRAILER)
    const flat = placed.filter((p) => p.flat)
    expect(flat.length).toBeGreaterThan(0)
    for (const p of placed) expect(insideWalls(p)).toBe(true)
  })

  it('stacks upward INSIDE the trailer when the floor is full', () => {
    const units = unitsForItems([{ itemId: 'sofa-lg', cy: 2.5, qty: 6 }])
    const placed = packTrailer(units, TRAILER)
    expect(placed.length).toBe(6)
    expect(placed.some((p) => p.y > 1)).toBe(true) // second layer exists
    for (const p of placed) {
      expect(insideWalls(p), `${p.key} outside walls`).toBe(true)
      expect(p.y + p.ph).toBeLessThanOrEqual(8.2) // sane stack height
    }
  })

  it('prefers the floor over stacking for boxes when space exists', () => {
    const units = unitsForItems([
      { itemId: 'washer', cy: 1.25, qty: 1 },
      { itemId: 'boxes-sm', cy: 0.15, qty: 1 },
    ])
    const placed = packTrailer(units, TRAILER)
    const box = placed.find((p) => p.itemId === 'boxes-sm')
    expect(box.y).toBe(0) // floor's wide open — box goes on the floor
    expect(insideWalls(box)).toBe(true)
  })

  it('is deterministic', () => {
    const units = unitsForItems([
      { itemId: 'sofa-lg', cy: 2.5, qty: 1 },
      { itemId: 'boxes-lg', cy: 0.3, qty: 3 },
    ])
    expect(packTrailer(units, TRAILER)).toEqual(packTrailer(units, TRAILER))
  })
})
