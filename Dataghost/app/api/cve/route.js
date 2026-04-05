'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'
import { supabase } from '@/lib/supabase'

const FALLBACK_CVES = [
  { id: 'CVE-2024-23897', description: 'Jenkins arbitrary file read vulnerability allows unauthenticated attackers to read arbitrary files via the CLI command parser.', severity: 'CRITICAL', score: '9.8', published: '2024-01-24', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-23897' },
  { id: 'CVE-2024-1403',  description: 'OpenEdge Authentication Gateway and AdminServer have an authentication bypass vulnerability allowing unauthenticated remote code execution.', severity: 'CRITICAL', score: '10.0', published: '2024-03-01', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-1403' },
  { id: 'CVE-2024-21762', description: 'Fortinet FortiOS out-of-bounds write in SSL-VPN allows remote unauthenticated attackers to execute arbitrary code.', severity: 'CRITICAL', score: '9.6', published: '2024-02-09', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-21762' },
  { id: 'CVE-2024-6387',  description: 'OpenSSH regreSSHion: race condition in signal handler allows unauthenticated RCE as root on glibc-based Linux systems.', severity: 'HIGH', score: '8.1', published: '2024-07-01', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-6387' },
  { id: 'CVE-2024-4577',  description: 'PHP CGI argument injection on Windows allows remote attackers to execute arbitrary code via crafted URL parameters.', severity: 'CRITICAL', score: '9.8', published: '2024-06-09', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-4577' },
  { id: 'CVE-2024-27198', description: 'TeamCity authentication bypass allows unauthenticated attackers to gain administrative access via REST API endpoints.', severity: 'CRITICAL', score: '9.8', published: '2024-03-04', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-27198' },
  { id: 'CVE-2024-3400',  description: 'PAN-OS command injection in GlobalProtect allows unauthenticated attackers to execute arbitrary OS commands as root.', severity: 'CRITICAL', score: '10.0', published: '2024-04-12', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-3400' },
  { id: 'CVE-2024-20353', description: 'Cisco ASA and FTD denial of service via unauthenticated remote attacker sending crafted HTTP requests to management interface.', severity: 'HIGH', score: '8.6', published: '2024-04-24', url: 'https://nvd.nist.gov/vuln/detail/CVE-2024-20353' },
]

export default function CVEPage() {
  const router = useRouter()
  const darkMode = useTheme()
  const [cves, setCves] = useState(FALLBACK_CVES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('all')
  const [toast, setToast] = useState('')
  const [addingId, setAddingId] = useState(null)
  const [assets, setAssets] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedCve, setSelectedCve] = useState(null)
  const [addForm, setAddForm] = useState({ asset_id: '', severity_override: '' })

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadAssets() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase.from('assets').select('id, name').eq('user_id', session.user.id)
    setAssets(data || [])
  }

  async function fetchCVEs(keyword = 'web application vulnerability') {
    setLoading(true)
    try {
      const res = await fetch(`/api/cve?keyword=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      if (data.cves && data.cves.length > 0) setCves(data.cves)
      else setCves(FALLBACK_CVES)
    } catch {
      setCves(FALLBACK_CVES)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCVEs('critical web application 2024')
    loadAssets()
  }, [])

  async function addAsVulnerability(cve) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setAddingId(cve.id)
    try {
      const severityMap = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }
      const { error } = await supabase.from('vulnerabilities').insert([{
        user_id: session.user.id,
        title: `${cve.id}: ${cve.description?.slice(0, 80)}...`,
        cve_id: cve.id,
        severity: addForm.severity_override || severityMap[cve.severity?.toUpperCase()] || 'medium',
        status: 'open',
        asset_id: addForm.asset_id || null,
        description: cve.description,
        business_impact: `${cve.severity} severity CVE with CVSS score ${cve.score}. Published ${cve.published}. Review NVD for full impact details.`,
        discovered_at: new Date().toISOString(),
      }])
      if (error) throw error
      await supabase.from('audit_logs').insert([{
        user_id: session.user.id, action: 'vulnerability.added',
        entity_type: 'vulnerability',
        details: { cve_id: cve.id, source: 'cve_database', severity: cve.severity }
      }])
      showToast(`✅ ${cve.id} added to your vulnerabilities!`)
      setShowAddModal(false); setSelectedCve(null); setAddForm({ asset_id: '', severity_override: '' })
    } catch (err) {
      showToast('Error: ' + err.message)
    }
    setAddingId(null)
  }

  function openAddModal(cve) {
    setSelectedCve(cve)
    const severityMap = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }
    setAddForm({ asset_id: '', severity_override: severityMap[cve.severity?.toUpperCase()] || 'medium' })
    setShowAddModal(true)
  }

  const getSeverityColor = (sev) => {
    const s = sev?.toUpperCase()
    if (s === 'CRITICAL') return '#EF4444'
    if (s === 'HIGH') return '#F59E0B'
    if (s === 'MEDIUM') return '#6366F1'
    return '#6B7280'
  }

  const filtered = cves.filter(c => {
    const matchSev = severity === 'all' || c.severity?.toUpperCase() === severity.toUpperCase()
    const matchSearch = !search || c.id?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
    return matchSev && matchSearch
  })

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '10px', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', colorScheme: darkMode ? 'dark' : 'light' }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.75rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>}

        {/* Header */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>🛡️ CVE Database</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Search the National Vulnerability Database. Add CVEs directly to your vulnerability tracker.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '0.4rem 1rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>Live NVD Feed</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Critical', sev: 'CRITICAL', color: '#EF4444' },
            { label: 'High', sev: 'HIGH', color: '#F59E0B' },
            { label: 'Medium', sev: 'MEDIUM', color: '#6366F1' },
            { label: 'Low/Info', sev: 'LOW', color: '#6B7280' },
          ].map((item, i) => {
            const count = cves.filter(c => c.severity?.toUpperCase() === item.sev).length
            return (
              <div key={i} onClick={() => setSeverity(severity === item.sev ? 'all' : item.sev)}
                style={{ background: cardBg, border: `1px solid ${severity === item.sev ? item.color : border}`, borderRadius: '12px', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = severity === item.sev ? item.color : border}>
                <p style={{ margin: '0 0 0.4rem', color: textMuted, fontSize: '0.78rem' }}>{item.label}</p>
                <p style={{ margin: 0, color: item.color, fontSize: '1.75rem', fontWeight: '700' }}>{count}</p>
              </div>
            )
          })}
        </div>

        {/* Search */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCVEs(search || 'web application')}
            placeholder="Search CVE ID or description — e.g. CVE-2024-6387 or nginx..."
            style={{ ...inputStyle, flex: 1, minWidth: '200px' }}
            onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
          <select value={severity} onChange={e => setSeverity(e.target.value)}
            style={{ ...inputStyle, width: 'auto', minWidth: '150px', cursor: 'pointer' }}>
            <option value="all">All Severities</option>
            <option value="CRITICAL">🔴 Critical</option>
            <option value="HIGH">🟠 High</option>
            <option value="MEDIUM">🟡 Medium</option>
            <option value="LOW">🟢 Low</option>
          </select>
          <button onClick={() => fetchCVEs(search || 'web application')} disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {loading ? '⏳ Loading...' : '🔍 Search NVD'}
          </button>
        </div>

        {/* Quick searches */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
          <span style={{ color: textMuted, fontSize: '0.8rem' }}>Quick search:</span>
          {['apache', 'nginx', 'wordpress', 'linux kernel', 'openssl', 'log4j', 'windows', 'docker'].map(term => (
            <button key={term} onClick={() => { setSearch(term); fetchCVEs(term) }}
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', color: '#10B981', fontSize: '0.75rem', padding: '0.2rem 0.7rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}>
              {term}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: textMuted, background: cardBg, borderRadius: '12px', marginBottom: '1rem', border: `1px solid ${border}` }}>
            <div style={{ width: '24px', height: '24px', border: `3px solid ${border}`, borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
            Fetching from NVD...
          </div>
        )}

        {/* CVE Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {filtered.map(cve => {
            const sevColor = getSeverityColor(cve.severity)
            const isAdding = addingId === cve.id
            return (
              <div key={cve.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = sevColor; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${sevColor}, transparent)` }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: '700', color: sevColor, fontFamily: 'monospace', fontSize: '0.9rem', background: `${sevColor}15`, padding: '0.2rem 0.6rem', borderRadius: '6px' }}>{cve.id}</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}40` }}>{cve.severity}</span>
                    {cve.score && <span style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '700' }}>CVSS {cve.score}</span>}
                    {cve.published && <span style={{ color: textMuted, fontSize: '0.75rem' }}>📅 {cve.published}</span>}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => openAddModal(cve)} disabled={isAdding}
                      style={{ padding: '0.35rem 0.875rem', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10B981', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}>
                      {isAdding ? '⏳' : '➕ Add to Tracker'}
                    </button>
                    {cve.url && (
                      <a href={cve.url} target="_blank" rel="noopener noreferrer"
                        style={{ padding: '0.35rem 0.875rem', borderRadius: '6px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366F1', fontSize: '0.78rem', textDecoration: 'none', fontWeight: '600', whiteSpace: 'nowrap', display: 'inline-block' }}>
                        🔗 NVD
                      </a>
                    )}
                  </div>
                </div>

                <p style={{ color: textMain, fontSize: '0.875rem', lineHeight: 1.6, margin: 0, opacity: 0.9 }}>{cve.description}</p>
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '4rem', background: cardBg, borderRadius: '14px', border: `1px solid ${border}` }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
              <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem' }}>No CVEs found</p>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>Try a different search term or check the NVD directly</p>
            </div>
          )}
        </div>
      </main>

      {/* Add to Tracker Modal */}
      {showAddModal && selectedCve && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.1rem', fontWeight: '700' }}>➕ Add to Vulnerability Tracker</h2>
              <p style={{ margin: 0, color: '#6366F1', fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: '700' }}>{selectedCve.id}</p>
            </div>
            <div style={{ padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: `1px solid ${border}`, marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem', lineHeight: 1.5 }}>{selectedCve.description?.slice(0, 120)}...</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Link to Asset (optional)</label>
                <select value={addForm.asset_id} onChange={e => setAddForm(p => ({ ...p, asset_id: e.target.value }))} style={inputStyle}>
                  <option value="">-- No specific asset --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity</label>
                <select value={addForm.severity_override} onChange={e => setAddForm(p => ({ ...p, severity_override: e.target.value }))} style={inputStyle}>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button onClick={() => addAsVulnerability(selectedCve)} disabled={addingId === selectedCve.id}
                  style={{ flex: 2, padding: '0.875rem', background: addingId ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: addingId ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  {addingId ? '⏳ Adding...' : '➕ Add to Tracker'}
                </button>
                <button onClick={() => { setShowAddModal(false); setSelectedCve(null) }}
                  style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}
