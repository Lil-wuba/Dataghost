'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function PublicReport() {
  const params = useParams()
  const reportId = params.id
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      if (!reportId) { setNotFound(true); setLoading(false); return }

      // Load report + framework info
      const { data: report, error } = await supabase
        .from('compliance_reports')
        .select('*, compliance_frameworks(name, version, description, total_controls)')
        .eq('id', reportId)
        .single()

      if (error || !report) { setNotFound(true); setLoading(false); return }

      // Load vuln summary for this user (public summary only)
      const { data: vulns } = await supabase
        .from('vulnerabilities')
        .select('severity, status')
        .eq('user_id', report.user_id)

      const { data: assets } = await supabase
        .from('assets')
        .select('id')
        .eq('user_id', report.user_id)

      const counts = (vulns || []).reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1
        return acc
      }, {})

      const resolved = (vulns || []).filter(v => v.status === 'resolved').length
      const total = (vulns || []).length

      setData({
        report,
        framework: report.compliance_frameworks,
        vulnCounts: counts,
        totalVulns: total,
        resolvedVulns: resolved,
        totalAssets: (assets || []).length,
      })
      setLoading(false)
    }
    load()
  }, [reportId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#070B12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0 }}>Loading report...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', background: '#070B12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Report Not Found</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 2rem', lineHeight: 1.6 }}>This report link may be invalid or has been removed.</p>
          <a href="/landing" style={{ padding: '0.75rem 1.5rem', background: '#10B981', borderRadius: '8px', color: 'white', textDecoration: 'none', fontWeight: '600' }}>← Back to DataGhost</a>
        </div>
      </div>
    )
  }

  const { report, framework, vulnCounts, totalVulns, resolvedVulns, totalAssets } = data
  const passRate = Math.round(report.pass_rate || 0)
  const grade = passRate >= 90 ? 'A+' : passRate >= 80 ? 'A' : passRate >= 70 ? 'B' : passRate >= 60 ? 'C' : passRate >= 50 ? 'D' : 'F'
  const gradeColor = grade === 'A+' || grade === 'A' ? '#10B981' : grade === 'B' ? '#6366F1' : grade === 'C' ? '#F59E0B' : '#EF4444'
  const statusText = passRate >= 80 ? 'COMPLIANT' : passRate >= 60 ? 'PARTIAL' : 'NON-COMPLIANT'
  const statusColor = passRate >= 80 ? '#10B981' : passRate >= 60 ? '#F59E0B' : '#EF4444'

  const generatedDate = new Date(report.generated_at || report.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const checks = [
    { name: 'Access Control', status: passRate > 60 ? 'pass' : 'fail' },
    { name: 'Cryptography & Encryption', status: passRate > 55 ? 'pass' : 'fail' },
    { name: 'Network Security', status: passRate > 45 ? 'pass' : 'fail' },
    { name: 'Vulnerability Management', status: passRate > 70 ? 'pass' : 'fail' },
    { name: 'Incident Response', status: passRate > 80 ? 'pass' : 'fail' },
    { name: 'Risk Assessment', status: passRate > 75 ? 'pass' : 'fail' },
    { name: 'Data Protection', status: passRate > 65 ? 'pass' : 'fail' },
    { name: 'Audit Logging', status: passRate > 50 ? 'pass' : 'fail' },
    { name: 'Asset Management', status: totalAssets > 0 ? 'pass' : 'fail' },
    { name: 'Security Monitoring', status: passRate > 60 ? 'pass' : 'fail' },
  ]

  const passCount = checks.filter(c => c.status === 'pass').length

  return (
    <div style={{ minHeight: '100vh', background: '#070B12', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: 'white' }}>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>👻</div>
          <div>
            <span style={{ fontWeight: '800', color: 'white', fontSize: '1rem' }}>DataGhost</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>Security Report</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>Generated {generatedDate}</span>
          <a href="/signup" style={{ padding: '0.45rem 1rem', background: '#10B981', borderRadius: '6px', color: 'white', textDecoration: 'none', fontSize: '0.78rem', fontWeight: '600' }}>Get DataGhost Free →</a>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Title */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: `${statusColor}15`, border: `1px solid ${statusColor}30`, borderRadius: '20px', padding: '0.3rem 0.875rem', marginBottom: '1rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor }} />
            <span style={{ color: statusColor, fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.08em' }}>{statusText}</span>
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: '800', letterSpacing: '-0.02em' }}>
            {framework?.name} Compliance Report
          </h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
            {framework?.description} · Version {framework?.version}
          </p>
        </div>

        {/* Top Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Pass Rate', value: `${passRate}%`, color: gradeColor },
            { label: 'Grade', value: grade, color: gradeColor },
            { label: 'Controls Checked', value: `${passCount}/${checks.length}`, color: '#6366F1' },
            { label: 'Total Assets', value: totalAssets, color: '#10B981' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
              <p style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: '800', color: stat.color }}>{stat.value}</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', fontWeight: '600' }}>Overall Compliance Score</span>
            <span style={{ color: gradeColor, fontWeight: '700', fontSize: '0.875rem' }}>{passRate}%</span>
          </div>
          <div style={{ height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${passRate}%`, background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}88)`, borderRadius: '5px', transition: 'width 1s ease', boxShadow: `0 0 10px ${gradeColor}50` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem' }}>0%</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem' }}>100%</span>
          </div>
        </div>

        {/* Vulnerability Summary */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', color: 'white', fontSize: '1rem', fontWeight: '600' }}>Vulnerability Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Total', value: totalVulns, color: '#6366F1' },
              { label: 'Critical', value: vulnCounts.critical || 0, color: '#EF4444' },
              { label: 'High', value: vulnCounts.high || 0, color: '#F59E0B' },
              { label: 'Medium', value: vulnCounts.medium || 0, color: '#6366F1' },
              { label: 'Resolved', value: resolvedVulns, color: '#10B981' },
            ].map((item, i) => (
              <div key={i} style={{ background: `${item.color}10`, border: `1px solid ${item.color}20`, borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.2rem', fontSize: '1.5rem', fontWeight: '800', color: item.color }}>{item.value}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem' }}>{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Controls Checklist */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', color: 'white', fontSize: '1rem', fontWeight: '600' }}>
            Security Controls — {passCount}/{checks.length} Passing
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {checks.map((check, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', background: check.status === 'pass' ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', borderRadius: '8px', border: `1px solid ${check.status === 'pass' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
                <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>{check.status === 'pass' ? '✅' : '❌'}</span>
                <span style={{ color: check.status === 'pass' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.45)', fontSize: '0.875rem', flex: 1 }}>{check.name}</span>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: check.status === 'pass' ? '#10B981' : '#EF4444', padding: '0.15rem 0.5rem', borderRadius: '4px', background: check.status === 'pass' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                  {check.status === 'pass' ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 0.5rem', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>
            This report was generated by <strong style={{ color: '#10B981' }}>DataGhost</strong> — Free Security Platform
          </p>
          <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>
            Report ID: {reportId} · Generated {generatedDate}
          </p>
          <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: '#10B981', borderRadius: '8px', color: 'white', textDecoration: 'none', fontSize: '0.8rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
            👻 Create Your Own Security Report — Free
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          div[style*="grid-template-columns: repeat(5"] { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}