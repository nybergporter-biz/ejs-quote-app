// Helpers for syncing the app "workspace" (a single JSON blob per user) to Supabase.
// The merge is deterministic + idempotent so two devices always converge:
//   - quotes / customers: union by id, newest (updatedAt||createdAt) wins
//   - settings / business / library / categories: taken from the most-recently-edited side
//   - seq: max

const SYNCED_KEYS = ['settings', 'business', 'library', 'categories', 'quotes', 'customers', 'seq', 'deletedIds', 'team']

const byId = (arr) => {
  const m = new Map()
  for (const it of arr || []) if (it && it.id != null) m.set(it.id, it)
  return m
}
const t = (x) => {
  const v = x?.updatedAt || x?.createdAt
  return v ? new Date(v).getTime() : 0
}

// When a remote quote wins, its photos arrive slim (no base64 — see
// slimSnapshot). Re-hydrate `data` from the local copy by photo id so the
// device that took the photo never loses its offline original.
function rehydratePhotos(winner, loser) {
  if (!Array.isArray(winner?.photos) || !Array.isArray(loser?.photos)) return winner
  const localData = new Map()
  for (const p of loser.photos) if (p && typeof p === 'object' && p.id && p.data) localData.set(p.id, p.data)
  if (!localData.size) return winner
  return {
    ...winner,
    photos: winner.photos.map((p) =>
      p && typeof p === 'object' && p.id && !p.data && localData.has(p.id) ? { ...p, data: localData.get(p.id) } : p,
    ),
  }
}

function unionById(localArr, remoteArr) {
  const out = byId(localArr)
  for (const r of remoteArr || []) {
    if (r?.id == null) continue
    const l = out.get(r.id)
    if (!l || t(r) >= t(l)) out.set(r.id, l ? rehydratePhotos(r, l) : r)
  }
  return [...out.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)))
}

export function buildSnapshot(slices) {
  const deleted = new Set(slices.deletedIds || [])
  const liveQuotes = (slices.quotes || []).filter((q) => !deleted.has(q.id))
  const liveCustomers = (slices.customers || []).filter((c) => !deleted.has(c.id))
  return {
    settings: slices.settings,
    business: slices.business,
    library: slices.library,
    categories: slices.categories,
    quotes: [...liveQuotes].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    customers: [...liveCustomers].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    seq: slices.seq || 0,
    deletedIds: [...deleted].sort(),
    team: slices.team ?? null,
  }
}

/**
 * Per-partner team merge: member config follows the config winner, but each
 * partner's live status keeps whichever side has the newer status.updatedAt —
 * so Porter updating on his phone never clobbers his partner's update.
 */
function mergeTeam(localTeam, remoteTeam, configFrom) {
  if (!localTeam && !remoteTeam) return null
  if (!localTeam) return remoteTeam
  if (!remoteTeam) return localTeam
  const status = {}
  const keys = new Set([...Object.keys(localTeam.status || {}), ...Object.keys(remoteTeam.status || {})])
  for (const k of keys) {
    const l = localTeam.status?.[k]
    const r = remoteTeam.status?.[k]
    if (!l) { status[k] = r; continue }
    if (!r) { status[k] = l; continue }
    status[k] = t({ updatedAt: r.updatedAt }) >= t({ updatedAt: l.updatedAt }) ? r : l
  }
  return { ...((configFrom === remoteTeam ? remoteTeam : localTeam)), status }
}

export function isEmptySnapshot(s) {
  if (!s || typeof s !== 'object') return true
  return SYNCED_KEYS.every((k) => s[k] == null)
}

/**
 * Merge two snapshots. `localTs`/`remoteTs` are the workspace updated_at values
 * used to decide which side's config (settings/business/library/categories) wins.
 */
export function mergeSnapshots(local, remote, localTs = 0, remoteTs = 0) {
  if (isEmptySnapshot(remote)) return buildSnapshot(local)
  if (isEmptySnapshot(local)) return buildSnapshot(remote)

  const configFrom = remoteTs > localTs ? remote : local
  const deleted = new Set([...(local.deletedIds || []), ...(remote.deletedIds || [])])
  const dropDeleted = (arr) => arr.filter((x) => !deleted.has(x.id))
  return {
    settings: configFrom.settings ?? local.settings,
    business: configFrom.business ?? local.business,
    library: configFrom.library ?? local.library,
    categories: configFrom.categories ?? local.categories,
    quotes: dropDeleted(unionById(local.quotes, remote.quotes)),
    customers: dropDeleted(unionById(local.customers, remote.customers)),
    seq: Math.max(local.seq || 0, remote.seq || 0),
    deletedIds: [...deleted].sort(),
    team: mergeTeam(local.team, remote.team, remoteTs > localTs ? remote.team : local.team),
  }
}

/**
 * Strip base64 photo payloads before pushing to the cloud — the workspace
 * blob carries photo metadata + storage URLs only. (Legacy string photos
 * pass through unchanged; they predate this scheme.) Never applied locally.
 */
export function slimSnapshot(snap) {
  if (!snap?.quotes) return snap
  return {
    ...snap,
    quotes: snap.quotes.map((q) => {
      if (!Array.isArray(q.photos) || !q.photos.some((p) => p && typeof p === 'object' && p.data)) return q
      return {
        ...q,
        photos: q.photos.map((p) => {
          if (!p || typeof p !== 'object' || !p.data) return p
          const rest = { ...p }
          delete rest.data
          return rest
        }),
      }
    }),
  }
}

// Stable hash for echo-suppression (skip pushing data we just received).
export function hashSnapshot(s) {
  try {
    return JSON.stringify(s)
  } catch {
    return Math.random().toString()
  }
}

export { SYNCED_KEYS }
