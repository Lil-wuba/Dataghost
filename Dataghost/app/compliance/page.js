'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Compliance() {
  const router = useRouter()
  const darkMode = useTheme()
  const [frameworks, setFrameworks] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState({})
  const [toast, setToast] = useState('')

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: fData } = await supabase.from('compliance_frameworks').select('*')
    setFrameworks(fData || [])
    const { data: rData } = await supabase.from('compliance_reports')
      .select('*, compliance_frameworks(name, version)')
      .eq('user_id', session.user.id)
    setReports(rData || [])
  }

  async function generateReport(fwId) {
    const { data: { session } } = await supabase.auth.getSession()
    setLoading(prev => ({ ...prev, [fwId]: true }))
    try {
      const { error } = await supabase.rpc('generate_compliance_report', { p_framework_id: fwId, p_user_id: session.user.id })
      if (error) throw error
      showToast('✅ Report generated!')
      loadData()
    } catch (error) { showToast('Error: ' + error.message) }
    finally { setLoading(prev => ({ ...prev, [fwId]: false })) }
  }

  async function exportPDF(fw, report) {
    try {
      showToast('⏳ Generating PDF...')
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameworkName: fw.name,
          passRate: report.pass_rate || 0,
          reportId: report.id,
          checks: [
            { name: 'Access Control', status: (report.pass_rate || 0) > 60 ? 'pass' : 'fail' },
            { name: 'Cryptography', status: (report.pass_rate || 0) > 50 ? 'pass' : 'fail' },
            { name: 'Network Security', status: (report.pass_rate || 0) > 40 ? 'pass' : 'fail' },
            { name: 'Vulnerability Management', status: (report.pass_rate || 0) > 70 ? 'pass' : 'fail' },
            { name: 'Incident Response', status: (report.pass_rate || 0) > 80 ? 'pass' : 'fail' },
            { name: 'Risk Assessment', status: (report.pass_rate || 0) > 75 ? 'pass' : 'fail' },
            { name: 'Data Protection', status: (report.pass_rate || 0) > 65 ? 'pass' : 'fail' },
            { name: 'Audit Logging', status: (report.pass_rate || 0) > 55 ? 'pass' : 'fail' },
          ]
        })
      })
      const html = await res.text()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        win.onload = () => {
          setTimeout(() => { win.print(); URL.revokeObjectURL(url) }, 500)
        }
      }
      showToast('✅ PDF ready! Use Print → Save as PDF')
    } catch (err) { showToast('Error: ' + err.message) }
  }

  useEffect(() => { loadData() }, [])

  const frameworkIcons = { 'PCI DSS': '💳', 'ISO 27001': '🔒', 'SOC 2': '🛡️', 'GDPR': '🇪🇺' }
  const frameworkColors = { 'PCI DSS': '#6366F1', 'ISO 27001': '#10B981', 'SOC 2': '#F59E0B', 'GDPR': '#EF4444' }

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

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Compliance</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Monitor and generate compliance reports for security frameworks.</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Frameworks', value: frameworks.length, color: '#6366F1' },
            { label: 'Reports Generated', value: reports.length, color: '#10B981' },
            { label: 'Avg Pass Rate', value: reports.length > 0 ? `${(reports.reduce((a, r) => a + (r.pass_rate || 0), 0) / reports.length).toFixed(0)}%` : '0%', color: '#F59E0B' },
            { label: 'Compliant', value: reports.filter(r => (r.pass_rate || 0) >= 80).length, color: '#EF4444' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', transition: 'background 0.3s' }}>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Frameworks */}
        <h2 style={{ color: textMain, fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Frameworks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {frameworks.map(fw => {
            const fwReport = reports.find(r => r.compliance_frameworks?.name === fw.name)
            const passRate = fwReport?.pass_rate ?? 0
            const color = frameworkColors[fw.name] || '#10B981'
            const circumference = 2 * Math.PI * 15.9
            const strokeDashoffset = circumference - (passRate / 100) * circumference

            return (
              <div key={fw.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', textAlign: 'center', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${color}, transparent)` }} />

                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{frameworkIcons[fw.name] || '📋'}</div>
                <h3 style={{ color: textMain, margin: '0 0 0.25rem', fontWeight: '700' }}>{fw.name}</h3>
                <p style={{ color: textMuted, fontSize: '0.75rem', margin: '0 0 1.25rem' }}>v{fw.version}</p>

                {/* SVG Circle */}
                <div style={{ width: '120px', height: '120px', margin: '0 auto 1rem', position: 'relative' }}>
                  <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
                      strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={passRate >= 80 ? '#10B981' : passRate > 0 ? '#F59E0B' : '#EF4444'}
                      strokeWidth="2.5"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={`${strokeDashoffset}`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: passRate >= 80 ? '#10B981' : passRate > 0 ? '#F59E0B' : textMuted, fontWeight: '700', fontSize: '1.25rem' }}>{passRate.toFixed(0)}%</span>
                    <span style={{ color: textMuted, fontSize: '0.65rem' }}>Pass Rate</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  <span style={{ color: '#10B981' }}>✓ Pass</span>
                  <span style={{ color: textMuted }}>|</span>
                  <span style={{ color: '#EF4444' }}>✗ Fail</span>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={loading[fw.id]}
                    onClick={() => generateReport(fw.id)}
                    style={{
                      flex: 1, padding: '0.7rem',
                      background: loading[fw.id] ? (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : '#10B981',
                      border: 'none', borderRadius: '8px',
                      color: loading[fw.id] ? textMuted : 'white',
                      fontFamily: 'inherit', fontSize: '0.8rem',
                      cursor: loading[fw.id] ? 'not-allowed' : 'pointer',
                      fontWeight: '600', transition: 'all 0.2s',
                      boxShadow: loading[fw.id] ? 'none' : '0 4px 12px rgba(16,185,129,0.3)'
                    }}>
                    {loading[fw.id] ? '⏳ Generating...' : '📊 Generate'}
                  </button>

                  {fwReport && (
                    <button
                      onClick={() => exportPDF(fw, fwReport)}
                      style={{
                        padding: '0.7rem 0.875rem',
                        background: 'rgba(99,102,241,0.1)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        borderRadius: '8px', color: '#6366F1',
                        fontFamily: 'inherit', fontSize: '0.8rem',
                        cursor: 'pointer', fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                    >
                      📄 PDF
                    </button>
                  )}

                  {fwReport && (
                    <button
                      onClick={() => {
                        const url = window.location.origin + '/report/' + fwReport.id
                        navigator.clipboard.writeText(url)
                        showToast('🔗 Report link copied to clipboard!')
                      }}
                      style={{
                        padding: '0.7rem 0.875rem',
                        background: 'rgba(16,185,129,0.1)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: '8px', color: '#10B981',
                        fontFamily: 'inherit', fontSize: '0.8rem',
                        cursor: 'pointer', fontWeight: '600',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                    >
                      🔗 Share
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Report History */}
        <h2 style={{ color: textMain, fontSize: '1rem', fontWeight: '600', marginBottom: '1rem' }}>Report History</h2>
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
          {reports.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.25rem' }}>No reports yet</p>
              <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>Click Generate above to create your first report!</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {['Framework', 'Pass Rate', 'Status', 'Generated', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '1rem', textAlign: 'left', color: textMuted, fontSize: '0.8rem', fontWeight: '500' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map(r => {
                  const fw = frameworks.find(f => f.name === r.compliance_frameworks?.name)
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem', color: textMain, fontWeight: '500' }}>
                        {frameworkIcons[r.compliance_frameworks?.name] || '📋'} {r.compliance_frameworks?.name}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: (r.pass_rate || 0) >= 80 ? '#10B981' : '#EF4444', fontWeight: '700' }}>
                          {r.pass_rate?.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: (r.pass_rate || 0) >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: (r.pass_rate || 0) >= 80 ? '#10B981' : '#EF4444' }}>
                          {(r.pass_rate || 0) >= 80 ? '✅ Compliant' : '❌ Non-Compliant'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', color: textMuted, fontSize: '0.875rem' }}>
                        {new Date(r.generated_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {r.file_url && (
                            <a href={r.file_url} target="_blank" rel="noreferrer"
                              style={{ color: '#10B981', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}>
                              ⬇ Download
                            </a>
                          )}
                          <button
                            onClick={() => exportPDF(fw || { name: r.compliance_frameworks?.name }, r)}
                            style={{
                              padding: '0.3rem 0.75rem', borderRadius: '6px',
                              background: 'rgba(99,102,241,0.1)',
                              border: '1px solid rgba(99,102,241,0.2)',
                              color: '#6366F1', fontSize: '0.75rem',
                              fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                          >
                            📄 PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}