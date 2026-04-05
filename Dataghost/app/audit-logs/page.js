'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

// Comprehensive action map covering all actual DB action strings
const ACTION_ICONS = {
  // Vulnerabilities
  'vulnerability.created':       { icon: '🔓', color: '#EF4444', label: 'Vulnerability Added' },
  'vulnerability.added':         { icon: '🔓', color: '#EF4444', label: 'Vulnerability Added' },
  'vulnerability.deleted':       { icon: '🗑️', color: '#6B7280', label: 'Vulnerability Deleted' },
  'vulnerability.status_changed':{ icon: '🔄', color: '#6366F1', label: 'Status Changed' },
  'vulnerability.updated':       { icon: '✏️', color: '#6366F1', label: 'Vulnerability Updated' },
  // Assets
  'asset.created':               { icon: '🖥️', color: '#10B981', label: 'Asset Added' },
  'asset.added':                 { icon: '🖥️', color: '#10B981', label: 'Asset Added' },
  'asset.deleted':               { icon: '🗑️', color: '#6B7280', label: 'Asset Deleted' },
  'asset.updated':               { icon: '✏️', color: '#10B981', label: 'Asset Updated' },
  // Scans
  'scan.asset':                  { icon: '🔍', color: '#6366F1', label: 'Asset Scanned' },
  'scan.site':                   { icon: '🌐', color: '#6366F1', label: 'Site Scanned' },
  'site.audit_complete':         { icon: '🌐', color: '#6366F1', label: 'Site Audit Complete' },
  // Compliance
  'compliance.report_generated': { icon: '📋', color: '#F59E0B', label: 'Compliance Report' },
  // Remediation
  'remediation.plan_created':    { icon: '🔧', color: '#10B981', label: 'Plan Created' },
  'remediation.plan_verified':   { icon: '✅', color: '#10B981', label: 'Plan Verified' },
  'remediation.step_verified':   { icon: '☑️', color: '#10B981', label: 'Step Verified' },
  // Auth
  'auth.login':                  { icon: '🔐', color: '#6B7280', label: 'Logged In' },
  'auth.logout':                 { icon: '🚪', color: '#6B7280', label: 'Logged Out' },
  'auth.signup':                 { icon: '👤', color: '#6366F1', label: 'Account Created' },
}

function getConf(action) {
  if (ACTION_ICONS[action]) return ACTION_ICONS[action]
  // Fuzzy match — find closest prefix
  const key = Object.keys(ACTION_ICONS).find(k => action?.startsWith(k.split('.')[0]))
  if (key) return { ...ACTION_ICONS[key], label: action }
  return { icon: '📝', color: '#6B7280', label: action || 'Action' }
}

