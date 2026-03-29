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
    if (!confirm('Delete all scan history?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('scan_history').delete().eq('user_id', session.user.id)
    setScans([])
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const gradeColor = (g) => g === 'A+' || g === 'A' ? '#10B981' : g === 'B' ? '#6366F1' : g === 'C' ? '#F59E0B' : '#EF4444'

  const filtered = scans.filter(s => {
    const matchSearch = s.hostname?.toLowerCase().includes(search.toLowerCase()) || s.url?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'All' || s.grade === filter
    return matchSearch && matchFilter
  })

  const avgScore = scans.length > 0 ? Math.round(scans.reduce((a, s) => a + (s.score || 0), 0) / scans.length) : 0

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>📋 Scan History</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>All website security audits you have run.</p>
          </div>
          {scans.length > 0 && (
            <button onClick={clearAll} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>🗑️ Clear All</button>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Scans', value: scans.length, color: '#6366F1' },
            { label: 'Avg Score', value: `${avgScore}/100`, color: avgScore >= 70 ? '#10B981' : '#EF4444' },
            { label: 'A Grade Sites', value: scans.filter(s => s.grade === 'A+' || s.grade === 'A').length, color: '#10B981' },
            { label: 'F Grade Sites', value: scans.filter(s => s.grade === 'F').length, color: '#EF4444' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', transition: 'all 0.25s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border }}
            >
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.5rem 0.875rem', flex: 1, minWidth: '200px', maxWidth: '360px' }}>
            <span style={{ color: textMuted }}>🔍</span>
            <input placeholder="Search by domain..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'A+', 'A', 'B', 'C', 'D', 'F'].map(g => (
              <button key={g} onClick={() => setFilter(g)} style={{ padding: '0.4rem 0.875rem', borderRadius: '20px', border: filter === g ? 'none' : `1px solid ${border}`, background: filter === g ? '#10B981' : 'transparent', color: filter === g ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>{g}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: textMuted }}>Loading scan history...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
              <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem' }}>{search ? 'No results found' : 'No scans yet'}</p>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 1.5rem' }}>{search ? 'Try a different search term' : 'Run your first scan in the Site Auditor!'}</p>
              {!search && <a href="/auditor" style={{ padding: '0.6rem 1.5rem', background: '#10B981', borderRadius: '8px', color: 'white', textDecoration: 'none', fontWeight: '600', fontSize: '0.875rem' }}>🔍 Go to Site Auditor</a>}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Domain', 'Grade', 'Score', 'Headers', 'DNS', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: textMuted, fontSize: '0.75rem', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((scan, i) => (
                  <tr key={scan.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <p style={{ margin: '0 0 0.15rem', color: textMain, fontWeight: '600', fontSize: '0.875rem' }}>{scan.hostname}</p>
                      <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{scan.url}</p>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ fontSize: '1.5rem', fontWeight: '800', color: gradeColor(scan.grade) }}>{scan.grade || '-'}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '60px', height: '6px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${scan.score || 0}%`, background: gradeColor(scan.grade), borderRadius: '3px' }} />
                        </div>
                        <span style={{ color: gradeColor(scan.grade), fontWeight: '700', fontSize: '0.875rem' }}>{scan.score || 0}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10B981', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600' }}>{scan.headers_pass || 0}✓</span>
                        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '0.15rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600' }}>{scan.headers_fail || 0}✗</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ color: (scan.dns_score || 0) >= 70 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '0.875rem' }}>{scan.dns_score || 0}/100</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: textMuted, fontSize: '0.8rem' }}>
                      {new Date(scan.created_at).toLocaleDateString()}<br />
                      <span style={{ fontSize: '0.7rem' }}>{new Date(scan.created_at).toLocaleTimeString()}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <a href={`/auditor?url=${encodeURIComponent(scan.url)}`} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', color: '#10B981', textDecoration: 'none', fontSize: '0.75rem', fontWeight: '600' }}>🔄 Rescan</a>
                        <button onClick={() => deleteScan(scan.id)} style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#EF4444', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}