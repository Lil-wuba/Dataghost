'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Vulnerabilities() {
  const router = useRouter()
  const darkMode = useTheme()
  const [vulns, setVulns] = useState([])
  const [filtered, setFiltered] = useState([])
  const [severityFilter, setSeverityFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedVuln, setSelectedVuln] = useState(null)
  const [toast, setToast] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [assets, setAssets] = useState([])
  const [newVuln, setNewVuln] = useState({ title: '', cve_id: '', severity: 'medium', status: 'open', asset_id: '', description: '', business_impact: '' })
  const [adding, setAdding] = useState(false)

  useEffect(() => { loadData() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function exportToCSV() {
    const headers = ['Title', 'CVE ID', 'Asset', 'Severity', 'Status', 'Discovered']
    const rows = vulns.map(v => [v.title, v.cve_id || '-', v.assets?.name || '-', v.severity, v.status, new Date(v.discovered_at).toLocaleDateString()])
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url); showToast('✅ CSV exported!')
  }

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data, error } = await supabase.from('vulnerabilities').select('*, assets(name)').eq('user_id', session.user.id).order('discovered_at', { ascending: false })
    if (error) showToast('Error: ' + error.message)
    else { setVulns(data || []); setFiltered(data || []) }
    const { data: aData } = await supabase.from('assets').select('id, name').eq('user_id', session.user.id)
    setAssets(aData || [])
  }

  useEffect(() => {
    let result = vulns
    if (severityFilter !== 'All') result = result.filter(v => v.severity === severityFilter.toLowerCase())
    if (search) result = result.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.cve_id?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [severityFilter, search, vulns])

  async function updateStatus(id, status) {
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('vulnerabilities').update({ status }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      loadData()
      showToast('✅ Status updated!')
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'vulnerability.status_changed', entity_type: 'vulnerability', entity_id: id, details: { new_status: status } }])
    }
  }

  async function handleAddVuln(e) {
    e.preventDefault()
    if (!newVuln.title.trim()) { showToast('❌ Title is required'); return }
    setAdding(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: inserted, error } = await supabase.from('vulnerabilities').insert([{
        title: newVuln.title,
        cve_id: newVuln.cve_id || null,
        severity: newVuln.severity,
        status: newVuln.status,
        asset_id: newVuln.asset_id || null,
        description: newVuln.description || null,
        business_impact: newVuln.business_impact || null,
        user_id: session.user.id,
        discovered_at: new Date().toISOString(),
      }]).select().single()

      if (error) { showToast('Error: ' + error.message); return }

      // Audit log
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'vulnerability.created', entity_type: 'vulnerability', entity_id: inserted?.id, details: { title: newVuln.title, severity: newVuln.severity } }])
      if (newVuln.severity === 'critical' && session?.user?.email) {
        try {
          const assetName = assets.find(a => a.id === newVuln.asset_id)?.name || null
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: session.user.email,
              subject: '🚨 Critical Vulnerability Detected — DataGhost',
              type: 'critical_vuln',
              data: { title: newVuln.title, asset: assetName }
            })
          })
        } catch {}
      }

      setShowAddModal(false)
      setNewVuln({ title: '', cve_id: '', severity: 'medium', status: 'open', asset_id: '', description: '', business_impact: '' })
      loadData()
      showToast(newVuln.severity === 'critical' ? '🚨 Critical vuln added — email sent!' : '✅ Vulnerability added!')
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setAdding(false)
    }
  }

  async function deleteVuln(id) {
    if (!confirm('Delete this vulnerability?')) return
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('vulnerabilities').delete().eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      loadData()
      showToast('🗑️ Deleted!')
      setSelectedVuln(null)
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'vulnerability.deleted', entity_type: 'vulnerability', entity_id: id, details: {} }])
    }
  }

  const severityConfig = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
    high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
    medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.15)' },
    low: { color: '#6B7280', bg: 'rgba(107,114,128,0.15)' },
    info: { color: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  }

  const statusConfig = {
    open: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    in_progress: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    resolved: { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    accepted: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
    false_positive: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  }

  const counts = vulns.reduce((acc, v) => { acc[v.severity] = (acc[v.severity] || 0) + 1; return acc }, {})

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${border}`, borderRadius: '10px',
    color: textMain, fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Vulnerabilities</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Manage and track all discovered security vulnerabilities.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={exportToCSV} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted }}
            >📥 Export CSV</button>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>+ Add Vuln</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: vulns.length, color: '#6366F1' },
            { label: 'Critical', value: counts.critical || 0, color: '#EF4444' },
            { label: 'High', value: counts.high || 0, color: '#F59E0B' },
            { label: 'Medium', value: counts.medium || 0, color: '#6366F1' },
            { label: 'Resolved', value: vulns.filter(v => v.status === 'resolved').length, color: '#10B981' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem 1.25rem', transition: 'background 0.3s' }}>
              <p style={{ margin: '0 0 0.4rem', color: textMuted, fontSize: '0.78rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
          {/* Filters */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem 0.875rem', minWidth: '250px' }}>
              <span style={{ color: textMuted }}>🔍</span>
              <input placeholder="Search by name or CVE ID..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
                <button key={f} onClick={() => setSeverityFilter(f)} style={{
                  padding: '0.35rem 0.875rem', borderRadius: '20px',
                  border: severityFilter === f ? 'none' : `1px solid ${border}`,
                  background: severityFilter === f ? (f === 'All' ? '#10B981' : severityConfig[f.toLowerCase()]?.color) : 'transparent',
                  color: severityFilter === f ? 'white' : textMuted,
                  fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: severityFilter === f ? '600' : '400', transition: 'all 0.2s'
                }}>{f}{f !== 'All' ? ` (${counts[f.toLowerCase()] || 0})` : ` (${vulns.length})`}</button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['ID', 'Name', 'Severity', 'Status', 'Asset', 'Discovered', 'Action'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: textMuted, fontSize: '0.78rem', fontWeight: '500' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((vuln, i) => {
                const sev = severityConfig[vuln.severity] || severityConfig.info
                const sta = statusConfig[vuln.status] || statusConfig.open
                return (
                  <tr key={vuln.id} style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '1rem 1.25rem', color: textMuted, fontSize: '0.78rem', fontFamily: 'monospace' }}>VUL-{String(i + 1).padStart(3, '0')}</td>
                    <td style={{ padding: '1rem 1.25rem', maxWidth: '260px' }}>
                      <div style={{ color: textMain, fontWeight: '500', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vuln.title}</div>
                      {vuln.cve_id && <div style={{ color: textMuted, fontSize: '0.72rem', fontFamily: 'monospace', marginTop: '0.15rem' }}>{vuln.cve_id}</div>}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: sev.bg, color: sev.color }}>
                        {vuln.severity === 'critical' ? '🔴 ' : vuln.severity === 'high' ? '🟠 ' : vuln.severity === 'medium' ? '🟡 ' : '🟢 '}
                        {vuln.severity?.charAt(0).toUpperCase() + vuln.severity?.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <select value={vuln.status} onChange={e => updateStatus(vuln.id, e.target.value)} style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: sta.bg, color: sta.color, border: 'none', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="accepted">Acknowledged</option>
                        <option value="false_positive">False Positive</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: textMuted, fontSize: '0.875rem' }}>{vuln.assets?.name || '-'}</td>
                    <td style={{ padding: '1rem 1.25rem', color: textMuted, fontSize: '0.8rem' }}>{new Date(vuln.discovered_at).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setSelectedVuln(vuln)} style={{ padding: '0.3rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', color: '#10B981', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: '600' }}>👁 View</button>
                        <button onClick={() => deleteVuln(vuln.id)} style={{ padding: '0.3rem 0.75rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: '600' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
                    <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.25rem' }}>No vulnerabilities found</p>
                    <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 1.25rem' }}>{search || severityFilter !== 'All' ? 'Try adjusting your filters' : 'Add one manually or run a scan on your assets!'}</p>
                    {!search && severityFilter === 'All' && (
                      <button onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600' }}>+ Add Vulnerability</button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View Modal */}
        {selectedVuln && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '540px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: severityConfig[selectedVuln.severity]?.bg, color: severityConfig[selectedVuln.severity]?.color }}>
                    {selectedVuln.severity === 'critical' ? '🔴 CRITICAL' : selectedVuln.severity === 'high' ? '🟠 HIGH' : selectedVuln.severity === 'medium' ? '🟡 MEDIUM' : '🟢 LOW'}
                  </span>
                  <h2 style={{ margin: '0.75rem 0 0', color: textMain, fontSize: '1.1rem', fontWeight: '700', lineHeight: 1.4 }}>{selectedVuln.title}</h2>
                </div>
                <button onClick={() => setSelectedVuln(null)} style={{ background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1rem', borderRadius: '6px', width: '30px', height: '30px', flexShrink: 0 }}>✕</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {[
                  { label: 'CVE ID', value: selectedVuln.cve_id || 'N/A' },
                  { label: 'Status', value: selectedVuln.status?.replace('_', ' ') },
                  { label: 'CVSS Score', value: selectedVuln.exploitability_score ?? 'N/A' },
                  { label: 'Asset', value: selectedVuln.assets?.name || 'N/A' },
                  { label: 'Discovered', value: new Date(selectedVuln.discovered_at).toLocaleDateString() },
                  { label: 'Severity', value: selectedVuln.severity?.toUpperCase() },
                ].map((item, i) => (
                  <div key={i} style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '0.75rem' }}>
                    <p style={{ color: textMuted, fontSize: '0.68rem', margin: '0 0 0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                    <p style={{ color: textMain, margin: 0, fontWeight: '600', fontSize: '0.875rem', textTransform: item.label === 'Status' || item.label === 'Severity' ? 'capitalize' : 'none' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {selectedVuln.description && (
                <div style={{ background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '0.875rem', marginBottom: '0.75rem' }}>
                  <p style={{ color: textMuted, fontSize: '0.68rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
                  <p style={{ color: textMain, margin: 0, fontSize: '0.875rem', lineHeight: 1.7 }}>{selectedVuln.description}</p>
                </div>
              )}

              {selectedVuln.business_impact && (
                <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: '8px', padding: '0.875rem', marginBottom: '1rem', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ color: '#EF4444', fontSize: '0.68rem', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚠️ Business Impact</p>
                  <p style={{ color: textMain, margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>{selectedVuln.business_impact}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setSelectedVuln(null); router.push('/remediation') }} style={{ flex: 1, padding: '0.75rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>🔧 Create Fix Plan</button>
                <button onClick={() => deleteVuln(selectedVuln.id)} style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>🗑️</button>
                <button onClick={() => setSelectedVuln(null)} style={{ padding: '0.75rem 1rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vulnerability Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.25rem', fontWeight: '700' }}>Add Vulnerability</h2>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Manually log a security vulnerability</p>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
              </div>

              {/* Critical warning banner */}
              {newVuln.severity === 'critical' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚨</span>
                  <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem', fontWeight: '600' }}>Critical severity — an email alert will be sent to your account automatically.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Title *</label>
                  <input value={newVuln.title} onChange={e => setNewVuln(p => ({ ...p, title: e.target.value }))} placeholder="e.g. SQL Injection in login form" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CVE ID</label>
                    <input value={newVuln.cve_id} onChange={e => setNewVuln(p => ({ ...p, cve_id: e.target.value }))} placeholder="CVE-2024-XXXX" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity *</label>
                    <select value={newVuln.severity} onChange={e => setNewVuln(p => ({ ...p, severity: e.target.value }))} style={inputStyle}>
                      <option value="critical">🔴 Critical</option>
                      <option value="high">🟠 High</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="low">🟢 Low</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                    <select value={newVuln.status} onChange={e => setNewVuln(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="accepted">Acknowledged</option>
                      <option value="false_positive">False Positive</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Affected Asset</label>
                    <select value={newVuln.asset_id} onChange={e => setNewVuln(p => ({ ...p, asset_id: e.target.value }))} style={inputStyle}>
                      <option value="">-- None --</option>
                      {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
                  <textarea value={newVuln.description} onChange={e => setNewVuln(p => ({ ...p, description: e.target.value }))} placeholder="Describe the vulnerability in detail..." rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>

                <div>
                  <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Impact</label>
                  <textarea value={newVuln.business_impact} onChange={e => setNewVuln(p => ({ ...p, business_impact: e.target.value }))} placeholder="What is the potential business impact?" rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button onClick={handleAddVuln} disabled={adding} style={{ flex: 1, padding: '0.875rem', background: adding ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: adding ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.95rem', boxShadow: adding ? 'none' : '0 4px 12px rgba(16,185,129,0.3)' }}>
                    {adding ? '⏳ Adding...' : '+ Add Vulnerability'}
                  </button>
                  <button onClick={() => setShowAddModal(false)} style={{ padding: '0.875rem 1.25rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}