export default function AuditLogs() {
  const router = useRouter()
  const darkMode = useTheme()
  const [logs, setLogs] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [toast, setToast] = useState('')

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => { loadLogs() }, [])

  useEffect(() => {
    let result = logs
    if (filter !== 'All') {
      result = result.filter(l => {
        if (filter === 'vulnerability') return l.action?.includes('vulnerability') || l.entity_type === 'vulnerability'
        if (filter === 'asset') return l.action?.includes('asset') || l.entity_type === 'asset'
        if (filter === 'scan') return l.action?.includes('scan') || l.action?.includes('site.audit') || l.entity_type === 'scan'
        if (filter === 'compliance') return l.action?.includes('compliance') || l.entity_type?.includes('compliance')
        if (filter === 'remediation') return l.action?.includes('remediation') || l.entity_type?.includes('remediation')
        if (filter === 'auth') return l.action?.includes('auth') || l.entity_type === 'auth'
        return true
      })
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.action?.toLowerCase().includes(q) ||
        l.entity_type?.toLowerCase().includes(q) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [filter, search, logs])

  async function loadLogs() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase
      .from('audit_logs').select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(500)
    if (!error) { setLogs(data || []); setFiltered(data || []) }
    setLoading(false)
  }

  async function clearLogs() {
    if (!confirm('Clear all audit logs? This cannot be undone.')) return
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('audit_logs').delete().eq('user_id', session.user.id)
    setLogs([]); setFiltered([])
    showToast('🗑️ Logs cleared')
  }

  function exportCSV() {
    const headers = ['Timestamp', 'Action', 'Category', 'Entity ID', 'Details']
    const rows = filtered.map(l => [
      new Date(l.created_at).toISOString(),
      l.action,
      l.entity_type || '',
      l.entity_id || '',
      JSON.stringify(l.details || {})
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    showToast('✅ CSV exported!')
  }

  // Group logs by date
  function groupByDate(logs) {
    const groups = {}
    for (const log of logs) {
      const date = new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      if (!groups[date]) groups[date] = []
      groups[date].push(log)
    }
    return groups
  }

  const grouped = groupByDate(filtered)
  const filters = ['All', 'vulnerability', 'asset', 'scan', 'compliance', 'remediation', 'auth']
  const filterLabels = { All: 'All', vulnerability: '🔓 Vulns', asset: '🖥️ Assets', scan: '🔍 Scans', compliance: '📋 Compliance', remediation: '🔧 Remediation', auth: '🔐 Auth' }

  // Count by category for stats
  const counts = {
    vulnerability: logs.filter(l => l.action?.includes('vulnerability')).length,
    asset: logs.filter(l => l.action?.includes('asset')).length,
    scan: logs.filter(l => l.action?.includes('scan') || l.action?.includes('site')).length,
    compliance: logs.filter(l => l.action?.includes('compliance')).length,
    remediation: logs.filter(l => l.action?.includes('remediation')).length,
    auth: logs.filter(l => l.action?.includes('auth')).length,
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.75rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>📜 Audit Logs</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Full history of all actions in your account — {logs.length} total entries.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={exportCSV} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted }}>
              📥 Export CSV
            </button>
            <button onClick={clearLogs} style={{ padding: '0.6rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
              🗑️ Clear All
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {Object.entries(counts).map(([key, count]) => {
            const icons = { vulnerability: '🔓', asset: '🖥️', scan: '🔍', compliance: '📋', remediation: '🔧', auth: '🔐' }
            const colors = { vulnerability: '#EF4444', asset: '#10B981', scan: '#6366F1', compliance: '#F59E0B', remediation: '#10B981', auth: '#6B7280' }
            return (
              <div key={key} onClick={() => setFilter(filter === key ? 'All' : key)}
                style={{ background: cardBg, border: `1px solid ${filter === key ? colors[key] : border}`, borderRadius: '10px', padding: '0.875rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = colors[key]}
                onMouseLeave={e => e.currentTarget.style.borderColor = filter === key ? colors[key] : border}>
                <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{icons[key]}</div>
                <p style={{ margin: '0 0 0.1rem', color: colors[key], fontSize: '1.25rem', fontWeight: '700' }}>{count}</p>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.65rem', textTransform: 'capitalize' }}>{key}</p>
              </div>
            )
          })}
        </div>

        {/* Filters + Search */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem 0.875rem', flex: 1, minWidth: '180px' }}>
              <span style={{ color: textMuted }}>🔍</span>
              <input placeholder="Search actions, categories, details..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: `1px solid ${filter === f ? '#10B981' : border}`, background: filter === f ? '#10B981' : 'transparent', color: filter === f ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer', fontWeight: filter === f ? '600' : '400', transition: 'all 0.15s' }}>
                  {filterLabels[f]}
                </button>
              ))}
            </div>
            <span style={{ color: textMuted, fontSize: '0.78rem', marginLeft: 'auto', flexShrink: 0 }}>{filtered.length} entries</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: textMuted }}>
              <div style={{ width: '32px', height: '32px', border: `3px solid ${border}`, borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
              Loading logs...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>📜</div>
              <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.25rem' }}>{search || filter !== 'All' ? 'No matching logs' : 'No audit logs yet'}</p>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>
                {search || filter !== 'All' ? 'Try adjusting your search or filter' : 'Actions like adding vulnerabilities, running scans, and generating reports will appear here.'}
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(grouped).map(([date, dateLogs]) => (
                <div key={date}>
                  {/* Date separator */}
                  <div style={{ padding: '0.6rem 1.25rem', background: darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{date}</span>
                    <span style={{ color: textMuted, fontSize: '0.7rem' }}>· {dateLogs.length} action{dateLogs.length !== 1 ? 's' : ''}</span>
                  </div>

                  {dateLogs.map((log, i) => {
                    const conf = getConf(log.action)
                    const details = log.details && Object.keys(log.details).length > 0 ? log.details : null
                    return (
                      <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: i < dateLogs.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${conf.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>{conf.icon}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '600' }}>{conf.label}</p>
                            <span style={{ color: textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', fontFamily: 'monospace' }}>{log.action}</p>
                          {details && (
                            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {Object.entries(details).slice(0, 4).map(([k, v]) => (
                                <span key={k} style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', border: `1px solid ${border}`, borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.68rem', color: textMuted }}>
                                  <span style={{ color: conf.color }}>{k}</span>: {typeof v === 'string' ? v.slice(0, 30) : JSON.stringify(v).slice(0, 30)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {log.entity_type && (
                          <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '600', background: `${conf.color}12`, color: conf.color, textTransform: 'capitalize', flexShrink: 0, alignSelf: 'center' }}>
                            {log.entity_type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}
