import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Inbox, ChevronDown, X } from 'lucide-react'
import { leadPhotoUrl, formatPreferred } from '../lib/leads'
import { relativeDate } from '../lib/utils'

/**
 * Everything the customer submitted on the website, pinned inside the quote
 * builder so Porter can reference it while pricing — notes, items, photos
 * (tap to zoom), preferred window. Read-only.
 */
export default function LeadBrief({ lead }) {
  const [open, setOpen] = useState(true)
  const [fullPhoto, setFullPhoto] = useState(null)
  const photos = (lead.photo_urls || []).map(leadPhotoUrl).filter(Boolean)
  const preferred = formatPreferred(lead)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface"
      style={{ borderRadius: 16, marginBottom: 12, borderLeft: '3px solid #ff6b35', overflow: 'hidden' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
        style={{ padding: '12px 14px' }}
      >
        <div className="flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,107,53,0.14)', flexShrink: 0 }}>
          <Inbox size={17} color="#ff8c5a" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#ff8c5a' }}>Their website request</div>
          <div className="text-3" style={{ fontSize: 11.5 }}>
            Submitted {relativeDate(lead.created_at)}{photos.length ? ` · ${photos.length} photo${photos.length > 1 ? 's' : ''}` : ''}
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'flex' }}>
          <ChevronDown size={17} color="var(--text3)" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              <div className="flex flex-wrap gap-1.5">
                {lead.service_type && <Chip>{lead.service_type}</Chip>}
                {lead.volume_estimate && <Chip accent>{lead.volume_estimate}</Chip>}
                {preferred && <Chip>🗓 {preferred}</Chip>}
              </div>

              {lead.items_description && (
                <div style={{ marginTop: 10 }}>
                  <span className="micro-label">What needs to go</span>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5, marginTop: 3 }}>{lead.items_description}</div>
                </div>
              )}

              {lead.notes && (
                <div style={{ marginTop: 10 }}>
                  <span className="micro-label">Their notes</span>
                  <div className="text-2" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 3 }}>{lead.notes}</div>
                </div>
              )}

              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto" style={{ marginTop: 10, scrollbarWidth: 'none', paddingBottom: 2 }}>
                  {photos.map((url, i) => (
                    <button key={i} onClick={() => setFullPhoto(url)} style={{ flexShrink: 0, padding: 0, border: 'none', background: 'none' }} aria-label={`View photo ${i + 1}`}>
                      <img src={url} alt="" loading="lazy" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullPhoto && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setFullPhoto(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(4,8,15,0.94)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          >
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={fullPhoto} alt="Lead photo"
              style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 14, objectFit: 'contain' }}
            />
            <button aria-label="Close photo" style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top) + 14px)', right: 18, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 999, width: 38, height: 38, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Chip({ children, accent }) {
  return (
    <span
      style={{
        fontSize: 11.5, fontWeight: 600, padding: '4px 9px', borderRadius: 999,
        background: accent ? 'rgba(255,107,53,0.12)' : 'var(--surface2)',
        color: accent ? '#ff8c5a' : 'var(--text2)',
        border: `1px solid ${accent ? 'rgba(255,107,53,0.3)' : 'var(--border)'}`,
      }}
    >
      {children}
    </span>
  )
}
