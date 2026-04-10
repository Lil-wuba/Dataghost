'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'
import { DashboardSkeleton } from '@/app/components/Skeleton'
import { useCountUp } from '@/app/hooks/useCountUp'
import { Chart as ChartJS, ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import AuthGuard from '../components/AuthGuard'
ChartJS.register(ArcElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler)

function AnimatedNumber({ value, suffix = '' }) {
  const count = useCountUp(typeof value === 'number' ? value : 0)
  if (typeof value === 'string') return <>{value}</>
  return <>{count}{suffix}</>
}

function DashboardContent() {
  const router = useRouter()
  const darkMode = useTheme()
  const [summary, setSummary] = useState(null)
  const [severityCounts, setSeverityCounts] = useState({ critical: 0, high: 0, medium: 0, low: 0 })
  const [riskyAssets, setRiskyAssets] = useState([])
  const [recentScans, setRecentScans] = useState([])
  const [recentVulns, setRecentVulns] = useState([])
  const [riskHistory, setRiskHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState({ hasAssets: false, hasVulns: false, hasScan: false, hasPlan: false })

  const loadDashboard = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const userId = session.user.id

    const [
      { data: vulns }, { data: assets }, { data: scans },
      { data: plans }, { data: history }
    ] = await Promise.all([
      supabase.from('vulnerabilities').select('id, severity, discovered_at, asset_id, title, status').eq('user_id', userId),
      supabase.from('assets').select('id, name').eq('user_id', userId),
      supabase.from('scan_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(4),
      supabase.from('remediation_plans').select('id').eq('user_id', userId).limit(1),
      supabase.from('risk_score_history').select('*').eq('user_id', userId).order('recorded_at', { ascending: true }).limit(30),
    ])

    const counts = (vulns || []).reduce((acc, v) => {
      const s = v.severity?.toLowerCase()
      acc[s] = (acc[s] || 0) + 1
      return acc
    }, {})
    setSeverityCounts({ critical: counts.critical || 0, high: counts.high || 0, medium: counts.medium || 0, low: counts.low || 0 })

    const criticalCount = counts.critical || 0
    const highCount = counts.high || 0
    const mediumCount = counts.medium || 0
    const riskScore = Math.min(100, Math.round((criticalCount * 25) + (highCount * 10) + (mediumCount * 3)))
    const resolvedCount = (vulns || []).filter(v => v.status === 'resolved').length
    setSummary({ total_assets: (assets || []).length, risk_score: riskScore, total_vulns: (vulns || []).length, resolved: resolvedCount })

    // Save current risk score to history (max once per hour)
    const lastHistory = history?.[history.length - 1]
    const lastRecorded = lastHistory ? new Date(lastHistory.recorded_at) : null
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (!lastRecorded || lastRecorded < hourAgo) {
      supabase.from('risk_score_history').insert([{
        user_id: userId, score: riskScore,
        critical_count: criticalCount, high_count: highCount,
        medium_count: mediumCount, low_count: counts.low || 0,
        total_vulns: (vulns || []).length, resolved_count: resolvedCount
      }]).then(() => {})
    }

    setRiskHistory(history || [])

    // Risky assets
    const assetVulnMap = {}
    for (const v of (vulns || [])) {
      if (!v.asset_id) continue
      if (!assetVulnMap[v.asset_id]) assetVulnMap[v.asset_id] = 0
      if (v.severity === 'critical') assetVulnMap[v.asset_id]++
    }
    setRiskyAssets(Object.entries(assetVulnMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([assetId, c]) => ({ asset_name: (assets || []).find(a => a.id === assetId)?.name || 'Unknown', critical_count: c })))

    setRecentVulns((vulns || []).filter(v => v.status !== 'resolved').sort((a, b) => new Date(b.discovered_at) - new Date(a.discovered_at)).slice(0, 5))
    setRecentScans(scans || [])
    setChecklist({ hasAssets: (assets || []).length > 0, hasVulns: (vulns || []).length > 0, hasScan: (scans || []).length > 0, hasPlan: (plans || []).length > 0 })
    setLoading(false)
  }, [router])

  useEffect(() => {
    loadDashboard()
    const channel = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vulnerabilities' }, loadDashboard)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, loadDashboard)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_history' }, loadDashboard)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [loadDashboard])

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  if (loading) return (
    <div style={{ background: bg, minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: '260px', padding: '1.5rem' }}><DashboardSkeleton /></div>
    </div>
  )

  const riskColor = !summary?.risk_score ? '#10B981' : summary.risk_score >= 70 ? '#EF4444' : summary.risk_score >= 40 ? '#F59E0B' : '#10B981'
  const riskLabel = !summary?.risk_score ? 'Secure' : summary.risk_score >= 70 ? 'Critical' : summary.risk_score >= 40 ? 'Elevated' : 'Low Risk'

  // Risk history chart data
  const historyLabels = riskHistory.map(h => {
    const d = new Date(h.recorded_at)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  })
  const riskHistoryData = {
    labels: historyLabels,
    datasets: [{
      label: 'Risk Score',
      data: riskHistory.map(h => h.score),
      borderColor: '#EF4444',
      backgroundColor: 'rgba(239,68,68,0.08)',
      tension: 0.4, fill: true, borderWidth: 2, pointRadius: 3,
      pointBackgroundColor: riskHistory.map(h => h.score >= 70 ? '#EF4444' : h.score >= 40 ? '#F59E0B' : '#10B981'),
      pointBorderColor: 'transparent',
    }]
  }

  const doughnutData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{ data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low], backgroundColor: ['#EF4444', '#F59E0B', '#6366F1', '#6B7280'], borderWidth: 0, hoverOffset: 4 }]
  }

  const chartOpts = (yMax) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textMuted, font: { size: 10 } }, grid: { color: border } },
      y: { ticks: { color: textMuted, font: { size: 10 } }, grid: { color: border }, beginAtZero: true, max: yMax || undefined }
    }
  })

  const gradeColor = (g) => !g ? '#6B7280' : (g === 'A+' || g === 'A') ? '#10B981' : g === 'B' ? '#6366F1' : g === 'C' ? '#F59E0B' : '#EF4444'
  const showChecklist = !checklist.hasAssets || !checklist.hasVulns || !checklist.hasScan || !checklist.hasPlan
  const doneCount = [checklist.hasAssets, checklist.hasVulns, checklist.hasScan, checklist.hasPlan].filter(Boolean).length

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Security Dashboard</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Real-time overview of your security posture.</p>
        </div>

        {/* Getting Started Checklist */}
        {showChecklist && (
          <div style={{ background: cardBg, border: '1px solid rgba(99,102,241,0.3)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #6366F1, #10B981)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.15rem', color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>🚀 Getting Started</h3>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>{doneCount} of 4 steps complete</p>
              </div>
              <div style={{ width: '120px', height: '6px', background: border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${doneCount * 25}%`, background: 'linear-gradient(90deg, #6366F1, #10B981)', borderRadius: '3px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {[
                { done: checklist.hasAssets, label: 'Add your first asset', href: '/assets', icon: '🖥️' },
                { done: checklist.hasVulns, label: 'Add a vulnerability', href: '/vulnerabilities', icon: '🔓' },
                { done: checklist.hasScan, label: 'Run a site security scan', href: '/site-audit', icon: '🔍' },
                { done: checklist.hasPlan, label: 'Create a remediation plan', href: '/remediation', icon: '🔧' },
              ].map((item, i) => (
                <div key={i} onClick={() => !item.done && router.push(item.href)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', borderRadius: '8px', border: `1px solid ${item.done ? 'rgba(16,185,129,0.2)' : border}`, background: item.done ? 'rgba(16,185,129,0.05)' : 'transparent', cursor: item.done ? 'default' : 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { if (!item.done) e.currentTarget.style.borderColor = '#6366F1' }}
                  onMouseLeave={e => { if (!item.done) e.currentTarget.style.borderColor = border }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.done ? '#10B981' : border, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0, color: item.done ? 'white' : textMuted }}>
                    {item.done ? '✓' : item.icon}
                  </div>
                  <span style={{ color: item.done ? textMuted : textMain, fontSize: '0.82rem', fontWeight: item.done ? '400' : '500', textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Risk Score', value: summary?.risk_score ?? 0, suffix: '/100', color: riskColor, sub: riskLabel },
            { label: 'Total Assets', value: summary?.total_assets ?? 0, color: '#6366F1', sub: 'monitored', onClick: () => router.push('/assets') },
            { label: 'Open Vulns', value: (summary?.total_vulns ?? 0) - (summary?.resolved ?? 0), color: '#F59E0B', sub: `${summary?.resolved ?? 0} resolved`, onClick: () => router.push('/vulnerabilities') },
            { label: 'Critical', value: severityCounts.critical, color: '#EF4444', sub: 'need immediate action', onClick: () => router.push('/vulnerabilities') },
          ].map((kpi, i) => (
            <div key={i} onClick={kpi.onClick} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s', cursor: kpi.onClick ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { if (kpi.onClick) { e.currentTarget.style.borderColor = kpi.color; e.currentTarget.style.transform = 'translateY(-2px)' } }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.color }} />
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.78rem', fontWeight: '500' }}>{kpi.label}</p>
              <p style={{ margin: '0 0 0.25rem', color: kpi.color, fontSize: '2rem', fontWeight: '800', lineHeight: 1 }}><AnimatedNumber value={kpi.value} />{kpi.suffix || ''}</p>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Charts row - Risk History + Severity Doughnut */}
        <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Risk Score History */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '700' }}>Risk Score Trend</h3>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>Lower is better — track your improvement over time</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, color: riskColor, fontSize: '1.5rem', fontWeight: '800' }}>{summary?.risk_score ?? 0}</p>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.72rem' }}>current</p>
              </div>
            </div>
            <div style={{ height: '180px' }}>
              {riskHistory.length > 1 ? (
                <Line data={riskHistoryData} options={chartOpts(100)} />
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.5rem', color: textMuted }}>
                  <span style={{ fontSize: '2rem' }}>📊</span>
                  <span style={{ fontSize: '0.875rem' }}>History builds as you use DataGhost</span>
                </div>
              )}
            </div>
          </div>

          {/* Severity Doughnut */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '700' }}>By Severity</h3>
            {severityCounts.critical + severityCounts.high + severityCounts.medium + severityCounts.low > 0 ? (
              <>
                <div style={{ height: '130px' }}>
                  <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.875rem' }}>
                  {[['Critical', severityCounts.critical, '#EF4444'], ['High', severityCounts.high, '#F59E0B'], ['Medium', severityCounts.medium, '#6366F1'], ['Low', severityCounts.low, '#6B7280']].map(([label, count, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                        <span style={{ color: textMuted, fontSize: '0.75rem' }}>{label}</span>
                      </div>
                      <span style={{ color, fontWeight: '700', fontSize: '0.875rem' }}>{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: textMuted }}>
                <span style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</span>
                <span style={{ fontSize: '0.875rem' }}>No vulnerabilities</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

          {/* Recent Open Vulnerabilities */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>Recent Open Vulnerabilities</h3>
              <button onClick={() => router.push('/vulnerabilities')} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>View All →</button>
            </div>
            {recentVulns.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: textMuted }}>
                <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🛡️</div>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>No open vulnerabilities!</p>
              </div>
            ) : recentVulns.map((v, i) => {
              const sc = { critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }, high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }, medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' }, low: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' } }[v.severity] || { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' }
              return (
                <div key={v.id} onClick={() => router.push('/vulnerabilities')}
                  style={{ padding: '0.75rem 1.25rem', borderBottom: i < recentVulns.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '10px', background: sc.bg, color: sc.color, fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', flexShrink: 0 }}>{v.severity}</span>
                  <span style={{ color: textMain, fontSize: '0.82rem', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</span>
                  <span style={{ color: textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{new Date(v.discovered_at).toLocaleDateString()}</span>
                </div>
              )
            })}
          </div>

          {/* Right column: Recent Scans + Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>Recent Site Scans</h3>
                <button onClick={() => router.push('/scan-history')} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>History →</button>
              </div>
              {recentScans.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', color: textMuted }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem' }}>No scans yet</p>
                  <button onClick={() => router.push('/site-audit')} style={{ padding: '0.4rem 1rem', background: '#10B981', border: 'none', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>Run First Scan</button>
                </div>
              ) : recentScans.map((scan, i) => (
                <div key={scan.id} onClick={() => router.push('/scan-history')}
                  style={{ padding: '0.6rem 1.25rem', borderBottom: i < recentScans.length - 1 ? `1px solid ${border}` : 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ padding: '0.15rem 0.5rem', borderRadius: '8px', background: gradeColor(scan.grade) + '20', color: gradeColor(scan.grade), fontSize: '0.7rem', fontWeight: '800', flexShrink: 0 }}>{scan.grade || '?'}</span>
                  <span style={{ color: textMain, fontSize: '0.8rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{scan.hostname || scan.url}</span>
                  <span style={{ color: textMuted, fontSize: '0.72rem', flexShrink: 0 }}>{scan.score}/100</span>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.875rem', color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>Quick Actions</h3>
              <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { icon: '🔍', label: 'Run Site Audit', href: '/site-audit', color: '#10B981' },
                  { icon: '🔓', label: 'Add Vulnerability', href: '/vulnerabilities', color: '#EF4444' },
                  { icon: '🖥️', label: 'Add Asset', href: '/assets', color: '#6366F1' },
                  { icon: '🔎', label: 'Search CVEs', href: '/cve', color: '#F59E0B' },
                ].map((action, i) => (
                  <button key={i} onClick={() => router.push(action.href)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = action.color + '10' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                    <span>{action.icon}</span>
                    <span style={{ color: textMain, fontSize: '0.8rem', fontWeight: '500' }}>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Risky Assets */}
        {riskyAssets.length > 0 && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>Top Risky Assets</h3>
              <button onClick={() => router.push('/assets')} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>View All →</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: `1px solid ${border}` }}>
                {['Asset', 'Critical Vulns', 'Risk Level'].map(h => <th key={h} style={{ padding: '0.75rem 1.25rem', textAlign: 'left', color: textMuted, fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {riskyAssets.map((asset, i) => (
                  <tr key={i} onClick={() => router.push('/assets')}
                    style={{ borderBottom: i < riskyAssets.length - 1 ? `1px solid ${border}` : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.875rem 1.25rem', color: textMain, fontWeight: '500', fontSize: '0.875rem' }}>{asset.asset_name}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{ color: '#EF4444', fontWeight: '700', fontSize: '0.95rem' }}>{asset.critical_count}</span>
                      <span style={{ color: textMuted, fontSize: '0.8rem' }}> critical</span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '80px', height: '6px', background: border, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(100, asset.critical_count * 20)}%`, background: asset.critical_count >= 3 ? '#EF4444' : asset.critical_count >= 2 ? '#F59E0B' : '#6366F1' }} />
                        </div>
                        <span style={{ color: asset.critical_count >= 3 ? '#EF4444' : asset.critical_count >= 2 ? '#F59E0B' : '#6366F1', fontSize: '0.75rem', fontWeight: '600' }}>
                          {asset.critical_count >= 3 ? 'Critical' : asset.critical_count >= 2 ? 'High' : 'Medium'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } .kpi-grid { grid-template-columns: repeat(2,1fr) !important; } .chart-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}

export default function Dashboard() {
  return <AuthGuard><DashboardContent /></AuthGuard>
}
