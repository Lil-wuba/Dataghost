'use client'
import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'
import { supabase } from '@/lib/supabase'

export default function SiteAuditor() {
  const darkMode = useTheme()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  async function runScan() {
    if (!url.trim()) return
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`
    const hostname = cleanUrl.replace(/^https?:\/\//, '').split('/')[0]

    setLoading(true)
    setResults(null)
    setActiveTab('overview')
    setProgress(10)
    setProgressMsg('Checking HTTP security headers...')

    try {
      // Step 1: Headers
      setProgress(20)
      setProgressMsg('Scanning security headers...')
      let headersData = null
      try {
        const hRes = await fetch('/api/headers-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl })
        })
        headersData = await hRes.json()
        if (headersData.error) headersData = null
      } catch {}

      // Step 2: DNS
      setProgress(50)
      setProgressMsg('Looking up DNS records...')
      let dnsData = null
      try {
        const dRes = await fetch('/api/dns-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl })
        })
        dnsData = await dRes.json()
        if (dnsData.error) dnsData = null
      } catch {}

      // Step 3: Build results even without SSL (SSL Labs is slow)
      setProgress(80)
      setProgressMsg('Calculating security score...')

      // Score calculation
      const headersScore = headersData?.score || 0
      const dnsScore = dnsData?.score || 0
      const overallScore = headersData && dnsData
        ? Math.round(headersScore * 0.6 + dnsScore * 0.4)
        : headersData ? headersScore : dnsScore

      const grade = overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F'

      setProgress(90)
      setProgressMsg('Saving scan to history...')

      // Save to scan history
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('scan_history').insert([{
            user_id: session.user.id,
            url: cleanUrl,
            hostname,
            score: overallScore,
            grade,
            headers_score: headersScore,
            dns_score: dnsScore,
            headers_pass: headersData?.passCount || 0,
            headers_fail: headersData?.failCount || 0,
            created_at: new Date().toISOString()
          }])
        }
      } catch {}

      setProgress(100)
      setProgressMsg('Done!')
      setResults({ url: cleanUrl, hostname, headers: headersData, dns: dnsData, overallScore, grade })

    } catch (err) {
      setResults({ error: err.message })
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const gradeColor = !results?.grade ? '#6B7280'
    : results.grade === 'A+' || results.grade === 'A' ? '#10B981'
    : results.grade === 'B' ? '#6366F1'
    : results.grade === 'C' ? '#F59E0B' : '#EF4444'

  const inputStyle = {
    flex: 1, padding: '0.875rem 1rem',
    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${border}`, borderRadius: '10px',
    color: textMain, fontFamily: 'inherit', fontSize: '0.95rem',
    outline: 'none', transition: 'border-color 0.2s'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>🔍 Website Security Auditor</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Scan any website for SSL, security headers, DNS records and get a score out of 100.</p>
        </div>

        {/* Input */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              value={url} onChange={e => setUrl(e.target.value)}
              placeholder="Enter domain — e.g. google.com or https://example.com"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && !loading && runScan()}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = border}
            />
            <button onClick={runScan} disabled={loading || !url.trim()} style={{
              padding: '0.875rem 2rem', background: loading ? 'rgba(16,185,129,0.4)' : '#10B981',
              border: 'none', borderRadius: '10px', color: 'white',
              fontFamily: 'inherit', fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '700', transition: 'all 0.2s',
              boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.3)'
            }}>
              {loading ? '⏳ Scanning...' : '🚀 Scan Now'}
            </button>
          </div>

          {/* Quick examples */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: textMuted, fontSize: '0.8rem' }}>Try:</span>
            {['google.com', 'github.com', 'cloudflare.com', 'facebook.com'].map(site => (
              <button key={site} onClick={() => setUrl(site)} style={{
                padding: '0.25rem 0.75rem', borderRadius: '20px',
                border: `1px solid ${border}`, background: 'transparent',
                color: '#10B981', fontSize: '0.8rem', cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s'
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{site}</button>
            ))}
          </div>

          {/* Progress bar */}
          {loading && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ color: textMuted, fontSize: '0.8rem' }}>{progressMsg}</span>
                <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>{progress}%</span>
              </div>
              <div style={{ height: '6px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#10B981', borderRadius: '3px', transition: 'width 0.4s ease', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {!loading && !results && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h2 style={{ color: textMain, margin: '0 0 0.5rem' }}>Ready to Audit</h2>
            <p style={{ color: textMuted, margin: '0 0 2rem', fontSize: '0.875rem' }}>Enter any domain above to get a full security report</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              {[
                { icon: '🔒', label: 'Security Headers', desc: '9 headers checked' },
                { icon: '🌐', label: 'DNS Records', desc: 'SPF, DMARC, MX, NS' },
                { icon: '🛡️', label: 'SSL Check', desc: 'Certificate validity' },
                { icon: '📊', label: 'Score / 100', desc: 'Overall rating' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '1rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '10px', border: `1px solid ${border}` }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <p style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '0.8rem', fontWeight: '600' }}>{item.label}</p>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results && !results.error && (
          <>
            {/* Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: cardBg, border: `2px solid ${gradeColor}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: gradeColor }} />
                <p style={{ margin: '0 0 0.25rem', color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Overall Grade</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '3.5rem', fontWeight: '800', color: gradeColor, lineHeight: 1 }}>{results.grade}</p>
                <p style={{ margin: 0, color: gradeColor, fontWeight: '700' }}>{results.overallScore}/100</p>
              </div>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>🔒 Headers Score</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '2.5rem', fontWeight: '800', color: (results.headers?.score || 0) >= 70 ? '#10B981' : '#EF4444' }}>{results.headers?.grade || 'N/A'}</p>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{results.headers?.score || 0}/100</p>
              </div>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>🌐 DNS Score</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '2.5rem', fontWeight: '800', color: (results.dns?.score || 0) >= 70 ? '#10B981' : '#EF4444' }}>{results.dns?.score || 0}</p>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>/ 100</p>
              </div>
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>📊 Summary</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: '700', color: '#10B981' }}>{results.headers?.passCount || 0} Pass</p>
                <p style={{ margin: 0, color: '#EF4444', fontSize: '0.875rem', fontWeight: '600' }}>{results.headers?.failCount || 0} Fail</p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {['overview', 'headers', 'dns'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: '0.5rem 1.25rem', borderRadius: '8px',
                  border: activeTab === tab ? 'none' : `1px solid ${border}`,
                  background: activeTab === tab ? '#10B981' : cardBg,
                  color: activeTab === tab ? 'white' : textMuted,
                  fontFamily: 'inherit', fontSize: '0.875rem',
                  cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400',
                  transition: 'all 0.2s', textTransform: 'capitalize'
                }}>
                  {tab === 'overview' ? '📊 Overview' : tab === 'headers' ? '🔒 Headers' : '🌐 DNS'}
                </button>
              ))}
            </div>

            {/* Overview */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Security Breakdown</h3>
                  {[
                    { label: 'HTTP Security Headers', score: results.headers?.score || 0, color: (results.headers?.score || 0) >= 70 ? '#10B981' : '#EF4444' },
                    { label: 'DNS Security', score: results.dns?.score || 0, color: (results.dns?.score || 0) >= 70 ? '#10B981' : '#EF4444' },
                    { label: 'Overall Score', score: results.overallScore, color: gradeColor },
                  ].map((item, i) => (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ color: textMuted, fontSize: '0.875rem' }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: '700', fontSize: '0.875rem' }}>{item.score}/100</span>
                      </div>
                      <div style={{ height: '8px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.score}%`, background: item.color, borderRadius: '4px', transition: 'width 1s ease', boxShadow: `0 0 8px ${item.color}50` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>⚡ Critical Issues</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {results.headers?.checks?.filter(c => !c.present && c.critical).slice(0, 3).map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.25rem', color: '#EF4444', fontSize: '0.8rem', fontWeight: '700' }}>❌ {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.recommendation}</p>
                      </div>
                    ))}
                    {results.dns?.securityChecks?.filter(c => !c.present && c.severity === 'high').map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.25rem', color: '#F59E0B', fontSize: '0.8rem', fontWeight: '700' }}>⚠️ {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                      </div>
                    ))}
                    {(!results.headers?.checks?.some(c => !c.present && c.critical)) && (
                      <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: 0, color: '#10B981', fontSize: '0.875rem', fontWeight: '600' }}>✅ No critical header issues!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Headers Tab */}
            {activeTab === 'headers' && results.headers && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>HTTP Security Headers</h3>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{results.headers.passCount} passing · {results.headers.failCount} missing</p>
                  </div>
                  <span style={{ padding: '0.3rem 1rem', borderRadius: '20px', background: results.headers.score >= 70 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: results.headers.score >= 70 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '0.875rem' }}>{results.headers.grade} — {results.headers.score}/100</span>
                </div>
                {results.headers.checks.map((check, i) => (
                  <div key={i} style={{ padding: '1rem 1.5rem', borderBottom: i < results.headers.checks.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: check.present ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                        {check.present ? '✅' : '❌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ color: textMain, fontWeight: '600', fontSize: '0.875rem' }}>{check.name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {check.critical && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600' }}>Critical</span>}
                            <span style={{ color: textMuted, fontSize: '0.75rem' }}>+{check.weight}pts</span>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 0.25rem', color: textMuted, fontSize: '0.8rem' }}>{check.description}</p>
                        {check.value && <p style={{ margin: 0, color: '#10B981', fontSize: '0.75rem', fontFamily: 'monospace', background: darkMode ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{check.value}</p>}
                        {!check.present && <p style={{ margin: '0.25rem 0 0', color: '#F59E0B', fontSize: '0.75rem' }}>💡 {check.recommendation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
                {results.headers.exposedHeaders?.length > 0 && (
                  <div style={{ padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.05)', borderTop: '1px solid rgba(239,68,68,0.1)' }}>
                    <p style={{ margin: '0 0 0.5rem', color: '#EF4444', fontWeight: '600', fontSize: '0.875rem' }}>⚠️ Exposed Server Info:</p>
                    {results.headers.exposedHeaders.map((h, i) => (
                      <p key={i} style={{ margin: '0.25rem 0 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>{h.name}: {h.value}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* DNS Tab */}
            {activeTab === 'dns' && results.dns && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>DNS Security Checks</h3>
                  {results.dns.securityChecks.map((check, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < results.dns.securityChecks.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{check.present ? '✅' : check.severity === 'high' ? '🚨' : '⚠️'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 0.2rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                        {check.value && <p style={{ margin: '0.25rem 0 0', color: '#10B981', fontSize: '0.7rem', fontFamily: 'monospace' }}>{check.value.slice(0, 80)}{check.value.length > 80 ? '...' : ''}</p>}
                      </div>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700', background: check.severity === 'high' ? 'rgba(239,68,68,0.1)' : check.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)', color: check.severity === 'high' ? '#EF4444' : check.severity === 'medium' ? '#F59E0B' : '#6B7280', flexShrink: 0 }}>{check.severity}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>IP & Location</h3>
                    {results.dns.ipAddresses?.map((ip, i) => (
                      <p key={i} style={{ margin: '0 0 0.25rem', color: '#10B981', fontFamily: 'monospace', fontSize: '0.875rem' }}>🌐 {ip}</p>
                    ))}
                    {results.dns.geoInfo && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${border}` }}>
                        {results.dns.geoInfo.city && <p style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem' }}>📍 {results.dns.geoInfo.city}, {results.dns.geoInfo.country}</p>}
                        {results.dns.geoInfo.org && <p style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem' }}>🏢 {results.dns.geoInfo.org}</p>}
                        {results.dns.geoInfo.isp && <p style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem' }}>📡 {results.dns.geoInfo.isp}</p>}
                      </div>
                    )}
                  </div>
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Nameservers</h3>
                    {results.dns.nameservers?.map((ns, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>🔷 {ns}</p>)}
                  </div>
                  {results.dns.mxRecords?.length > 0 && (
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>MX Records</h3>
                      {results.dns.mxRecords.map((mx, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>📧 {mx.exchange} (priority: {mx.priority})</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {results?.error && (
          <div style={{ background: cardBg, border: '1px solid rgba(239,68,68,0.3)', borderRadius: '14px', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: '#EF4444', margin: 0 }}>❌ Scan failed: {results.error}</p>
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  )
}