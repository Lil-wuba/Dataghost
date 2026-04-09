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
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [selectedVuln, setSelectedVuln] = useState(null)
  const [toast, setToast] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [assets, setAssets] = useState([])
  const [newVuln, setNewVuln] = useState({ title: '', cve_id: '', severity: 'medium', status: 'open', asset_id: '', description: '', business_impact: '' })
  const [adding, setAdding] = useState(false)
  const [showRemPlanModal, setShowRemPlanModal] = useState(false)
  const [remPlanVuln, setRemPlanVuln] = useState(null)
  const [remPriority, setRemPriority] = useState('medium')
  const [remHours, setRemHours] = useState('')
  const [remNotes, setRemNotes] = useState('')
  const [remDue, setRemDue] = useState('')
  const [creatingPlan, setCreatingPlan] = useState(false)

  useEffect(() => { loadData() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  function exportToCSV() {
    const headers = ['Title', 'CVE ID', 'Asset', 'Severity', 'Status', 'Discovered']
    const rows = vulns.map(v => [v.title, v.cve_id || '-', v.assets?.name || '-', v.severity, v.status, new Date(v.discovered_at).toLocaleDateString()])
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `vulnerabilities-${new Date().toISOString().split('T')[0]}.csv`; a.click()
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
    if (statusFilter !== 'All') result = result.filter(v => v.status === statusFilter.toLowerCase().replace(' ', '_'))
    if (search) result = result.filter(v => v.title?.toLowerCase().includes(search.toLowerCase()) || v.cve_id?.toLowerCase().includes(search.toLowerCase()))
    setFiltered(result)
  }, [severityFilter, statusFilter, search, vulns])

  async function updateStatus(id, status) {
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('vulnerabilities').update({ status }).eq('id', id)
    if (error) showToast('Error: ' + error.message)
    else {
      loadData()
      if (selectedVuln?.id === id) setSelectedVuln(prev => ({ ...prev, status }))
      showToast('✅ Status updated!')
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'vulnerability.status_changed', entity_type: 'vulnerability', entity_id: id, details: { new_status: status } }])
    }
  }

  async function deleteVuln(id) {
    if (!confirm('Delete this vulnerability?')) return
    await supabase.from('vulnerabilities').delete().eq('id', id)
    setVulns(prev => prev.filter(v => v.id !== id))
    if (selectedVuln?.id === id) setSelectedVuln(null)
    showToast('🗑️ Deleted')
  }

  async function handleAddVuln(e) {
    e.preventDefault()
    if (!newVuln.title.trim()) { showToast('❌ Title required'); return }
    setAdding(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('vulnerabilities').insert([{
      ...newVuln, cve_id: newVuln.cve_id || null, asset_id: newVuln.asset_id || null,
      description: newVuln.description || null, business_impact: newVuln.business_impact || null,
      user_id: session.user.id, discovered_at: new Date().toISOString()
    }])
    setAdding(false)
    if (error) showToast('Error: ' + error.message)
    else {
      setShowAddModal(false)
      setNewVuln({ title: '', cve_id: '', severity: 'medium', status: 'open', asset_id: '', description: '', business_impact: '' })
      loadData()
      showToast('✅ Vulnerability added!')
      // Auto-email for critical vulns
      if (newVuln.severity === 'critical') {
        try {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: session.user.email,
              subject: '🚨 Critical Vulnerability Detected — ' + newVuln.title,
              type: 'critical_vuln',
              data: { title: newVuln.title, asset: assets.find(a => a.id === newVuln.asset_id)?.name || 'Unknown' }
            })
          })
        } catch(e) { console.log('Email notification skipped:', e.message) }
      }
    }
  }

  async function createRemPlan(e) {
    e.preventDefault()
    if (!remHours) { showToast('❌ Enter estimated hours'); return }
    setCreatingPlan(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: plan, error } = await supabase.from('remediation_plans').insert([{
      vulnerability_id: remPlanVuln.id, priority: remPriority, estimated_hours: parseInt(remHours),
      user_id: session.user.id, status: 'pending', notes: remNotes || null, due_date: remDue || null
    }]).select().single()
    if (error) { showToast('Error: ' + error.message); setCreatingPlan(false); return }
    await supabase.from('remediation_steps').insert([
      { plan_id: plan.id, step_order: 1, description: 'Identify all affected systems and scope', command_hint: 'nmap -sV target' },
      { plan_id: plan.id, step_order: 2, description: 'Apply patch or configuration fix', command_hint: 'apt-get update && apt-get upgrade' },
      { plan_id: plan.id, step_order: 3, description: 'Verify fix and rescan', command_hint: 'nmap --script vuln target' }
    ])
    setCreatingPlan(false); setShowRemPlanModal(false); setRemPlanVuln(null); setRemPriority('medium'); setRemHours(''); setRemNotes(''); setRemDue('')
    showToast('✅ Remediation plan created!')
    await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'remediation.plan_created', entity_type: 'remediation_plan', entity_id: plan.id, details: { vulnerability_id: remPlanVuln.id } }])
  }

  const severityConfig = {
    critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: '🔴 CRITICAL' },
    high:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: '🟠 HIGH' },
    medium:   { color: '#6366F1', bg: 'rgba(99,102,241,0.12)', label: '🟡 MEDIUM' },
    low:      { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', label: '🟢 LOW' },
  }
  const statusConfig = {
    open:        { color: '#EF4444', label: 'Open' },
    in_progress: { color: '#F59E0B', label: 'In Progress' },
    resolved:    { color: '#10B981', label: 'Resolved' },
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '10px', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }

  const counts = { critical: vulns.filter(v=>v.severity==='critical').length, high: vulns.filter(v=>v.severity==='high').length, medium: vulns.filter(v=>v.severity==='medium').length, low: vulns.filter(v=>v.severity==='low').length, resolved: vulns.filter(v=>v.status==='resolved').length }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Vulnerabilities</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Manage and track all discovered security vulnerabilities.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={exportToCSV} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted }}>📥 Export CSV</button>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>+ Add Vuln</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total', value: vulns.length, color: '#6366F1', filter: 'All' },
            { label: 'Critical', value: counts.critical, color: '#EF4444', filter: 'Critical' },
            { label: 'High', value: counts.high, color: '#F59E0B', filter: 'High' },
            { label: 'Medium', value: counts.medium, color: '#6366F1', filter: 'Medium' },
            { label: 'Resolved', value: counts.resolved, color: '#10B981', filter: 'All' },
          ].map((stat, i) => (
            <div key={i} onClick={() => setSeverityFilter(stat.filter)} style={{ background: cardBg, border: `1px solid ${severityFilter === stat.filter && i > 0 ? stat.color : border}`, borderRadius: '12px', padding: '1rem 1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = stat.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = severityFilter === stat.filter && i > 0 ? stat.color : border}>
              <p style={{ margin: '0 0 0.4rem', color: textMuted, fontSize: '0.78rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters + Table */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderRadius: '8px', padding: '0.5rem 0.875rem', minWidth: '220px' }}>
              <span style={{ color: textMuted }}>🔍</span>
              <input placeholder="Search by name or CVE ID..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: textMuted, fontSize: '0.8rem' }}>Severity:</span>
              {['All','Critical','High','Medium','Low'].map(f => (
                <button key={f} onClick={() => setSeverityFilter(f)} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: `1px solid ${severityFilter === f ? '#10B981' : border}`, background: severityFilter === f ? '#10B981' : 'transparent', color: severityFilter === f ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: severityFilter === f ? '600' : '400', transition: 'all 0.15s' }}>{f} ({f === 'All' ? vulns.length : (counts[f.toLowerCase()] || 0)})</button>
              ))}
              <span style={{ color: textMuted, fontSize: '0.8rem', marginLeft: '0.5rem' }}>Status:</span>
              {['All','Open','In Progress','Resolved'].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} style={{ padding: '0.3rem 0.75rem', borderRadius: '20px', border: `1px solid ${statusFilter === f ? '#6366F1' : border}`, background: statusFilter === f ? '#6366F1' : 'transparent', color: statusFilter === f ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.15s' }}>{f}</button>
              ))}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Vulnerability', 'Severity', 'Status', 'Asset', 'Discovered', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', color: textMuted, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ padding: '4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
                  <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.25rem' }}>No vulnerabilities found</p>
                  <p style={{ color: textMuted, fontSize: '0.875rem', margin: '0 0 1.25rem' }}>{search || severityFilter !== 'All' ? 'Try adjusting your filters' : 'Add one manually or run a scan!'}</p>
                  <button onClick={() => setShowAddModal(true)} style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600' }}>+ Add Vulnerability</button>
                </td></tr>
              ) : filtered.map((vuln, i) => {
                const sc = severityConfig[vuln.severity] || severityConfig.low
                const stc = statusConfig[vuln.status] || statusConfig.open
                return (
                  <tr key={vuln.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedVuln(vuln)}>
                    <td style={{ padding: '0.875rem 1.25rem', maxWidth: '280px' }}>
                      <p style={{ margin: 0, color: textMain, fontWeight: '600', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vuln.title}</p>
                      {vuln.cve_id && <span style={{ fontSize: '0.72rem', color: '#6366F1', fontFamily: 'monospace', fontWeight: '600' }}>{vuln.cve_id}</span>}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: sc.bg, color: sc.color, fontSize: '0.72rem', fontWeight: '700' }}>{sc.label}</span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <select value={vuln.status} onClick={e => e.stopPropagation()} onChange={e => updateStatus(vuln.id, e.target.value)}
                        style={{ background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '6px', color: stc.color, padding: '0.25rem 0.5rem', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', color: textMuted, fontSize: '0.8rem' }}>{vuln.assets?.name || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: textMuted, fontSize: '0.8rem' }}>{new Date(vuln.discovered_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedVuln(vuln)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', color: '#10B981', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>👁 View</button>
                        <button onClick={() => { setRemPlanVuln(vuln); setShowRemPlanModal(true) }} style={{ padding: '0.3rem 0.6rem', background: 'rgba(99,102,241,0.1)', border: 'none', borderRadius: '6px', color: '#6366F1', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>🔧 Fix</button>
                        <button onClick={() => deleteVuln(vuln.id)} style={{ padding: '0.3rem 0.6rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Vuln Detail Modal */}
      {selectedVuln && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={() => setSelectedVuln(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '580px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: (severityConfig[selectedVuln.severity]||severityConfig.low).bg, color: (severityConfig[selectedVuln.severity]||severityConfig.low).color, fontSize: '0.72rem', fontWeight: '700' }}>{(severityConfig[selectedVuln.severity]||severityConfig.low).label}</span>
                  {selectedVuln.cve_id && <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: 'rgba(99,102,241,0.1)', color: '#6366F1', fontSize: '0.72rem', fontWeight: '700', fontFamily: 'monospace' }}>{selectedVuln.cve_id}</span>}
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', color: (statusConfig[selectedVuln.status]||statusConfig.open).color, fontSize: '0.72rem', fontWeight: '600', textTransform: 'capitalize' }}>{selectedVuln.status?.replace('_',' ')}</span>
                </div>
                <h2 style={{ margin: 0, color: textMain, fontSize: '1.15rem', fontWeight: '700', lineHeight: 1.4 }}>{selectedVuln.title}</h2>
              </div>
              <button onClick={() => setSelectedVuln(null)} style={{ background: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1rem', borderRadius: '6px', width: '32px', height: '32px', flexShrink: 0, marginLeft: '1rem' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Asset', value: selectedVuln.assets?.name || 'None' },
                { label: 'Discovered', value: new Date(selectedVuln.discovered_at).toLocaleDateString() },
                { label: 'Status', value: selectedVuln.status?.replace('_',' '), color: (statusConfig[selectedVuln.status]||statusConfig.open).color },
                { label: 'CVE', value: selectedVuln.cve_id || 'N/A', mono: true },
              ].map((item, i) => (
                <div key={i} style={{ background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <p style={{ margin: '0 0 0.25rem', color: textMuted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</p>
                  <p style={{ margin: 0, color: item.color || textMain, fontSize: '0.85rem', fontWeight: '600', textTransform: 'capitalize', fontFamily: item.mono ? 'monospace' : 'inherit' }}>{item.value}</p>
                </div>
              ))}
            </div>

            {selectedVuln.description && (
              <div style={{ marginBottom: '1rem', padding: '1rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '10px', border: `1px solid ${border}` }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>Description</p>
                <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', lineHeight: 1.7 }}>{selectedVuln.description}</p>
              </div>
            )}
            {selectedVuln.business_impact && (
              <div style={{ marginBottom: '1.25rem', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ margin: '0 0 0.5rem', color: '#EF4444', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '600' }}>⚠️ Business Impact</p>
                <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', lineHeight: 1.6 }}>{selectedVuln.business_impact}</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setRemPlanVuln(selectedVuln); setShowRemPlanModal(true); setSelectedVuln(null) }}
                style={{ flex: 1, padding: '0.75rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                🔧 Create Remediation Plan
              </button>
              <select value={selectedVuln.status} onChange={e => updateStatus(selectedVuln.id, e.target.value)}
                style={{ flex: 1, padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '8px', color: textMain, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.875rem', outline: 'none' }}>
                <option value="open">📋 Set: Open</option>
                <option value="in_progress">⚙️ Set: In Progress</option>
                <option value="resolved">✅ Set: Resolved</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Create Remediation Plan Modal */}
      {showRemPlanModal && remPlanVuln && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.2rem', fontWeight: '700' }}>🔧 Create Remediation Plan</h2>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>For: <strong style={{ color: '#6366F1' }}>{remPlanVuln.title}</strong></p>
            </div>
            <form onSubmit={createRemPlan} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Priority</label>
                  <select value={remPriority} onChange={e => setRemPriority(e.target.value)} style={inputStyle}>
                    <option value="immediate">🔴 Immediate</option>
                    <option value="high">🟠 High</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="low">🟢 Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Est. Hours *</label>
                  <input type="number" placeholder="e.g. 4" value={remHours} onChange={e => setRemHours(e.target.value)} style={inputStyle} min="1"
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Due Date</label>
                <input type="date" value={remDue} onChange={e => setRemDue(e.target.value)} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notes</label>
                <textarea placeholder="Steps, references, context..." value={remNotes} onChange={e => setRemNotes(e.target.value)} rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" disabled={creatingPlan} style={{ flex: 2, padding: '0.875rem', background: creatingPlan ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: creatingPlan ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                  {creatingPlan ? '⏳ Creating...' : '🔧 Create Plan'}
                </button>
                <button type="button" onClick={() => { setShowRemPlanModal(false); setRemPlanVuln(null) }} style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vuln Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.2rem', fontWeight: '700' }}>Add Vulnerability</h2>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Document a new security vulnerability</p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            <form onSubmit={handleAddVuln} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title *</label>
                <input value={newVuln.title} onChange={e => setNewVuln(p => ({ ...p, title: e.target.value }))} placeholder="e.g. SQL Injection on Login Endpoint" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CVE ID</label>
                  <input value={newVuln.cve_id} onChange={e => setNewVuln(p => ({ ...p, cve_id: e.target.value }))} placeholder="CVE-2024-XXXX" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Severity</label>
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
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Asset</label>
                  <select value={newVuln.asset_id} onChange={e => setNewVuln(p => ({ ...p, asset_id: e.target.value }))} style={inputStyle}>
                    <option value="">-- No specific asset --</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</label>
                  <select value={newVuln.status} onChange={e => setNewVuln(p => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
                <textarea value={newVuln.description} onChange={e => setNewVuln(p => ({ ...p, description: e.target.value }))} placeholder="Technical details of the vulnerability..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Business Impact</label>
                <textarea value={newVuln.business_impact} onChange={e => setNewVuln(p => ({ ...p, business_impact: e.target.value }))} placeholder="What happens if this isn't fixed?" rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={adding} style={{ flex: 1, padding: '0.875rem', background: adding ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: adding ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>
                  {adding ? '⏳ Adding...' : 'Add Vulnerability'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}
