// Heightmap load packer for the 3D trailer — packs the way a real crew
// loads: heavy stuff forward (toward the tongue), nose-to-tail along the
// walls for leaned items, side-by-side rows on the floor, and when the
// floor is gone the load stacks UPWARD on top of other items. Nothing is
// ever placed outside the walls. Pure + unit-tested. Units are FEET.
//
// Conventions:
//   z axis = trailer length (+z is the FRONT / tongue end, -z is the gate)
//   x axis = trailer width
//   placement.pl / pw / ph = the box the item occupies as placed
//     (pl along z, pw along x); placement.l/w/h stay the MODEL's dims.
//   rotY: 0 = item length runs along the trailer; PI/2 = turned sideways.
//   flat: an edge item (mattress/drywall) laid down on top of the load.

const RES = 0.25      // heightmap resolution
const GAP = 0.06      // breathing room between items
const MAX_LOAD_H = 7.5 // don't stack a load taller than this

function makeGrid(L, W) {
  const nx = Math.round(W / RES)
  const nz = Math.round(L / RES)
  return { h: new Float32Array(nx * nz), nx, nz, L, W }
}

const idx = (g, ix, iz) => iz * g.nx + ix

function cellsFor(g, x0, z0, w, l) {
  // x0/z0 = min corner in trailer coords (x ∈ [-W/2, W/2], z ∈ [-L/2, L/2])
  const ix0 = Math.max(0, Math.floor((x0 + g.W / 2) / RES))
  const iz0 = Math.max(0, Math.floor((z0 + g.L / 2) / RES))
  const ix1 = Math.min(g.nx - 1, Math.ceil((x0 + w + g.W / 2) / RES) - 1)
  const iz1 = Math.min(g.nz - 1, Math.ceil((z0 + l + g.L / 2) / RES) - 1)
  return { ix0, iz0, ix1, iz1 }
}

function baseHeight(g, x0, z0, w, l) {
  const { ix0, iz0, ix1, iz1 } = cellsFor(g, x0, z0, w, l)
  let max = 0
  for (let iz = iz0; iz <= iz1; iz++)
    for (let ix = ix0; ix <= ix1; ix++) max = Math.max(max, g.h[idx(g, ix, iz)])
  return max
}

function supportFraction(g, x0, z0, w, l, base) {
  if (base <= 0.01) return 1
  const { ix0, iz0, ix1, iz1 } = cellsFor(g, x0, z0, w, l)
  let total = 0
  let solid = 0
  for (let iz = iz0; iz <= iz1; iz++)
    for (let ix = ix0; ix <= ix1; ix++) {
      total++
      if (g.h[idx(g, ix, iz)] >= base - 0.35) solid++
    }
  return total ? solid / total : 0
}

function occupy(g, x0, z0, w, l, top) {
  const { ix0, iz0, ix1, iz1 } = cellsFor(g, x0 - GAP, z0 - GAP, w + GAP * 2, l + GAP * 2)
  for (let iz = iz0; iz <= iz1; iz++)
    for (let ix = ix0; ix <= ix1; ix++) {
      const i = idx(g, ix, iz)
      if (top > g.h[i]) g.h[i] = top
    }
}

/**
 * Find the best spot for a footprint (pw across × pl along), scanning
 * front (+z) to back, wall-to-wall. Returns the lowest spot, preferring
 * the front-most, wall-hugging position at that height — or null.
 */
function findSpot(g, pw, pl, h, { allowStack, minSupport = 0.6 }) {
  if (pw > g.W - 0.02 || pl > g.L - 0.02) return null
  const xMax = g.W / 2 - pw
  const zMax = g.L / 2 - pl
  let best = null
  for (let z0 = zMax; z0 >= -g.L / 2; z0 -= RES) {
    for (let x0 = -g.W / 2; x0 <= xMax + 0.001; x0 += RES) {
      const base = baseHeight(g, x0, z0, pw, pl)
      if (base > 0.01 && !allowStack) continue
      if (base + h > MAX_LOAD_H) continue
      if (base > 0.01 && supportFraction(g, x0, z0, pw, pl, base) < minSupport) continue
      if (!best || base < best.base - 0.01) {
        best = { x0, z0, base }
        if (base <= 0.01) return best // floor + front-most + leftmost: take it
      }
    }
  }
  return best
}

/**
 * @param units from unitsForItems()
 * @param trailer { L, W }
 * @returns placements: { ...unit, x, y, z, rotY, lean, flat, pl, pw, ph }
 *   x/z = center, y = bottom of the item as placed.
 */
