import { motion } from 'framer-motion'

/**
 * Illustrated empty state: an inline-SVG scene (trailer on a road under
 * mountains) + an encouraging message. `art` picks the variant.
 */
const ART = {
  truck: TruckArt,
  calendar: CalendarArt,
  customers: CustomersArt,
}

export default function EmptyState({ art = 'truck', title, message, actionLabel, onAction }) {
  const Art = ART[art] || TruckArt
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="surface flex flex-col items-center text-center"
      style={{ borderRadius: 18, padding: '30px 20px' }}
    >
      <Art />
      <div className="font-display" style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', marginTop: 14 }}>
        {title}
      </div>
      {message && (
        <p className="text-2" style={{ fontSize: 13.5, marginTop: 5, maxWidth: 260, lineHeight: 1.5 }}>
          {message}
        </p>
      )}
      {actionLabel && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onAction}
          style={{
            marginTop: 16, padding: '11px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--teal), var(--teal-lt))',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}
        >
          {actionLabel}
        </motion.button>
      )}
    </motion.div>
  )
}

function TruckArt() {
  return (
    <svg width="150" height="92" viewBox="0 0 150 92" fill="none" aria-hidden="true">
      <path d="M8 62 L40 24 L64 50 L82 30 L122 62 Z" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M36 29 L40 24 L45 30 L40 34 Z" fill="var(--teal-lt)" opacity="0.7" />
      <line x1="4" y1="74" x2="146" y2="74" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="74" x2="34" y2="74" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 8" />
      <rect x="92" y="52" width="40" height="16" rx="2.5" fill="var(--surface2)" stroke="var(--teal)" strokeWidth="1.5" />
      <line x1="98" y1="52" x2="98" y2="68" stroke="var(--teal)" strokeWidth="1.2" opacity="0.5" />
      <line x1="106" y1="52" x2="106" y2="68" stroke="var(--teal)" strokeWidth="1.2" opacity="0.5" />
      <line x1="114" y1="52" x2="114" y2="68" stroke="var(--teal)" strokeWidth="1.2" opacity="0.5" />
      <line x1="122" y1="52" x2="122" y2="68" stroke="var(--teal)" strokeWidth="1.2" opacity="0.5" />
      <path d="M132 68 L142 68 L138 62 L132 62 Z" fill="var(--surface2)" stroke="var(--teal)" strokeWidth="1.5" />
      <circle cx="104" cy="72" r="5.5" fill="var(--bg)" stroke="var(--text3)" strokeWidth="2" />
      <circle cx="104" cy="72" r="1.8" fill="var(--teal-lt)" />
    </svg>
  )
}

function CalendarArt() {
  return (
    <svg width="120" height="92" viewBox="0 0 120 92" fill="none" aria-hidden="true">
      <rect x="22" y="14" width="76" height="66" rx="10" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="22" y="14" width="76" height="18" rx="9" fill="var(--teal)" opacity="0.28" />
      <line x1="38" y1="8" x2="38" y2="22" stroke="var(--teal-lt)" strokeWidth="3" strokeLinecap="round" />
      <line x1="82" y1="8" x2="82" y2="22" stroke="var(--teal-lt)" strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={32 + c * 15} y={40 + r * 13} width="10" height="8" rx="2.5"
            fill={r === 1 && c === 1 ? 'var(--ember)' : 'var(--border)'} opacity={r === 1 && c === 1 ? 0.9 : 0.8} />
        )),
      )}
    </svg>
  )
}

function CustomersArt() {
  return (
    <svg width="120" height="92" viewBox="0 0 120 92" fill="none" aria-hidden="true">
      <circle cx="46" cy="34" r="13" fill="var(--surface2)" stroke="var(--teal)" strokeWidth="1.5" />
      <path d="M24 76 C24 60 33 52 46 52 C59 52 68 60 68 76" fill="var(--surface2)" stroke="var(--teal)" strokeWidth="1.5" />
      <circle cx="80" cy="38" r="10" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M64 76 C64 63 71 56 80 56 C89 56 96 63 96 76" fill="var(--surface2)" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="92" cy="24" r="9" fill="var(--teal)" opacity="0.22" />
      <path d="M88 24 L91 27 L97 21" stroke="var(--teal-lt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}
