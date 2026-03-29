'use client'
import { useState } from 'react'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function SiteAudit() {
  const darkMode = useTheme()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState({ headers: false, dns: false, ssl: false })
  const [results, setResults] = useState({ headers: null, dns: null, ssl: null })
  const [errors, setErrors] = useState({ headers: null, dns: null, ssl: null })
  const [activeTab, setActiveTab] = useState('overview')
  const [sslPolling, setSslPolling] = useState(false)

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  async function runAudit() {
    if (!url.trim()) return
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`

    setResults({ headers: null, dns: null, ssl: null })
    setErrors({ headers: null, dns: null, ssl: null })
    setLoading({ headers: true, dns: true, ssl: true })
    setActiveTab('overview')

    // Run headers + DNS in parallel
    const [headersRes, dnsRes] = await Promise.all([
      fetch('/api/headers-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) }),
      fetch('/api/dns-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) }),
    ])

    const headersData = await headersRes.json()
    const dnsData = await dnsRes.json()

    setResults(prev => ({ ...prev, headers: headersData.error ? null : headersData, dns: dnsData.error ? null : dnsData }))
    setErrors(prev => ({ ...prev, headers: headersData.error || null, dns: dnsData.error || null }))
    setLoading(prev => ({ ...prev, headers: false, dns: false }))

    // SSL check - may need polling
    await checkSSL(cleanUrl)
  }

  async function checkSSL(cleanUrl, attempt = 0) {
    try {
      const sslRes = await fetch('/api/ssl-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) })
      const sslData = await sslRes.json()

      if (sslData.inProgress && attempt < 12) {
        setSslPolling(true)
        setTimeout(() => checkSSL(cleanUrl, attempt + 1), 10000)
      } else {
        setSslPolling(false)
        setResults(prev => ({ ...prev, ssl: sslData.error ? null : sslData }))
        setErrors(prev => ({ ...prev, ssl: sslData.error || null }))
        setLoading(prev => ({ ...prev, ssl: false }))
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, ssl: err.message }))
      setLoading(prev => ({ ...prev, ssl: false }))
      setSslPolling(false)
    }
  }

  const isLoading = Object.values(loading).some(Boolean)

  // Calculate overall score
  const overallScore = (() => {
    let scores = []
    let weights = []
    if (results.headers) { scores.push(results.headers.score); weights.push(0.4) }
    if (results.dns) { scores.push(results.dns.score); weights.push(0.3) }
    if (results.ssl) { scores.push(results.ssl.score); weights.push(0.3) }
    if (scores.length === 0) return null
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    return Math.round(scores.reduce((sum, s, i) => sum + s * (weights[i] / totalWeight), 0))
  })()

  const overallGrade = overallScore === null ? null : overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F'
  const gradeColor = overallGrade === 'A+' || overallGrade === 'A' ? '#10B981' : overallGrade === 'B' ? '#6366F1' : overallGrade === 'C' ? '#F59E0B' : '#EF4444'

  const inputStyle = { flex: 1, padding: '0.875rem 1rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '10px', color: textMain, fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }

  const tabs = ['overview', 'headers', 'ssl', 'dns']

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>🔍 Site Security Auditor</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Check SSL certificate, HTTP security headers, DNS records and get a security score.</p>
        </div>

        {/* URL Input */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter URL to audit — e.g. google.com or https://example.com"
              style={inputStyle} onKeyDown={e => e.key === 'Enter' && runAudit()}
              onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
            <button onClick={runAudit} disabled={isLoading || !url.trim()} style={{ padding: '0.875rem 2rem', background: isLoading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '700', transition: 'all 0.2s', boxShadow: isLoading ? 'none' : '0 4px 15px rgba(16,185,129,0.3)' }}>
              {isLoading ? '⏳ Scanning...' : '🔍 Run Audit'}
            </button>
          </div>

          {/* Quick examples */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap' }}>
            <span style={{ color: textMuted, fontSize: '0.8rem' }}>Try:</span>
            {['google.com', 'github.com', 'cloudflare.com'].map(site => (
              <button key={site} onClick={() => { setUrl(site); }} style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', border: `1px solid ${border}`, background: 'transparent', color: '#10B981', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >{site}</button>
            ))}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem', transition: 'background 0.3s' }}>
            <h3 style={{ color: textMain, margin: '0 0 1.5rem', fontSize: '1rem' }}>🔍 Scanning {url}...</h3>
            {[
              { label: 'HTTP Security Headers', key: 'headers', icon: '🔒' },
              { label: 'DNS Records & Security', key: 'dns', icon: '🌐' },
              { label: `SSL Certificate ${sslPolling ? '(SSL Labs analyzing, ~60s)' : ''}`, key: 'ssl', icon: '🛡️' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                <span style={{ color: textMain, fontSize: '0.875rem', flex: 1 }}>{item.label}</span>
                {loading[item.key]
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: '16px', height: '16px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><span style={{ color: textMuted, fontSize: '0.8rem' }}>Scanning...</span></div>
                  : results[item.key] ? <span style={{ color: '#10B981', fontWeight: '600', fontSize: '0.875rem' }}>✅ Done</span>
                  : errors[item.key] ? <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>❌ {errors[item.key]}</span>
                  : null
                }
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {(results.headers || results.dns || results.ssl) && (
          <>
            {/* Score Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Overall Score */}
              <div style={{ background: cardBg, border: `2px solid ${gradeColor || border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: gradeColor || '#10B981' }} />
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase' }}>Overall Score</p>
                <p style={{ margin: '0 0 0.25rem', fontSize: '3rem', fontWeight: '800', color: gradeColor || textMain }}>{overallGrade || '-'}</p>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: gradeColor || textMuted }}>{overallScore !== null ? `${overallScore}/100` : '-'}</p>
              </div>

              {/* Headers Score */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center', transition: 'background 0.3s' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>🔒 Headers</p>
                {loading.headers
                  ? <div style={{ margin: '0 auto', width: '24px', height: '24px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : results.headers
                  ? <><p style={{ margin: '0 0 0.25rem', fontSize: '2.5rem', fontWeight: '800', color: results.headers.score >= 80 ? '#10B981' : results.headers.score >= 60 ? '#F59E0B' : '#EF4444' }}>{results.headers.grade}</p><p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>{results.headers.score}/100</p></>
                  : <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem' }}>{errors.headers || 'Failed'}</p>
                }
              </div>

              {/* SSL Score */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center', transition: 'background 0.3s' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>🛡️ SSL</p>
                {loading.ssl
                  ? <div style={{ margin: '0 auto', width: '24px', height: '24px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : results.ssl
                  ? <><p style={{ margin: '0 0 0.25rem', fontSize: '2.5rem', fontWeight: '800', color: results.ssl.grade?.startsWith('A') ? '#10B981' : results.ssl.grade === 'B' ? '#6366F1' : '#EF4444' }}>{results.ssl.grade}</p><p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>{results.ssl.score}/100</p></>
                  : <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem' }}>{errors.ssl || 'Failed'}</p>
                }
              </div>

              {/* DNS Score */}
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', textAlign: 'center', transition: 'background 0.3s' }}>
                <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem' }}>🌐 DNS</p>
                {loading.dns
                  ? <div style={{ margin: '0 auto', width: '24px', height: '24px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : results.dns
                  ? <><p style={{ margin: '0 0 0.25rem', fontSize: '2.5rem', fontWeight: '800', color: results.dns.score >= 80 ? '#10B981' : results.dns.score >= 60 ? '#F59E0B' : '#EF4444' }}>{results.dns.score}</p><p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>/ 100</p></>
                  : <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem' }}>{errors.dns || 'Failed'}</p>
                }
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: activeTab === tab ? 'none' : `1px solid ${border}`, background: activeTab === tab ? '#10B981' : cardBg, color: activeTab === tab ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', transition: 'all 0.2s', textTransform: 'capitalize' }}>
                  {tab === 'overview' ? '📊 Overview' : tab === 'headers' ? '🔒 Headers' : tab === 'ssl' ? '🛡️ SSL' : '🌐 DNS'}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Security Summary */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Security Summary</h3>
                  {[
                    { label: 'HTTP Security Headers', score: results.headers?.score, grade: results.headers?.grade, pass: results.headers?.passCount, fail: results.headers?.failCount, color: results.headers?.score >= 80 ? '#10B981' : '#EF4444' },
                    { label: 'SSL Certificate', score: results.ssl?.score, grade: results.ssl?.grade, color: results.ssl?.grade?.startsWith('A') ? '#10B981' : '#EF4444' },
                    { label: 'DNS Security', score: results.dns?.score, grade: null, color: results.dns?.score >= 80 ? '#10B981' : '#EF4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <span style={{ color: textMuted, fontSize: '0.875rem' }}>{item.label}</span>
                        <span style={{ color: item.color, fontWeight: '700', fontSize: '0.875rem' }}>{item.grade || (item.score !== undefined ? `${item.score}/100` : '-')}</span>
                      </div>
                      <div style={{ height: '8px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.score || 0}%`, background: item.color, borderRadius: '4px', transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Wins */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>⚡ Quick Wins</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {results.headers?.checks?.filter(c => !c.present && c.critical).slice(0, 3).map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.25rem', color: '#EF4444', fontSize: '0.8rem', fontWeight: '700' }}>❌ Missing: {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', lineHeight: 1.5 }}>{check.recommendation}</p>
                      </div>
                    ))}
                    {results.ssl?.vulnerabilities && Object.entries(results.ssl.vulnerabilities).filter(([, v]) => v).map(([k, ], i) => (
                      <div key={k + i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem', fontWeight: '700' }}>🚨 SSL Vulnerability: {k.toUpperCase()}</p>
                      </div>
                    ))}
                    {results.dns?.securityChecks?.filter(c => !c.present && c.severity === 'high').map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.25rem', color: '#F59E0B', fontSize: '0.8rem', fontWeight: '700' }}>⚠️ Missing: {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                      </div>
                    ))}
                    {(!results.headers?.checks?.some(c => !c.present && c.critical)) && (!results.ssl?.vulnerabilities || !Object.values(results.ssl.vulnerabilities || {}).some(Boolean)) && (
                      <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: 0, color: '#10B981', fontSize: '0.875rem', fontWeight: '600' }}>✅ No critical issues found!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Headers Tab */}
            {activeTab === 'headers' && results.headers && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', transition: 'background 0.3s' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>HTTP Security Headers</h3>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{results.headers.passCount} passing · {results.headers.failCount} missing</p>
                  </div>
                  <span style={{ padding: '0.3rem 1rem', borderRadius: '20px', background: results.headers.score >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: results.headers.score >= 80 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '0.875rem' }}>{results.headers.grade} — {results.headers.score}/100</span>
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ color: textMain, fontWeight: '600', fontSize: '0.875rem' }}>{check.name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                  <div style={{ padding: '1rem 1.5rem', background: 'rgba(239,68,68,0.05)', borderTop: `1px solid rgba(239,68,68,0.1)` }}>
                    <p style={{ margin: '0 0 0.5rem', color: '#EF4444', fontWeight: '600', fontSize: '0.875rem' }}>⚠️ Exposed Server Info (should be hidden):</p>
                    {results.headers.exposedHeaders.map((h, i) => (
                      <p key={i} style={{ margin: '0.25rem 0 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>{h.name}: {h.value}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SSL Tab */}
            {activeTab === 'ssl' && (
              <div>
                {loading.ssl ? (
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '3rem', textAlign: 'center', transition: 'background 0.3s' }}>
                    <div style={{ width: '40px', height: '40px', border: `3px solid ${border}`, borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem' }}>SSL Labs Analyzing...</p>
                    <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>This takes ~60 seconds for first scan</p>
                  </div>
                ) : results.ssl ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                      <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Certificate Details</h3>
                      {[
                        { label: 'Grade', value: results.ssl.grade, color: results.ssl.grade?.startsWith('A') ? '#10B981' : '#EF4444' },
                        { label: 'Issuer', value: results.ssl.issuer },
                        { label: 'Valid From', value: results.ssl.validFrom },
                        { label: 'Valid To', value: results.ssl.validTo },
                        { label: 'Days Remaining', value: results.ssl.daysLeft !== null ? `${results.ssl.daysLeft} days` : 'Unknown', color: results.ssl.daysLeft < 30 ? '#EF4444' : results.ssl.daysLeft < 90 ? '#F59E0B' : '#10B981' },
                        { label: 'Protocol', value: results.ssl.protocol },
                        { label: 'Key Strength', value: results.ssl.keyStrength ? `${results.ssl.keyStrength} bits` : 'Unknown' },
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: `1px solid ${border}` }}>
                          <span style={{ color: textMuted, fontSize: '0.875rem' }}>{item.label}</span>
                          <span style={{ color: item.color || textMain, fontWeight: '600', fontSize: '0.875rem' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                      <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Vulnerability Checks</h3>
                      {Object.entries(results.ssl.vulnerabilities || {}).map(([key, vulnerable], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: `1px solid ${border}` }}>
                          <span style={{ color: textMain, fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: '500' }}>{key}</span>
                          <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: vulnerable ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: vulnerable ? '#EF4444' : '#10B981' }}>
                            {vulnerable ? '🔴 Vulnerable' : '✅ Safe'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '3rem', textAlign: 'center', transition: 'background 0.3s' }}>
                    <p style={{ color: '#EF4444', margin: 0 }}>❌ {errors.ssl || 'SSL check failed'}</p>
                  </div>
                )}
              </div>
            )}

            {/* DNS Tab */}
            {activeTab === 'dns' && results.dns && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>DNS Security Checks</h3>
                  {results.dns.securityChecks.map((check, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < results.dns.securityChecks.length - 1 ? `1px solid ${border}` : 'none' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{check.present ? '✅' : check.severity === 'high' ? '🚨' : '⚠️'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 0.2rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                        {check.value && <p style={{ margin: '0.25rem 0 0', color: '#10B981', fontSize: '0.7rem', fontFamily: 'monospace' }}>{check.value.slice(0, 60)}{check.value.length > 60 ? '...' : ''}</p>}
                      </div>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700', background: check.severity === 'high' ? 'rgba(239,68,68,0.1)' : check.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)', color: check.severity === 'high' ? '#EF4444' : check.severity === 'medium' ? '#F59E0B' : '#6B7280', flexShrink: 0 }}>{check.severity}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* IP + Geo */}
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                    <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>IP & Location</h3>
                    {results.dns.ipAddresses.map((ip, i) => (
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

                  {/* Nameservers */}
                  <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                    <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Nameservers</h3>
                    {results.dns.nameservers.length > 0
                      ? results.dns.nameservers.map((ns, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>🔷 {ns}</p>)
                      : <p style={{ color: textMuted, fontSize: '0.8rem', margin: 0 }}>None found</p>
                    }
                  </div>

                  {/* MX Records */}
                  {results.dns.mxRecords.length > 0 && (
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'background 0.3s' }}>
                      <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>MX Records (Email)</h3>
                      {results.dns.mxRecords.map((mx, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>📧 {mx.exchange} (priority: {mx.priority})</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && !results.headers && !results.dns && !results.ssl && (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '4rem', textAlign: 'center', transition: 'background 0.3s' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h2 style={{ color: textMain, margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Ready to Audit</h2>
            <p style={{ color: textMuted, margin: '0 0 2rem', fontSize: '0.875rem' }}>Enter any domain above to check SSL, headers, DNS and get a security score out of 100</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              {[
                { icon: '🛡️', label: 'SSL Certificate', desc: 'Grade & validity check' },
                { icon: '🔒', label: 'Security Headers', desc: '9 headers checked' },
                { icon: '🌐', label: 'DNS Records', desc: 'SPF, DMARC, MX, NS' },
                { icon: '📊', label: 'Security Score', desc: 'Score out of 100' },
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

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </main>
    </div>
  )
}