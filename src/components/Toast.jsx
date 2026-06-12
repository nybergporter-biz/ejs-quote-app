import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'

const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx)

const ICONS = {
  success: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (message, { type = 'info', duration = 2600 } = {}) => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, message, type }])
      if (duration) setTimeout(() => dismiss(id), duration)
      return id
    },
    [dismiss],
  )

  const api = {
    show: push,
    success: (m, o) => push(m, { ...o, type: 'success' }),
    warn: (m, o) => push(m, { ...o, type: 'warn' }),
    info: (m, o) => push(m, { ...o, type: 'info' }),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          pointerEvents: 'none',
          padding: '0 16px',
        }}
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info
            const color =
              t.type === 'success' ? '#4ade80' : t.type === 'warn' ? '#f6a13d' : '#5bb5c4'
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="glass"
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 14,
                  maxWidth: 420,
                  width: 'fit-content',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                }}
                onClick={() => dismiss(t.id)}
              >
                <Icon size={18} color={color} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{t.message}</span>
                <X size={15} color="var(--text3)" style={{ marginLeft: 4 }} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}
