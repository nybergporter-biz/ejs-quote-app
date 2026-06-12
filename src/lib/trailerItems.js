// Real-world dimensions (FEET) + 3D model assignment for every library item.
// ft: [length-along-trailer, width-across, height] as the item is actually
// loaded — mattresses/drywall/TVs ride on edge against a wall (edge: true),
// so their loaded footprint is thin and tall, just like a real crew packs.
// stackBase: flat-topped items others can sit on. stackable: light items
// that may ride on top. noRotate: keep orientation (long items).

export const ITEM_3D = {
  // ---- FURNITURE ----
  'sofa-lg':        { model: 'sofa',        ft: [7.0, 2.9, 2.7] },
  'sofa-sm':        { model: 'sofa',        ft: [6.0, 2.8, 2.6] },
  'loveseat':       { model: 'sofa',        ft: [5.0, 2.8, 2.6] },
  'sectional':      { model: 'sofa',        ft: [3.5, 2.9, 2.6] },
  'recliner':       { model: 'recliner',    ft: [3.0, 3.0, 3.3] },
  'coffee-table':   { model: 'table',       ft: [4.0, 2.0, 1.5], stackBase: true },
  'dining-table':   { model: 'table',       ft: [6.0, 3.3, 2.5], stackBase: true },
  'dining-chair':   { model: 'chair',       ft: [1.6, 1.8, 3.0], stackable: true },
  'dresser-lg':     { model: 'dresser',     ft: [5.0, 1.8, 3.0], stackBase: true },
  'dresser-sm':     { model: 'dresser',     ft: [3.5, 1.7, 2.6], stackBase: true },
  'bookshelf':      { model: 'bookshelf',   ft: [2.8, 1.1, 5.8] },
  'desk':           { model: 'desk',        ft: [5.0, 2.5, 2.5], stackBase: true },
  'bed-king':       { model: 'bedframe',    ft: [6.6, 1.4, 4.0], edge: true },
  'bed-queen':      { model: 'bedframe',    ft: [6.6, 1.2, 3.4], edge: true },
  'bed-twin':       { model: 'bedframe',    ft: [6.3, 1.0, 2.8], edge: true },
  'nightstand':     { model: 'dresser',     ft: [1.9, 1.6, 2.1], stackable: true, stackBase: true },
  'wardrobe':       { model: 'wardrobe',    ft: [4.0, 2.0, 6.2] },
  'filing-cabinet': { model: 'filing',      ft: [1.4, 2.1, 4.3] },
  'office-chair':   { model: 'officechair', ft: [2.2, 2.2, 3.5] },
  'tv-stand':       { model: 'tvstand',     ft: [5.0, 1.5, 1.8], stackBase: true },
  // ---- MATTRESSES (ride on edge along the wall) ----
  'mattress-king':  { model: 'mattress',    ft: [6.7, 1.1, 6.3], edge: true },
  'mattress-queen': { model: 'mattress',    ft: [6.7, 1.0, 5.0], edge: true },
  'mattress-full':  { model: 'mattress',    ft: [6.3, 0.9, 4.5], edge: true },
  'mattress-twin':  { model: 'mattress',    ft: [6.3, 0.8, 3.2], edge: true },
  'boxspring-king': { model: 'boxspring',   ft: [6.7, 0.9, 6.3], edge: true },
  'boxspring-queen':{ model: 'boxspring',   ft: [6.7, 0.8, 5.0], edge: true },
  'boxspring-twin': { model: 'boxspring',   ft: [6.3, 0.7, 3.2], edge: true },
  // ---- APPLIANCES ----
  'fridge-lg':      { model: 'fridge',      ft: [3.0, 2.8, 5.8] },
  'fridge-sm':      { model: 'fridge',      ft: [2.0, 2.0, 3.2], stackBase: true },
  'freezer':        { model: 'chestfreezer',ft: [4.0, 2.4, 2.9], stackBase: true },
  'washer':         { model: 'washer',      ft: [2.3, 2.3, 3.2], stackBase: true },
  'dryer':          { model: 'dryer',       ft: [2.3, 2.3, 3.2], stackBase: true },
  'stove':          { model: 'stove',       ft: [2.5, 2.2, 3.0], stackBase: true },
  'dishwasher':     { model: 'dishwasher',  ft: [2.0, 2.1, 2.9], stackBase: true },
  'microwave':      { model: 'microwave',   ft: [1.7, 1.3, 1.0], stackable: true },
  'water-heater':   { model: 'waterheater', ft: [1.9, 1.9, 4.6], noRotate: true },
  'ac-window':      { model: 'acunit',      ft: [2.0, 1.7, 1.3], stackable: true },
  'ac-portable':    { model: 'acportable',  ft: [1.5, 1.4, 2.7] },
  // ---- ELECTRONICS (panels lean on edge) ----
  'tv-sm':          { model: 'tv',          ft: [2.2, 0.5, 1.5], edge: true, stackable: true },
  'tv-lg':          { model: 'tv',          ft: [4.2, 0.6, 2.4], edge: true },
  'monitor':        { model: 'monitor',     ft: [1.8, 0.7, 1.4], stackable: true },
  'computer':       { model: 'tower',       ft: [0.8, 1.6, 1.4], stackable: true },
  'printer':        { model: 'printer',     ft: [1.6, 1.4, 1.0], stackable: true },
  // ---- OUTDOOR ----
  'mower-push':     { model: 'pushmower',   ft: [4.6, 1.9, 3.3], noRotate: true },
  'mower-riding':   { model: 'ridingmower', ft: [6.0, 3.1, 3.6], noRotate: true },
  'bicycle':        { model: 'bicycle',     ft: [5.7, 0.8, 3.4], edge: true },
  'tire-no-rim':    { model: 'tire',        ft: [2.2, 2.2, 0.7], stackable: true, stackBase: true },
  'tire-with-rim':  { model: 'tirerim',     ft: [2.3, 2.3, 0.8], stackable: true, stackBase: true },
  'grill':          { model: 'grill',       ft: [4.0, 2.0, 3.8], noRotate: true },
  'patio-chair':    { model: 'patiochair',  ft: [2.2, 2.3, 3.0], stackable: true },
  'patio-table':    { model: 'patiotable',  ft: [3.6, 3.6, 2.4] },
  'hot-tub':        { model: 'hottub',      ft: [7.0, 2.9, 6.8], edge: true, noRotate: true },
  'trampoline':     { model: 'trampoline',  ft: [6.5, 3.0, 1.6], stackBase: true },
  'swing-set':      { model: 'lumber',      ft: [8.0, 2.0, 1.9], noRotate: true, stackBase: true },
  'shed-sm':        { model: 'panelstack',  ft: [8.0, 4.0, 1.6], noRotate: true, stackBase: true },
  // ---- CONSTRUCTION ----
  'drywall':        { model: 'drywall',     ft: [8.0, 0.35, 4.0], edge: true, noRotate: true },
  'lumber':         { model: 'lumber',      ft: [8.0, 1.6, 1.1], noRotate: true, stackBase: true },
  'carpet-room':    { model: 'carpetroll',  ft: [7.5, 1.2, 1.2], noRotate: true, stackable: true },
  'concrete':       { model: 'rubble',      ft: [3.2, 3.2, 1.5], stackBase: true },
  // ---- MISC ----
  'piano-upright':  { model: 'pianoupright',ft: [5.0, 2.3, 4.0], noRotate: true },
  'piano-grand':    { model: 'pianogrand',  ft: [6.5, 2.6, 4.8], edge: true, noRotate: true },
  'safe':           { model: 'safe',        ft: [1.6, 1.6, 2.1], stackBase: true },
  'treadmill':      { model: 'treadmill',   ft: [3.1, 3.0, 4.6], noRotate: true },
  'weight-bench':   { model: 'weightbench', ft: [4.0, 2.0, 3.9] },
  'boxes-sm':       { model: 'box',         ft: [1.3, 1.3, 1.3], stackable: true, stackBase: true },
  'boxes-lg':       { model: 'box',         ft: [2.0, 2.0, 2.0], stackable: true, stackBase: true },
  'garbage-bags':   { model: 'bag',         ft: [1.9, 1.9, 1.7], stackable: true },
  'misc-sm':        { model: 'tarp',        ft: [2.6, 2.6, 1.5], stackable: true, stackBase: true },
  'misc-lg':        { model: 'tarp',        ft: [4.0, 3.4, 2.1], stackBase: true },
}

/** Custom user items fall back to a tarped pile sized from their CY. */
export function dimsFor(itemId, cy = 1) {
  const known = ITEM_3D[itemId]
  if (known) return known
  const side = Math.cbrt((cy || 1) * 27) // CY → ft³ → cube-ish lump
  return { model: 'tarp', ft: [side * 1.25, side * 1.1, side * 0.7], stackBase: true }
}

/** Expand quote line items into individual placeable units. */
export function unitsForItems(items, maxUnits = 80) {
  const units = []
  for (const it of items || []) {
    const spec = dimsFor(it.itemId || it.id, it.cy)
    for (let i = 0; i < (it.qty || 1); i++) {
      if (units.length >= maxUnits) return units
      units.push({
        key: `${it.itemId || it.id}-${i}`,
        itemId: it.itemId || it.id,
        seq: i,
        model: spec.model,
        l: spec.ft[0],
        w: spec.ft[1],
        h: spec.ft[2],
        edge: !!spec.edge,
        stackable: !!spec.stackable,
        stackBase: !!spec.stackBase,
        noRotate: !!spec.noRotate,
      })
    }
  }
  return units
}
