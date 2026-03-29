'use client'
import { useEffect, useState } from 'react'
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
  const [monthlyData, setMonthlyData] = useState({ labels: [], critical: [], high: [], medium: [], low: [] })
  const [riskyAssets, setRiskyAssets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const userId = session.user.id

      const { data: vulns } = await supabase
        .from('vulnerabilities')
        .select('severity, discovered_at, asset_id')
        .eq('user_id', userId)

      const { data: assets } = await supabase
        .from('assets')
        .select('id, name')
        .eq('user_id', userId)

      const counts = (vulns || []).reduce((acc, v) => {
        const sev = v.severity?.toLowerCase()
        acc[sev] = (acc[sev] || 0) + 1
        return acc
      }, {})
      setSeverityCounts({
        critical: counts.critical || 0,
        high: counts.high || 0,
        medium: counts.medium || 0,
        low: counts.low || 0
      })

      const totalVulnsCount = (vulns || []).length
      const criticalCount = counts.critical || 0
      const highCount = counts.high || 0
      const mediumCount = counts.medium || 0

      // Risk score: 0 = safe, 100 = critical danger
      const rawRisk = Math.min(100, Math.round(
        (criticalCount * 25) + (highCount * 10) + (mediumCount * 3)
      ))
      const riskScore = rawRisk

      setSummary({ total_assets: (assets || []).length, risk_score: riskScore })

      const now = new Date()
      const months = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push({ label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth() })
      }
      const monthly = { labels: months.map(m => m.label), critical: [], high: [], medium: [], low: [] }
      for (const m of months) {
        const start = new Date(m.year, m.month, 1).toISOString()
        const end = new Date(m.year, m.month + 1, 0).toISOString()
        const mv = (vulns || []).filter(v => v.discovered_at >= start && v.discovered_at <= end)
        monthly.critical.push(mv.filter(v => v.severity === 'critical').length)
        monthly.high.push(mv.filter(v => v.severity === 'high').length)
        monthly.medium.push(mv.filter(v => v.severity === 'medium').length)
        monthly.low.push(mv.filter(v => v.severity === 'low').length)
      }
      setMonthlyData(monthly)

      const assetVulnMap = {}
      for (const v of (vulns || [])) {
        if (!v.asset_id) continue
        if (!assetVulnMap[v.asset_id]) assetVulnMap[v.asset_id] = 0
        if (v.severity === 'critical') assetVulnMap[v.asset_id]++
      }
      const topAssets = Object.entries(assetVulnMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([assetId, criticalCount]) => {
          const asset = (assets || []).find(a => a.id === assetId)
          return { asset_name: asset?.name || 'Unknown Asset', critical_count: criticalCount }
        })
      setRiskyAssets(topAssets)
      setLoading(false)
    }
    loadDashboard()

    // Realtime: re-fetch dashboard whenever vulnerabilities or assets change
    let realtimeUserId = null
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      realtimeUserId = session.user.id
    })

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vulnerabilities' }, () => {
        loadDashboard()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        loadDashboard()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const gridColor = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
  const totalVulns = Object.values(severityCounts).reduce((a, b) => a + b, 0)

  const lineChartData = {
    labels: monthlyData.labels,
    datasets: [
      { label: 'critical', data: monthlyData.critical, borderColor: '#EF4444', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#EF4444', pointBorderColor: cardBg, pointBorderWidth: 2, borderWidth: 2 },
      { label: 'high', data: monthlyData.high, borderColor: '#F59E0B', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#F59E0B', pointBorderColor: cardBg, pointBorderWidth: 2, borderWidth: 2 },
      { label: 'medium', data: monthlyData.medium, borderColor: '#6366F1', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#6366F1', pointBorderColor: cardBg, pointBorderWidth: 2, borderWidth: 2 },
      { label: 'low', data: monthlyData.low, borderColor: '#6B7280', backgroundColor: 'transparent', tension: 0.4, pointRadius: 5, pointHoverRadius: 8, pointBackgroundColor: '#6B7280', pointBorderColor: cardBg, pointBorderWidth: 2, borderWidth: 2 },
    ]
  }

  const lineChartOptions = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { color: textMuted, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 12 }, padding: 20 } },
      tooltip: { backgroundColor: darkMode ? '#1E1E2E' : '#FFFFFF', borderColor: border, borderWidth: 1, titleColor: textMain, bodyColor: textMuted, padding: 12, cornerRadius: 10, titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 12 }, callbacks: { label: ctx => ` ${ctx.dataset.label} : ${ctx.parsed.y}` } }
    },
    scales: {
      y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: textMuted, font: { size: 11 }, stepSize: 1 }, border: { display: false } },
      x: { grid: { color: gridColor, drawBorder: false }, ticks: { color: textMuted, font: { size: 11 } }, border: { display: false } }
    }
  }

  const doughnutData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [{ data: [severityCounts.critical, severityCounts.high, severityCounts.medium, severityCounts.low], backgroundColor: ['#EF4444', '#F59E0B', '#6366F1', '#6B7280'], hoverBackgroundColor: ['#DC2626', '#D97706', '#4F46E5', '#4B5563'], borderColor: cardBg, borderWidth: 3, hoverOffset: 6 }]
  }

  const doughnutOptions = {
    animation: false,
    plugins: {
      legend: { position: 'bottom', labels: { color: textMuted, boxWidth: 10, usePointStyle: true, pointStyle: 'circle', font: { size: 12 }, padding: 16 } },
      tooltip: { backgroundColor: darkMode ? '#1E1E2E' : '#FFFFFF', borderColor: border, borderWidth: 1, titleColor: textMain, bodyColor: textMuted, padding: 12, cornerRadius: 10, callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((a, b) => a + b, 0); const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0; return ` ${ctx.label}: ${ctx.parsed} (${pct}%)` } } }
    },
    cutout: '68%'
  }

  const kpiCards = [
    { label: 'Total Vulnerabilities', value: totalVulns, icon: '🛡️', color: '#6366F1', bg: 'rgba(99,102,241,0.1)', change: 'Open issues' },
    { label: 'Critical Issues', value: severityCounts.critical, icon: '⚠️', color: '#EF4444', bg: 'rgba(239,68,68,0.1)', change: 'Needs immediate fix' },
    { label: 'Active Assets', value: summary?.total_assets ?? 0, icon: '🖥️', color: '#10B981', bg: 'rgba(16,185,129,0.1)', change: 'Being monitored' },
    { label: 'Risk Score', value: summary?.risk_score ?? 0, icon: '📊', color: (summary?.risk_score ?? 0) >= 75 ? '#EF4444' : (summary?.risk_score ?? 0) >= 40 ? '#F59E0B' : '#10B981', bg: (summary?.risk_score ?? 0) >= 75 ? 'rgba(239,68,68,0.1)' : (summary?.risk_score ?? 0) >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', change: (summary?.risk_score ?? 0) >= 75 ? '🔴 High risk — fix critical vulns' : (summary?.risk_score ?? 0) >= 40 ? '🟡 Medium risk' : '🟢 Low risk', suffix: '/100' },
  ]

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Security Overview</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Monitor your organization's security posture in real-time.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '20px', padding: '0.4rem 1rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>Live</span>
          </div>
        </div>

        {loading ? <DashboardSkeleton darkMode={darkMode} /> : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {kpiCards.map((card, i) => (
                <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.2)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = border }}
                >
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle, ${card.bg} 0%, transparent 70%)`, pointerEvents: 'none' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{card.label}</p>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{card.icon}</div>
                  </div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: '700', color: card.color }}>
                    <AnimatedNumber value={card.value} suffix={card.suffix || ''} />
                  </p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: textMuted }}>{card.change}</p>
                </div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Vulnerability Trend</h3>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Last 7 months severity breakdown</p>
                </div>
                <Line data={lineChartData} options={lineChartOptions} />
              </div>

              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s', display: 'flex', flexDirection: 'column' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Severity Distribution</h3>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Current open vulnerabilities</p>
                </div>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
                  <Doughnut data={doughnutData} options={doughnutOptions} />
                  <div style={{ position: 'absolute', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: textMain }}>{totalVulns}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: textMuted }}>Total</p>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                  {[
                    { label: 'Critical', count: severityCounts.critical, color: '#EF4444' },
                    { label: 'High', count: severityCounts.high, color: '#F59E0B' },
                    { label: 'Medium', count: severityCounts.medium, color: '#6366F1' },
                    { label: 'Low', count: severityCounts.low, color: '#6B7280' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                      <span style={{ color: textMuted, fontSize: '0.75rem' }}>{item.label}</span>
                      <span style={{ marginLeft: 'auto', color: item.color, fontWeight: '700', fontSize: '0.875rem' }}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Risk Breakdown</h3>
                {[
                  { label: 'Critical', count: severityCounts.critical, color: '#EF4444' },
                  { label: 'High', count: severityCounts.high, color: '#F59E0B' },
                  { label: 'Medium', count: severityCounts.medium, color: '#6366F1' },
                  { label: 'Low', count: severityCounts.low, color: '#6B7280' },
                ].map((item, i) => {
                  const pct = totalVulns > 0 ? Math.round((item.count / totalVulns) * 100) : 0
                  return (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                          <span style={{ color: textMuted, fontSize: '0.8rem' }}>{item.label}</span>
                        </div>
                        <span style={{ color: item.color, fontSize: '0.8rem', fontWeight: '600' }}>{item.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.8s ease', boxShadow: `0 0 8px ${item.color}50` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Quick Actions</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Scan All Assets', desc: 'Run vulnerability scan', icon: '🔍', href: '/assets', color: '#10B981' },
                    { label: 'View Critical Vulns', desc: 'Review critical issues', icon: '⚠️', href: '/vulnerabilities', color: '#EF4444' },
                    { label: 'Create Remediation Plan', desc: 'Fix a vulnerability', icon: '🔧', href: '/remediation', color: '#F59E0B' },
                    { label: 'Generate Report', desc: 'Compliance reporting', icon: '📋', href: '/compliance', color: '#6366F1' },
                  ].map((action, i) => (
                    <a key={i} href={action.href} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${border}`, textDecoration: 'none', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = action.color; e.currentTarget.style.background = `${action.color}10` }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{action.icon}</div>
                      <div>
                        <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '600' }}>{action.label}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{action.desc}</p>
                      </div>
                      <span style={{ marginLeft: 'auto', color: textMuted }}>→</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Risky Assets */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.15rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Top Risky Assets</h3>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Assets with the most critical vulnerabilities</p>
                </div>
                <a href="/assets" style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '600', textDecoration: 'none' }}>View All →</a>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {['Asset Name', 'Critical Vulns', 'Risk Level', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', color: textMuted, fontSize: '0.75rem', fontWeight: '500' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {riskyAssets.length > 0 ? riskyAssets.map((a, i) => (
                    <tr key={i} style={{ borderBottom: i < riskyAssets.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem 1.5rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>🖥️ {a.asset_name}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <span style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>{a.critical_count}</span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flex: 1, height: '6px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '3px', maxWidth: '120px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min((a.critical_count / 10) * 100, 100)}%`, background: a.critical_count > 7 ? '#EF4444' : a.critical_count > 4 ? '#F59E0B' : '#10B981' }} />
                          </div>
                          <span style={{ color: a.critical_count > 7 ? '#EF4444' : a.critical_count > 4 ? '#F59E0B' : '#10B981', fontSize: '0.75rem', fontWeight: '600' }}>
                            {a.critical_count > 7 ? 'Critical' : a.critical_count > 4 ? 'High' : a.critical_count > 2 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <a href="/vulnerabilities" style={{ color: '#10B981', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600' }}>View Vulns →</a>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: textMuted }}>
                        No assets with vulnerabilities yet. <a href="/assets" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '600' }}>Add assets →</a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}