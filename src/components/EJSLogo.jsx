import logoUrl from '../assets/logo.svg'

/**
 * Elite Junk Solutions logo.
 * Renders the real brand mark (mountain badge) on a clean white squircle tile
 * so it reads crisply on the dark UI. `custom` (a user-uploaded base64 logo)
 * overrides the default. `withWordmark` adds the company lockup beside it.
 */
export default function EJSLogo({ size = 44, withWordmark = false, custom = null, className = '' }) {
  const src = custom || logoUrl

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: withWordmark ? 11 : 0 }}>
      <span
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          background: 'linear-gradient(160deg, #ffffff 0%, #eef3f7 100%)',
          boxShadow: '0 6px 18px rgba(4,8,15,0.35), inset 0 0 0 1px rgba(42,127,138,0.18)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img
          src={src}
          alt="Elite Junk Solutions"
          style={{ width: '142%', height: '142%', objectFit: 'contain' }}
        />
      </span>

      {withWordmark && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.04 }}>
          <span className="font-display" style={{ fontWeight: 800, fontSize: size * 0.4, color: 'var(--text)' }}>
            Elite Junk
          </span>
          <span className="micro-label" style={{ fontSize: size * 0.17, color: 'var(--teal-lt)' }}>
            Solutions
          </span>
        </span>
      )}
    </span>
  )
}
