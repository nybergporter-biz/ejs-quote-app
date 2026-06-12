import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatMoney(n, { cents = false } = {}) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  })
}

export function formatCY(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function uid(prefix = 'id') {
  // No Math.random reliance on crypto availability — use crypto when present
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function quoteNumber(seq, date = new Date()) {
  const year = date.getFullYear()
  return `Q-${year}-${String(seq).padStart(3, '0')}`
}

export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return { text: 'Good morning', icon: '☀️' }
  if (h < 17) return { text: 'Good afternoon', icon: '🌤️' }
  return { text: 'Good evening', icon: '🌙' }
}

export function relativeDate(iso) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.round((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // iOS Safari fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

/** Total tracked time on a job in ms (running timer included). */
export function jobElapsedMs(quote, now = Date.now()) {
  const t = quote?.timer
  if (!t) return 0
  const base = t.totalMs || 0
  return t.startedAt ? base + Math.max(0, now - new Date(t.startedAt).getTime()) : base
}

export function formatDuration(ms) {
  if (!ms || ms < 60000) return ms > 0 ? '<1m' : '0m'
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
