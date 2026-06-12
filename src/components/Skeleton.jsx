/**
 * Shape-matched skeleton loaders that pulse in brand colors.
 * `Skeleton` is the primitive block; `PageSkeleton` approximates a typical
 * view (header, stat row, list rows) for route-level Suspense fallbacks.
 */
export function Skeleton({ w = '100%', h = 16, r = 10, style = {}, className = '' }) {
  return <div className={`skel ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} />
}

export function PageSkeleton() {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 18px) 16px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
        <Skeleton w={44} h={44} r={13} />
        <div style={{ flex: 1 }}>
          <Skeleton w="55%" h={18} />
          <Skeleton w="34%" h={11} style={{ marginTop: 7 }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5" style={{ marginBottom: 16 }}>
        <Skeleton h={76} r={16} />
        <Skeleton h={76} r={16} />
        <Skeleton h={76} r={16} />
      </div>
      <Skeleton h={54} r={18} style={{ marginBottom: 16 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3" style={{ marginBottom: 11 }}>
          <Skeleton w={42} h={42} r={12} />
          <div style={{ flex: 1 }}>
            <Skeleton w="62%" h={14} />
            <Skeleton w="40%" h={11} style={{ marginTop: 6 }} />
          </div>
          <Skeleton w={56} h={22} r={8} />
        </div>
      ))}
    </div>
  )
}