export function packTrailer(units, trailer = { L: 16, W: 6 }) {
  const { L, W } = trailer
  const g = makeGrid(L, W)
  const placed = []

  const put = (u, x0, z0, base, { pl, pw, ph, rotY = 0, lean = 0, flat = false }) => {
    placed.push({
      ...u,
      x: x0 + pw / 2,
      y: base,
      z: z0 + pl / 2,
      rotY, lean, flat, pl, pw, ph,
    })
    occupy(g, x0, z0, pw, pl, base + ph)
  }

  // ---------- 1. edge items lean on the walls, nose to tail, front first ----------
  const edges = units.filter((u) => u.edge).sort((a, b) => b.l * b.h - a.l * a.h)
  const wallCursor = { left: L / 2 - 0.1, right: L / 2 - 0.1 } // z of next item's FRONT edge
  const laterFlat = []
  for (const u of edges) {
    const side = wallCursor.left >= wallCursor.right ? 'left' : 'right'
    const other = side === 'left' ? 'right' : 'left'
    const fits = (s) => wallCursor[s] - u.l >= -L / 2 + 0.35 // stay clear of the gate
    const chosen = fits(side) ? side : fits(other) ? other : null
    if (!chosen) { laterFlat.push(u); continue }
    const sign = chosen === 'left' ? -1 : 1
    const x0 = chosen === 'left' ? -W / 2 + 0.04 : W / 2 - 0.04 - u.w
    const z0 = wallCursor[chosen] - u.l
    put(u, x0, z0, 0, { pl: u.l, pw: u.w, ph: u.h, rotY: 0, lean: sign * 0.06 })
    wallCursor[chosen] = z0 - GAP
  }

  // ---------- 2. floor items: biggest first, front first, side by side ----------
  const floor = units.filter((u) => !u.edge && !u.stackable).sort((a, b) => b.l * b.w * b.h - a.l * a.w * a.h)
  const overflowStack = []
  for (const u of floor) {
    // orientation A: length along the trailer (how a crew naturally loads);
    // orientation B: turned sideways — only if it still fits between walls.
    const orients = [{ pl: u.l, pw: u.w, rotY: 0 }]
    if (!u.noRotate && u.l <= W - 0.1 && Math.abs(u.l - u.w) > 0.05) orients.push({ pl: u.w, pw: u.l, rotY: Math.PI / 2 })
    let done = false
    for (const o of orients) {
      const spot = findSpot(g, o.pw, o.pl, u.h, { allowStack: false })
      if (spot) {
        put(u, spot.x0, spot.z0, spot.base, { ...o, ph: u.h })
        done = true
        break
      }
    }
    if (!done) overflowStack.push(u)
  }

  // ---------- 3. edge items that lost the wall race lie FLAT on the load ----------
  // A flat mattress/sheet is rigid enough to BRIDGE across the load, so the
  // support requirement is loose — exactly like throwing one on top.
  for (const u of laterFlat) {
    const o = { pl: u.l, pw: Math.min(u.h, W - 0.1), ph: u.w }
    const spot = findSpot(g, o.pw, o.pl, o.ph, { allowStack: true, minSupport: 0.2 })
    if (spot) put(u, spot.x0, spot.z0, spot.base, { ...o, rotY: 0, flat: true })
    else overflowStack.push({ ...u, flatWanted: true })
  }

  // ---------- 4. smalls: stack on the load or tuck into floor gaps ----------
  const smalls = units.filter((u) => !u.edge && u.stackable).sort((a, b) => b.l * b.w - a.l * a.w)
  for (const u of smalls) {
    const orients = [{ pl: u.l, pw: u.w, rotY: 0 }]
    if (!u.noRotate && Math.abs(u.l - u.w) > 0.05) orients.push({ pl: u.w, pw: u.l, rotY: Math.PI / 2 })
    let done = false
    for (const o of orients) { // floor gaps first — tuck things into corners
      const spot = findSpot(g, o.pw, o.pl, u.h, { allowStack: false })
      if (spot) { put(u, spot.x0, spot.z0, spot.base, { ...o, ph: u.h }); done = true; break }
    }
    if (!done) {
      for (const o of orients) {
        const spot = findSpot(g, o.pw, o.pl, u.h, { allowStack: true, minSupport: 0.55 })
        if (spot) { put(u, spot.x0, spot.z0, spot.base, { ...o, ph: u.h }); done = true; break }
      }
    }
    if (!done) overflowStack.push(u)
  }

  // ---------- 5. trailer floor is gone: big leftovers ride on top of the load ----------
  for (const u of overflowStack) {
    const flat = u.flatWanted
    const orients = flat
      ? [{ pl: u.l, pw: Math.min(u.h, W - 0.1), ph: u.w, flat: true }]
      : [{ pl: u.l, pw: u.w, ph: u.h, rotY: 0 }]
    if (!flat && !u.noRotate && u.l <= W - 0.1) orients.push({ pl: u.w, pw: u.l, ph: u.h, rotY: Math.PI / 2 })
    let done = false
    for (const o of orients) {
      const spot = findSpot(g, o.pw, o.pl, o.ph, { allowStack: true, minSupport: 0.4 })
      if (spot) { put(u, spot.x0, spot.z0, spot.base, o); done = true; break }
    }
    if (!done) {
      // absolute last resort: center it on the highest point of the load —
      // still INSIDE the walls, exactly like the one box that rides on top.
      // flat-wanted items (mattresses) stay lying down, never stood up.
      const dims = flat
        ? { pl: Math.min(u.l, L - 0.2), pw: Math.min(u.h, W - 0.2), ph: u.w, flat: true }
        : { pl: Math.min(u.l, L - 0.2), pw: Math.min(u.w, W - 0.2), ph: u.h, rotY: 0 }
      const x0 = -dims.pw / 2
      const z0 = -dims.pl / 2
      const base = Math.min(baseHeight(g, x0, z0, dims.pw, dims.pl), MAX_LOAD_H)
      put(u, x0, z0, base, dims)
    }
  }

  return placed
}
