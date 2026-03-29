'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

const ACTION_ICONS = {
  'vulnerability.created': { icon: '🔓', color: '#EF4444', label: 'Vuln Added' },
  'vulnerability.deleted': { icon: '🗑️', color: '#6B7280', label: 'Vuln Deleted' },
  'vulnerability.status_changed': { icon: '🔄', color: '#6366F1', label: 'Status Changed' },
  'asset.created': { icon: '🖥️', color: '#10B981', label: 'Asset Added' },
  'asset.deleted': { icon: '🗑️', color: '#6B7280', label: 'Asset Deleted' },
  'scan.asset': { icon: '🔍', color: '#6366F1', label: 'Asset Scanned' },
  'scan.site': { icon: '🌐', color: '#6366F1', label: 'Site Scanned' },
  'compliance.report_generated': { icon: '📋', color: '#F59E0B', label: 'Report Generated' },
  'remediation.plan_created': { icon: '🔧', color: '#10B981', label: 'Plan Created' },
  'remediation.plan_verified': { icon: '✅', color: '#10B981', label: 'Plan Verified' },
  'auth.login': { icon: '🔐', color: '#6B7280', label: 'Logged In' },
  'auth.logout': { icon: '🚪', color: '#6B7280', label: 'Logged Out' },
}

export default function AuditLogs() {
  const router = useRouter()
  const darkMode = useTheme()
  const [logs, setLogs] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  useEffect(() => { loadLogs() }, [])

  useEffect(() => {
    let result = logs
    if (filter !== 'All') result = result.filter(l => l.entity_type === filter.toLowerCase())
    if (search) result = result.filter(l => l.action?.includes(search.toLowerCase()) || l.entity_type?.includes(search.toLowerCase()))
    setFiltered(result)
  }, [filter, search, logs])

  async function loadLogs() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase.from('audit_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(200)
    if (!error) { setLogs(data || []); setFiltered(data || []) }
    setLoading(false)
  }

  async function clearLogs() {
    if (!confirm('Clear all audit logs?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('audit_logs').delete().eq('user_id', session.user.id)
    setLogs([]); setFiltered([])
  }

  const filters = ['All', 'vulnerability', 'asset', 'scan', 'compliance', 'remediation', 'auth']

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>📜 Audit Logs</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Full history of all actions performed in your account.</p>
          </div>
          <button onClick={clearLogs} style={{ padding: '0.6rem 1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>🗑️ Clear Logs</button>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
          {/* Filters */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem 0.875rem', minWidth: '220px' }}>
              <span style={{ color: textMuted }}>🔍</span>
              <input placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '0.3rem 0.75rem', borderRadius: '20px', border: filter === f ? 'none' : `1px solid ${border}`,
                  background: filter === f ? '#10B981' : 'transparent',
                  color: filter === f ? 'white' : textMuted,
                  fontFamily: 'inherit', fontSize: '0.78rem', cursor: 'pointer',
                  fontWeight: filter === f ? '600' : '400', transition: 'all 0.2s', textTransform: 'capitalize'
                }}>{f}</button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', color: textMuted, fontSize: '0.78rem' }}>{filtered.length} entries</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: textMuted }}>⏳ Loading logs...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📜</div>
              <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.25rem' }}>No audit logs yet</p>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>Actions like adding vulnerabilities, scanning assets, and generating reports will appear here.</p>
            </div>
          ) : (
            <div>
              {filtered.map((log, i) => {
                const conf = ACTION_ICONS[log.action] || { icon: '📝', color: '#6B7280', label: log.action }
                return (
                  <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${conf.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{conf.icon}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 0.15rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{conf.label}</p>
                      <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem', fontFamily: 'monospace' }}>{log.action} {log.entity_id ? `· ${log.entity_id.slice(0, 8)}...` : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: '0 0 0.15rem', color: textMuted, fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleDateString()}</p>
                      <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem' }}>{new Date(log.created_at).toLocaleTimeString()}</p>
                    </div>
                    {log.entity_type && (
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '600', background: `${conf.color}15`, color: conf.color, textTransform: 'capitalize', flexShrink: 0 }}>{log.entity_type}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}