import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../lib/utils'

/** Eased count-up / odometer value. Returns a live number you can format. */
export function useAnimatedNumber(target, { duration = 900, delay = 0 } = {}) {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)
  const rafRef = useRef(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }
    const from = fromRef.current
    const diff = target - from
    cancelAnimationFrame(rafRef.current)
    startRef.current = 0

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts + delay
      const elapsed = ts - startRef.current
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const t = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + diff * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, delay])

  return value
}
