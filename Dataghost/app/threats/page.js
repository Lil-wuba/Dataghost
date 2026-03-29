'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Threats() {
  const router = useRouter()
  const darkMode = useTheme()
  const [threats, setThreats] = useState([])
  const [filtered, setFiltered] = useState([])
  const [severityFilter, setSeverityFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [unread, setUnread] = useState(0)
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadThreats()
    const channel = supabase.channel('threat-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'threat_feed' }, (payload) => {
        setThreats(prev => [payload.new, ...prev])
        setUnread(prev => prev + 1)
        showToast('🚨 New threat detected!')
      }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    let result = threats
    if (severityFilter !== 'All') result = result.filter(t => t.severity === severityFilter.toLowerCase())
    if (search) result = result.filter(t => t.cve_id?.toLowerCase().includes(search.toLowerCase()) || t.title?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [severityFilter, search, threats])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadThreats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase.from('threat_feed').select('*').order('published_date', { ascending: false })
    if (error) showToast('Error: ' + error.message)
    else { setThreats(data || []); setFiltered(data || []) }
    setLoading(false)
  }

  async function refreshFeed() {
    showToast('🔄 Refreshing feed...')
    await loadThreats()
    showToast('✅ Feed refreshed!')
  }

  const severityConfig = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
    low: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
  }

  const counts = threats.reduce((acc, t) => { acc[t.severity] = (acc[t.severity] || 0) + 1; return acc }, {})

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>
              Threat Intelligence
              {unread > 0 && <span style={{ marginLeft: '0.75rem', background: '#EF4444', color: 'white', borderRadius: '20px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', verticalAlign: 'middle' }}>{unread} new</span>}
            </h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Live CVE feed and threat intelligence data.</p>
          </div>
          <button onClick={refreshFeed} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>🔄 Refresh</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {['critical', 'high', 'medium', 'low'].map(sev => {
            const c = severityConfig[sev]
            return (
              <div key={sev} onClick={() => setSeverityFilter(severityFilter.toLowerCase() === sev ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1))}
                style={{ background: cardBg, border: `1px solid ${severityFilter.toLowerCase() === sev ? c.color : border}`, borderRadius: '12px', padding: '1rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = c.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = severityFilter.toLowerCase() === sev ? c.color : border}
              >
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem', textTransform: 'capitalize' }}>{sev}</p>
                <p style={{ margin: 0, color: c.color, fontSize: '1.75rem', fontWeight: '700' }}>{counts[sev] || 0}</p>
              </div>
            )
          })}
        </div>

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.6rem 1rem', flex: 1, minWidth: '200px' }}>
            <span style={{ color: textMuted }}>🔍</span>
            <input placeholder="Search by CVE ID or title..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
              <button key={f} onClick={() => setSeverityFilter(f)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', background: severityFilter === f ? '#10B981' : cardBg, border: `1px solid ${severityFilter === f ? '#10B981' : border}`, color: severityFilter === f ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}>{f}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: textMuted }}>Loading threats...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {filtered.map(threat => {
              const c = severityConfig[threat.severity] || severityConfig.low
              return (
                <div key={threat.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(16,185,129,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: c.bg, color: c.color, fontFamily: 'monospace' }}>{threat.cve_id || 'N/A'}</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600', background: c.bg, color: c.color }}>{threat.severity?.toUpperCase()}</span>
                  </div>
                  <h3 style={{ color: textMain, margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: '600', lineHeight: 1.4 }}>{threat.title}</h3>
                  <p style={{ color: textMuted, fontSize: '0.8rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{threat.description?.substring(0, 100)}...</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600' }}>CVSS: {threat.cvss_score || 'N/A'}</span>
                    {threat.exploit_available
                      ? <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: '600' }}>🔴 Exploit Available</span>
                      : <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: '600' }}>✅ No Known Exploit</span>
                    }
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ color: textMuted, fontSize: '0.75rem', margin: 0 }}>{threat.published_date ? new Date(threat.published_date).toLocaleDateString() : '-'}</p>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {(threat.affected_products || []).slice(0, 2).map((p, i) => (
                        <span key={i} style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textMuted, padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem' }}>{p}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: textMuted }}>No threats found. Click Refresh to load latest CVEs!</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}