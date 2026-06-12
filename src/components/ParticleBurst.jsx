import { useMemo } from 'react'

const COLORS = ['#5bb5c4', '#2a7f8a', '#d4a017', '#e8f4f5', '#93d4de', '#223f61']

/**
 * 60 particles bursting from the center of the parent (which must be position:relative).
 * Pure CSS animation driven by custom properties — runs at 60fps on the compositor.
 */
export default function ParticleBurst({ count = 60, fire = true }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * 360 + (i % 3) * 11
      const rad = (angle * Math.PI) / 180
      const dist = 80 + (i % 7) * 18
      const size = 4 + (i % 5) * 1.4
      return {
        x: Math.cos(rad) * dist,
        y: Math.sin(rad) * dist,
        size,
        color: COLORS[i % COLORS.length],
        dur: 0.6 + (i % 6) * 0.1,
        rot: (i % 2 ? 1 : -1) * (180 + (i % 5) * 90),
        delay: (i % 4) * 0.015,
      }
    })
  }, [count])

  if (!fire) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: '50%',
            top: '50%',
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
            '--p-x': `${p.x}px`,
            '--p-y': `${p.y}px`,
            '--p-rot': `${p.rot}deg`,
            '--p-dur': `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
