import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X, MapPin, CloudUpload, CloudCheck } from 'lucide-react'
import { useHaptic } from '../hooks/useHaptic'
import { capturePhoto, photoSrc } from '../lib/photos'

/**
 * Before/After job photo dock. Each shot is timestamped + GPS-tagged on
 * capture and uploads to the cloud automatically in the background.
 * Controlled: parent owns the (normalized) photos array.
 */
export default function PhotoDock({ photos = [], onChange, readOnly = false }) {
  const haptic = useHaptic()
  const inputRef = useRef(null)
  const kindRef = useRef('before')

  const open = (kind) => {
    haptic.light()
    kindRef.current = kind
    inputRef.current?.click()
  }

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    for (const file of files) {
      if (photos.length >= 12) break
      try {
        const photo = await capturePhoto(file, kindRef.current)
        onChange((prev) => [...prev, photo])
      } catch { /* unreadable file — skip */ }
    }
  }

  const groups = [
    { kind: 'before', label: 'Before', list: photos.filter((p) => p.kind !== 'after') },
    { kind: 'after', label: 'After', list: photos.filter((p) => p.kind === 'after') },
  ]

  return (
    <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div>
          <span className="font-display" style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Photos</span>
          <div className="text-3" style={{ fontSize: 11.5 }}>Time + location stamped · backs you up on disputes</div>
        </div>
      </div>

      {!readOnly && (
        <div className="grid grid-cols-2 gap-2" style={{ marginBottom: photos.length ? 12 : 0 }}>
          {groups.map((g) => (
            <motion.button
              key={g.kind}
              whileTap={{ scale: 0.95 }}
              onClick={() => open(g.kind)}
              className="flex items-center justify-center gap-2"
              style={{
                padding: '12px 10px', borderRadius: 12, fontSize: 13.5, fontWeight: 800, minHeight: 48,
                background: g.kind === 'before' ? 'color-mix(in srgb, var(--teal) 16%, transparent)' : 'color-mix(in srgb, var(--ember) 12%, transparent)',
                color: g.kind === 'before' ? 'var(--teal-lt)' : 'var(--ember-lt)',
                border: `1px solid ${g.kind === 'before' ? 'color-mix(in srgb, var(--teal) 45%, transparent)' : 'color-mix(in srgb, var(--ember) 40%, transparent)'}`,
              }}
            >
              <Camera size={16} /> {g.label}
            </motion.button>
          ))}
          <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple onChange={onFiles} style={{ display: 'none' }} />
        </div>
      )}

      {groups.map((g) =>
        g.list.length > 0 ? (
          <div key={g.kind} style={{ marginBottom: 4 }}>
            <span className="micro-label" style={{ display: 'block', marginBottom: 6, fontSize: 8.5, color: g.kind === 'before' ? 'var(--teal-lt)' : 'var(--ember-lt)' }}>
              {g.label} · {g.list.length}
            </span>
            <div className="flex gap-2 flex-wrap" style={{ marginBottom: 8 }}>
              <AnimatePresence>
                {g.list.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 26 }}
                    className="relative"
                    style={{ width: 82, height: 82, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}
                  >
                    <a href={photoSrc(p)} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                      <img src={photoSrc(p)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </a>
                    {/* cloud + gps state */}
                    <div className="absolute flex items-center gap-1" style={{ left: 4, bottom: 4 }}>
                      <span className="flex items-center justify-center" style={{ width: 17, height: 17, borderRadius: 6, background: 'rgba(0,0,0,0.55)' }} title={p.url ? 'Backed up' : 'Waiting to upload'}>
                        {p.url ? <CloudCheck size={11} color="#4ade80" /> : <CloudUpload size={11} color="#e7c14f" />}
                      </span>
                      {p.gps && (
                        <span className="flex items-center justify-center" style={{ width: 17, height: 17, borderRadius: 6, background: 'rgba(0,0,0,0.55)' }} title={`${p.gps.lat}, ${p.gps.lng}`}>
                          <MapPin size={11} color="#5bb5c4" />
                        </span>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => onChange((prev) => prev.filter((x) => x.id !== p.id))}
                        className="absolute flex items-center justify-center"
                        style={{ top: 3, right: 3, width: 22, height: 22, borderRadius: 999, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none' }}
                        aria-label="Delete photo"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ) : null,
      )}
    </div>
  )
}
