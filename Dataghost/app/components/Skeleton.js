'use client'
export function SkeletonCard({ darkMode, height = '80px' }) {
  const bg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'
  const shine = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  return (
    <div style={{ background: bg, borderRadius: '14px', height, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent 0%, ${shine} 50%, transparent 100%)`, animation: 'shimmer 1.5s infinite' }} />
      <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
    </div>
  )
}

export function SkeletonText({ darkMode, width = '100%', height = '12px' }) {
  const bg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const shine = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
  return (
    <div style={{ background: bg, borderRadius: '6px', height, width, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, transparent 0%, ${shine} 50%, transparent 100%)`, animation: 'shimmer 1.5s infinite' }} />
    </div>
  )
}

export function DashboardSkeleton({ darkMode }) {
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  return (
    <div>
      {/* KPI Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <SkeletonText darkMode={darkMode} width="60%" height="14px" />
              <SkeletonCard darkMode={darkMode} height="36px" />
            </div>
            <SkeletonText darkMode={darkMode} width="40%" height="32px" />
            <div style={{ marginTop: '0.5rem' }}><SkeletonText darkMode={darkMode} width="70%" height="12px" /></div>
          </div>
        ))}
      </div>
      {/* Charts Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
          <SkeletonText darkMode={darkMode} width="40%" height="18px" />
          <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}><SkeletonText darkMode={darkMode} width="60%" height="12px" /></div>
          <SkeletonCard darkMode={darkMode} height="220px" />
        </div>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
          <SkeletonText darkMode={darkMode} width="60%" height="18px" />
          <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}><SkeletonText darkMode={darkMode} width="80%" height="12px" /></div>
          <SkeletonCard darkMode={darkMode} height="220px" />
        </div>
      </div>
      {/* Table Skeleton */}
      <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
        <SkeletonText darkMode={darkMode} width="30%" height="18px" />
        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr 1fr', gap: '1rem', alignItems: 'center' }}>
              <SkeletonText darkMode={darkMode} width="70%" height="14px" />
              <SkeletonText darkMode={darkMode} width="50%" height="14px" />
              <SkeletonText darkMode={darkMode} width="80%" height="8px" />
              <SkeletonText darkMode={darkMode} width="60%" height="14px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}