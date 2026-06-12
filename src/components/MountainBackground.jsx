import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/utils'
import heroUrl from '../assets/mountains-hero.jpg'

/**
 * Cinematic realistic-mountain hero.
 * A real alpenglow photograph with a slow Ken-Burns drift, pointer parallax,
 * a brand color-grade, atmospheric haze and grain — tuned to read premium
 * behind overlaid UI. Far lighter than a WebGL scene.
 */
export default function MountainBackground({ className = '' }) {
  const wrapRef = useRef(null)
  const frozen = prefersReducedMotion()

  useEffect(() => {
    if (frozen) return
    const el = wrapRef.current
    if (!el) return
    let raf = 0
    let tx = 0, ty = 0, cx = 0, cy = 0

    const onMove = (e) => {
      const w = window.innerWidth || 1
      const h = window.innerHeight || 1
      tx = (e.clientX / w - 0.5) * 2 // -1..1
      ty = (e.clientY / h - 0.5) * 2
    }
    const tick = () => {
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      // parallax on the wrapper; Ken-Burns zoom lives on the inner <img>
      el.style.transform = `translate(${cx * -1.4}%, ${cy * -1.0}%)`
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [frozen])

  return (
    <div className={`mtn-bg ${className}`} style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', background: '#04080f' }}>
      {/* The photograph (wrapper = parallax, img = Ken-Burns zoom) */}
      <div ref={wrapRef} style={{ position: 'absolute', inset: '-4%', willChange: 'transform' }}>
        <img
          src={heroUrl}
          alt=""
          aria-hidden="true"
          className={frozen ? '' : 'mtn-kenburns'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
            transform: 'scale(1.12)',
            willChange: 'transform',
          }}
        />
      </div>

      {/* Brand color-grade: push the pink sky toward navy/teal without killing realism */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,16,30,0.45) 0%, rgba(11,25,41,0.15) 45%, rgba(7,16,30,0.25) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 0%, rgba(42,127,138,0.20), transparent 60%)', mixBlendMode: 'soft-light' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,8,15,0.0) 30%, rgba(4,8,15,0.55) 100%)' }} />

      {/* Drifting atmospheric haze to keep it alive */}
      {!frozen && (
        <div
          className="mtn-haze"
          style={{
            position: 'absolute',
            left: '-20%',
            top: '12%',
            width: '140%',
            height: '40%',
            background: 'radial-gradient(50% 70% at 50% 50%, rgba(200,220,235,0.10), transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}
