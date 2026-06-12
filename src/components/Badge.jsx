import { motion, AnimatePresence } from 'framer-motion'

const STATUS = {
  draft:     { label: 'Draft',     bg: 'rgba(90,112,144,0.18)',  fg: '#94a8be', dot: '#5a7090' },
  sent:      { label: 'Sent',      bg: 'rgba(91,181,196,0.16)',  fg: '#5bb5c4', dot: '#3d9baa' },
  accepted:  { label: 'Accepted',  bg: 'rgba(30,126,52,0.18)',   fg: '#4ade80', dot: '#1e7e34' },
  declined:  { label: 'Declined',  bg: 'rgba(192,57,43,0.16)',   fg: '#f08a7e', dot: '#c0392b' },
  completed: { label: 'Completed', bg: 'rgba(212,160,23,0.16)',  fg: '#e7c14f', dot: '#d4a017' },
}

export default function Badge({ status = 'draft', children, className = '' }) {
  const s = STATUS[status] || STATUS.draft
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
        style={{ background: s.bg, color: s.fg }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
        {children || s.label}
      </motion.span>
    </AnimatePresence>
  )
}
