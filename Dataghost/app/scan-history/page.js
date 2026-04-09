'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function ScanHistory() {
  const router = useRouter()
  const darkMode = useTheme()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('scan_history').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setScans(data || [])
    setLoading(false)
  }

  async function deleteScan(id) {
    await supabase.from('scan_history').delete().eq('id', id)
    setScans(prev => prev.filter(s => s.id !== id))
  }

  async function clearAll() {
    if (!confirm('Delete all scan history? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('scan_history').delete().eq('user_id', session.user.id)
    setScans([])
  }

  function reRunScan(url) {
    router.push('/site-audit?url=' + encodeURIComponent(url))
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const gradeColor = (g) => !g ? '#6B7280' : (g === 'A+' || g === 'A') ? '#10B981' : g === 'B' ? '#6366F1' : g === 'C' ? '#F59E0B' : '#EF4444'

  const filtered = scans.filter(s => {
    const matchSearch = s.hostname?.toLowerCase().includes(search.toLowerCase()) || s.url?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || s.grade === filter
    return matchSearch && matchFilter
  })

  const avgScore = scans.length > 0 ? Math.round(scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length) : 0
  const topGrade = scans.length > 0 ? (scans.filter(s => s.grade === 'A+' || s.grade === 'A').length > 0 ? 'A' : 'B') : '-'
  const criticalCount = scans.filter(s => s.grade === 'F' || s.grade === 'D').length

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>🕐 Scan History</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>All site security scans. Click a row to see full header details.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => router.push('/site-audit')} style={{ padding: '0.5rem 1rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>+ New Scan</button>
            {scans.length > 0 && <button onClick={clearAll} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer' }}>Clear All</button>}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Scans', value: scans.length, color: '#6366F1' },
            { label: 'Avg Score', value: avgScore + '/100', color: avgScore >= 70 ? '#10B981' : '#F59E0B' },
            { label: 'High Grade (A)', value: scans.filter(s => s.grade === 'A+' || s.grade === 'A').length, color: '#10B981' },
            { label: 'Poor Grade (D/F)', value: criticalCount, color: criticalCount > 0 ? '#EF4444' : '#6B7280' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '12px', padding: '1.25rem', transition: 'background 0.3s' }}>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search domains..."
            style={{ flex: 1, minWidth: '200px', padding: '0.6rem 1rem', background: cardBg, border: '1px solid ' + border, borderRadius: '8px', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none' }}
            onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
          {['All', 'A+', 'A', 'B', 'C', 'D', 'F'].map(g => (
            <button key={g} onClick={() => setFilter(g)}
              style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid ' + (filter === g ? '#10B981' : border), background: filter === g ? 'rgba(16,185,129,0.1)' : 'transparent', color: filter === g ? '#10B981' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: filter === g ? '600' : '400', transition: 'all 0.15s' }}>
              {g}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem' }}>{search ? 'No matching scans' : 'No scans yet'}</p>
            <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{search ? 'Try a different search term' : 'Run your first security scan'}</p>
            {!search && <button onClick={() => router.push('/site-audit')} style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600' }}>Run First Scan</button>}
          </div>
        ) : (
          <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
            {/* Table Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 120px 100px', gap: '0.5rem', padding: '0.75rem 1.25rem', borderBottom: '1px solid ' + border, background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
              {['Domain', 'Grade', 'Headers', 'DNS', 'SSL', 'Scanned', 'Actions'].map((h, i) => (
                <span key={i} style={{ color: textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>{h}</span>
              ))}
            </div>

            {filtered.map((scan, idx) => (
              <div key={scan.id}>
                <div onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 80px 120px 100px', gap: '0.5rem', padding: '0.875rem 1.25rem', borderBottom: idx < filtered.length - 1 ? '1px solid ' + border : 'none', cursor: 'pointer', transition: 'background 0.15s', alignItems: 'center', background: expanded === scan.id ? (darkMode ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.03)') : 'transparent' }}
                  onMouseEnter={e => { if (expanded !== scan.id) e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                  onMouseLeave={e => { if (expanded !== scan.id) e.currentTarget.style.background = 'transparent' }}>

                  <div>
                    <p style={{ margin: 0, color: textMain, fontWeight: '600', fontSize: '0.875rem' }}>{scan.hostname || scan.url}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.url}</p>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: gradeColor(scan.grade) + '20', color: gradeColor(scan.grade), fontWeight: '800', fontSize: '0.85rem' }}>{scan.grade || '?'}</span>
                    {scan.score !== null && <p style={{ margin: '0.2rem 0 0', color: textMuted, fontSize: '0.7rem' }}>{scan.score}/100</p>}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {scan.headers_score !== null ? (
                      <>
                        <p style={{ margin: 0, color: scan.headers_score >= 70 ? '#10B981' : '#EF4444', fontWeight: '600', fontSize: '0.85rem' }}>{scan.headers_score}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem' }}>{scan.headers_pass}✓ {scan.headers_fail}✗</p>
                      </>
                    ) : <span style={{ color: textMuted, fontSize: '0.8rem' }}>—</span>}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {scan.dns_score !== null ? (
                      <p style={{ margin: 0, color: scan.dns_score >= 70 ? '#10B981' : '#F59E0B', fontWeight: '600', fontSize: '0.85rem' }}>{scan.dns_score}</p>
                    ) : <span style={{ color: textMuted, fontSize: '0.8rem' }}>—</span>}
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    {scan.ssl_score !== null ? (
                      <>
                        <p style={{ margin: 0, color: scan.ssl_score >= 70 ? '#10B981' : '#EF4444', fontWeight: '600', fontSize: '0.85rem' }}>{scan.ssl_score}</p>
                        {scan.ssl_valid !== null && <p style={{ margin: 0, color: scan.ssl_valid ? '#10B981' : '#EF4444', fontSize: '0.7rem' }}>{scan.ssl_valid ? '✓ Valid' : '✗ Invalid'}</p>}
                      </>
                    ) : <span style={{ color: textMuted, fontSize: '0.8rem' }}>—</span>}
                  </div>

                  <span style={{ color: textMuted, fontSize: '0.8rem' }}>{new Date(scan.created_at).toLocaleDateString()} {new Date(scan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                  <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push('/site-audit?url=' + encodeURIComponent(scan.url))} title="Re-run scan"
                      style={{ padding: '0.3rem 0.5rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', color: '#6366F1', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}>🔄</button>
                    <button onClick={() => deleteScan(scan.id)} title="Delete"
                      style={{ padding: '0.3rem 0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', transition: 'all 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>🗑️</button>
                  </div>
                </div>

                {/* Expanded row — show header details */}
                {expanded === scan.id && scan.headers_data?.checks && (
                  <div style={{ padding: '1rem 1.25rem 1.5rem', borderBottom: idx < filtered.length - 1 ? '1px solid ' + border : 'none', background: darkMode ? 'rgba(99,102,241,0.03)' : 'rgba(99,102,241,0.02)' }}>
                    <p style={{ margin: '0 0 0.75rem', color: textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>Header Checks from this scan</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {scan.headers_data.checks.map((check, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: check.present ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: '1px solid ' + (check.present ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'), borderRadius: '8px' }}>
                          <span style={{ fontSize: '0.9rem' }}>{check.present ? '✅' : '❌'}</span>
                          <span style={{ color: textMain, fontSize: '0.8rem', fontWeight: '500' }}>{check.name}</span>
                          {check.critical && !check.present && <span style={{ marginLeft: 'auto', color: '#EF4444', fontSize: '0.65rem', fontWeight: '700' }}>CRITICAL</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}
