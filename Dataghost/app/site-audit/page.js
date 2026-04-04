'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'
import { supabase } from '@/lib/supabase'

function SiteAuditInner() {
  const darkMode = useTheme()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [url, setUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search)
      return p.get('url') || ''
    }
    return ''
  })
  const [loading, setLoading] = useState({ headers: false, dns: false, ssl: false })
  const [results, setResults] = useState({ headers: null, dns: null, ssl: null })
  const [errors, setErrors] = useState({ headers: null, dns: null, ssl: null })
  const [activeTab, setActiveTab] = useState('overview')
  const [sslPolling, setSslPolling] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function saveToHistory(cleanUrl, headersData, dnsData, sslData, score, grade) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const hostname = new URL(cleanUrl).hostname
      await supabase.from('scan_history').insert([{
        user_id: session.user.id,
        url: cleanUrl,
        hostname,
        score,
        grade,
        headers_score: headersData?.score || null,
        headers_pass: headersData?.passCount || 0,
        headers_fail: headersData?.failCount || 0,
        dns_score: dnsData?.score || null,
        ssl_score: sslData?.score || null,
        ssl_valid: sslData ? !sslData.expired : null,
        headers_data: headersData ? { checks: headersData.checks, exposedHeaders: headersData.exposedHeaders } : null,
      }])
      setSaved(true)
      showToast('💾 Scan saved to history!')
    } catch (err) {
      console.error('Failed to save scan:', err)
    }
  }

  async function runAudit() {
    if (!url.trim()) return
    const cleanUrl = url.startsWith('http') ? url : 'https://' + url
    setResults({ headers: null, dns: null, ssl: null })
    setErrors({ headers: null, dns: null, ssl: null })
    setLoading({ headers: true, dns: true, ssl: true })
    setActiveTab('overview')
    setSaved(false)

    const [headersRes, dnsRes] = await Promise.all([
      fetch('/api/headers-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) }),
      fetch('/api/dns-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) }),
    ])
    const headersData = await headersRes.json()
    const dnsData = await dnsRes.json()
    const hd = headersData.error ? null : headersData
    const dd = dnsData.error ? null : dnsData
    setResults(prev => ({ ...prev, headers: hd, dns: dd }))
    setErrors(prev => ({ ...prev, headers: headersData.error || null, dns: dnsData.error || null }))
    setLoading(prev => ({ ...prev, headers: false, dns: false }))
    await checkSSL(cleanUrl, 0, hd, dd)
  }

  async function checkSSL(cleanUrl, attempt, headersData, dnsData) {
    try {
      const sslRes = await fetch('/api/ssl-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: cleanUrl }) })
      const sslData = await sslRes.json()
      if (sslData.inProgress && attempt < 12) {
        setSslPolling(true)
        setTimeout(() => checkSSL(cleanUrl, attempt + 1, headersData, dnsData), 10000)
      } else {
        setSslPolling(false)
        const sd = sslData.error ? null : sslData
        setResults(prev => ({ ...prev, ssl: sd }))
        setErrors(prev => ({ ...prev, ssl: sslData.error || null }))
        setLoading(prev => ({ ...prev, ssl: false }))
        // Save to history once everything is done
        const scores = [], weights = []
        if (headersData) { scores.push(headersData.score); weights.push(0.4) }
        if (dnsData) { scores.push(dnsData.score); weights.push(0.3) }
        if (sd) { scores.push(sd.score); weights.push(0.3) }
        if (scores.length > 0) {
          const totalWeight = weights.reduce((a, b) => a + b, 0)
          const score = Math.round(scores.reduce((sum, s, i) => sum + s * (weights[i] / totalWeight), 0))
          const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F'
          saveToHistory(cleanUrl, headersData, dnsData, sd, score, grade)
        }
      }
    } catch (err) {
      setErrors(prev => ({ ...prev, ssl: err.message }))
      setLoading(prev => ({ ...prev, ssl: false }))
      setSslPolling(false)
    }
  }

  const isLoading = Object.values(loading).some(Boolean)

  const overallScore = (() => {
    let scores = [], weights = []
    if (results.headers) { scores.push(results.headers.score); weights.push(0.4) }
    if (results.dns) { scores.push(results.dns.score); weights.push(0.3) }
    if (results.ssl) { scores.push(results.ssl.score); weights.push(0.3) }
    if (scores.length === 0) return null
    const tw = weights.reduce((a, b) => a + b, 0)
    return Math.round(scores.reduce((sum, s, i) => sum + s * (weights[i] / tw), 0))
  })()

  const overallGrade = overallScore === null ? null : overallScore >= 90 ? 'A+' : overallScore >= 80 ? 'A' : overallScore >= 70 ? 'B' : overallScore >= 60 ? 'C' : overallScore >= 50 ? 'D' : 'F'
  const gradeColor = !overallGrade ? '#6B7280' : (overallGrade === 'A+' || overallGrade === 'A') ? '#10B981' : overallGrade === 'B' ? '#6366F1' : overallGrade === 'C' ? '#F59E0B' : '#EF4444'
  const inputStyle = { flex: 1, padding: '0.875rem 1rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: '1px solid ' + border, borderRadius: '10px', color: textMain, fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s' }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.75rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 9999, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>🔍 Site Security Auditor</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Check SSL certificate, HTTP security headers, DNS records and get a security score.</p>
          </div>
          <button onClick={() => router.push('/scan-history')} style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid ' + border, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = textMuted }}>
            🕐 Scan History
          </button>
        </div>

        <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', transition: 'background 0.3s' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter URL to audit — e.g. google.com or https://example.com"
              style={inputStyle} onKeyDown={e => e.key === 'Enter' && !isLoading && runAudit()}
              onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
            <button onClick={runAudit} disabled={isLoading || !url.trim()} style={{ padding: '0.875rem 2rem', background: isLoading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', fontSize: '0.95rem', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '700', transition: 'all 0.2s', boxShadow: isLoading ? 'none' : '0 4px 15px rgba(16,185,129,0.3)' }}>
              {isLoading ? '⏳ Scanning...' : '🔍 Run Audit'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ color: textMuted, fontSize: '0.8rem' }}>Try:</span>
            {['google.com', 'github.com', 'cloudflare.com'].map(site => (
              <button key={site} onClick={() => setUrl(site)} style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid ' + border, background: 'transparent', color: '#10B981', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{site}</button>
            ))}
            {saved && <span style={{ marginLeft: 'auto', color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>💾 Saved to history</span>}
          </div>
        </div>

        {isLoading && (
          <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', transition: 'background 0.3s' }}>
            <p style={{ color: textMain, fontWeight: '600', margin: '0 0 1rem', fontSize: '0.95rem' }}>🔎 Scanning {url}...</p>
            {[
              { key: 'headers', label: 'HTTP Security Headers', icon: '🔒' },
              { key: 'dns', label: 'DNS Records & Security', icon: '🌐' },
              { key: 'ssl', label: 'SSL Certificate' + (sslPolling ? ' (SSL Labs ~60s)' : ''), icon: '🛡️' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem', width: '24px' }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: textMain, fontSize: '0.875rem' }}>{item.label}</span>
                    <span style={{ color: loading[item.key] ? '#F59E0B' : '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>{loading[item.key] ? '⏳ Running...' : '✅ Done'}</span>
                  </div>
                  <div style={{ height: '4px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '2px', width: loading[item.key] ? '60%' : '100%', background: loading[item.key] ? '#F59E0B' : '#10B981', transition: 'all 0.5s ease' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {(results.headers || results.dns || results.ssl) && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: overallScore !== null ? '200px 1fr' : '1fr', gap: '1rem', marginBottom: '1.5rem', alignItems: 'start' }}>
              {overallScore !== null && (
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem', textAlign: 'center', transition: 'background 0.3s' }}>
                  <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Score</p>
                  <div style={{ fontSize: '3.5rem', fontWeight: '900', color: gradeColor, lineHeight: 1, marginBottom: '0.25rem' }}>{overallGrade}</div>
                  <p style={{ margin: '0 0 0.75rem', color: gradeColor, fontSize: '1.1rem', fontWeight: '700' }}>{overallScore}/100</p>
                  <div style={{ height: '6px', background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', borderRadius: '3px', width: overallScore + '%', background: 'linear-gradient(90deg, ' + gradeColor + ', ' + gradeColor + '88)', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {results.headers && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: textMuted }}>Headers</span><span style={{ color: results.headers.score >= 70 ? '#10B981' : '#EF4444', fontWeight: '600' }}>{results.headers.score}/100</span></div>}
                    {results.dns && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: textMuted }}>DNS</span><span style={{ color: results.dns.score >= 70 ? '#10B981' : '#EF4444', fontWeight: '600' }}>{results.dns.score}/100</span></div>}
                    {results.ssl && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}><span style={{ color: textMuted }}>SSL</span><span style={{ color: results.ssl.score >= 70 ? '#10B981' : '#EF4444', fontWeight: '600' }}>{results.ssl.score}/100</span></div>}
                  </div>
                </div>
              )}
              <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1rem', transition: 'background 0.3s' }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {['overview', 'headers', 'ssl', 'dns'].map(tab => {
                    const labels = { overview: '📊 Overview', headers: '🔒 Headers', ssl: '🛡️ SSL', dns: '🌐 DNS' }
                    return (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid ' + (activeTab === tab ? '#10B981' : border), background: activeTab === tab ? 'rgba(16,185,129,0.1)' : 'transparent', color: activeTab === tab ? '#10B981' : textMuted, fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer', fontWeight: activeTab === tab ? '600' : '400', transition: 'all 0.15s' }}>
                        {labels[tab]}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {results.headers && <>
                    <div style={{ padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid ' + border }}>
                      <p style={{ margin: '0 0 0.2rem', color: textMuted, fontSize: '0.7rem' }}>Headers Passing</p>
                      <p style={{ margin: 0, color: '#10B981', fontWeight: '700', fontSize: '1.1rem' }}>{results.headers.passCount}/{results.headers.passCount + results.headers.failCount}</p>
                    </div>
                    <div style={{ padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid ' + border }}>
                      <p style={{ margin: '0 0 0.2rem', color: textMuted, fontSize: '0.7rem' }}>Headers Failing</p>
                      <p style={{ margin: 0, color: results.headers.failCount > 3 ? '#EF4444' : '#F59E0B', fontWeight: '700', fontSize: '1.1rem' }}>{results.headers.failCount}</p>
                    </div>
                  </>}
                  {results.ssl && <div style={{ padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid ' + border }}>
                    <p style={{ margin: '0 0 0.2rem', color: textMuted, fontSize: '0.7rem' }}>SSL Grade</p>
                    <p style={{ margin: 0, color: results.ssl.grade?.startsWith('A') ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '1.1rem' }}>{results.ssl.grade || 'N/A'}</p>
                  </div>}
                  {results.ssl?.daysLeft !== undefined && <div style={{ padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: '1px solid ' + border }}>
                    <p style={{ margin: '0 0 0.2rem', color: textMuted, fontSize: '0.7rem' }}>SSL Days Left</p>
                    <p style={{ margin: 0, color: results.ssl.daysLeft < 30 ? '#EF4444' : results.ssl.daysLeft < 90 ? '#F59E0B' : '#10B981', fontWeight: '700', fontSize: '1.1rem' }}>{results.ssl.daysLeft}d</p>
                  </div>}
                </div>
              </div>
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>🚨 Critical Issues</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {results.headers?.checks?.filter(c => !c.present && c.critical).map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.2rem', color: '#EF4444', fontSize: '0.8rem', fontWeight: '700' }}>❌ Missing: {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.recommendation}</p>
                      </div>
                    ))}
                    {results.ssl?.vulnerabilities && Object.entries(results.ssl.vulnerabilities).filter(([, v]) => v).map(([k], i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: 0, color: '#EF4444', fontSize: '0.8rem', fontWeight: '700' }}>🚨 SSL Vulnerability: {k.toUpperCase()}</p>
                      </div>
                    ))}
                    {results.dns?.securityChecks?.filter(c => !c.present && c.severity === 'high').map((check, i) => (
                      <div key={i} style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                        <p style={{ margin: '0 0 0.2rem', color: '#F59E0B', fontSize: '0.8rem', fontWeight: '700' }}>⚠️ Missing: {check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                      </div>
                    ))}
                    {!results.headers?.checks?.some(c => !c.present && c.critical) && !Object.values(results.ssl?.vulnerabilities || {}).some(Boolean) && (
                      <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
                        <p style={{ margin: 0, color: '#10B981', fontSize: '0.875rem', fontWeight: '600' }}>✅ No critical issues found!</p>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>💡 Recommendations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {results.headers?.checks?.filter(c => !c.present).slice(0, 5).map((check, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid ' + border }}>
                        <span style={{ color: '#F59E0B', flexShrink: 0 }}>💡</span>
                        <div>
                          <p style={{ margin: '0 0 0.15rem', color: textMain, fontSize: '0.8rem', fontWeight: '600' }}>Add {check.name}</p>
                          <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.recommendation}</p>
                        </div>
                      </div>
                    ))}
                    {results.ssl?.daysLeft < 90 && (
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid ' + border }}>
                        <span style={{ color: '#EF4444', flexShrink: 0 }}>🔴</span>
                        <div>
                          <p style={{ margin: '0 0 0.15rem', color: textMain, fontSize: '0.8rem', fontWeight: '600' }}>Renew SSL Certificate</p>
                          <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>Only {results.ssl.daysLeft} days remaining.</p>
                        </div>
                      </div>
                    )}
                    {!results.headers?.checks?.some(c => !c.present) && !(results.ssl?.daysLeft < 90) && (
                      <p style={{ color: '#10B981', fontSize: '0.875rem', margin: 0, fontWeight: '600' }}>🎉 Looking great! No major improvements needed.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'headers' && results.headers && (
              <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid ' + border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>HTTP Security Headers</h3>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{results.headers.passCount} passing · {results.headers.failCount} missing</p>
                  </div>
                  <span style={{ padding: '0.3rem 1rem', borderRadius: '20px', background: results.headers.score >= 80 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: results.headers.score >= 80 ? '#10B981' : '#EF4444', fontWeight: '700', fontSize: '0.875rem' }}>{results.headers.grade} — {results.headers.score}/100</span>
                </div>
                {results.headers.checks.map((check, i) => (
                  <div key={i} style={{ padding: '1rem 1.5rem', borderBottom: i < results.headers.checks.length - 1 ? '1px solid ' + border : 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: check.present ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{check.present ? '✅' : '❌'}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ color: textMain, fontWeight: '600', fontSize: '0.875rem' }}>{check.name}</span>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {check.critical && <span style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '600' }}>Critical</span>}
                            <span style={{ color: textMuted, fontSize: '0.75rem' }}>+{check.weight}pts</span>
                          </div>
                        </div>
                        <p style={{ margin: '0 0 0.25rem', color: textMuted, fontSize: '0.8rem' }}>{check.description}</p>
                        {check.value && <p style={{ margin: 0, color: '#10B981', fontSize: '0.75rem', fontFamily: 'monospace', background: 'rgba(16,185,129,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>{check.value}</p>}
                        {!check.present && <p style={{ margin: '0.25rem 0 0', color: '#F59E0B', fontSize: '0.75rem' }}>💡 {check.recommendation}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ssl' && (
              loading.ssl ? (
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid ' + border, borderTop: '3px solid #10B981', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                  <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem' }}>SSL Labs Analyzing...</p>
                  <p style={{ color: textMuted, fontSize: '0.875rem', margin: 0 }}>This takes ~60 seconds for first scan</p>
                </div>
              ) : results.ssl ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Certificate Details</h3>
                    {[
                      { label: 'Grade', value: results.ssl.grade, color: results.ssl.grade?.startsWith('A') ? '#10B981' : '#EF4444' },
                      { label: 'Issuer', value: results.ssl.issuer },
                      { label: 'Valid From', value: results.ssl.validFrom },
                      { label: 'Valid To', value: results.ssl.validTo },
                      { label: 'Days Remaining', value: results.ssl.daysLeft !== null ? results.ssl.daysLeft + ' days' : 'Unknown', color: results.ssl.daysLeft < 30 ? '#EF4444' : results.ssl.daysLeft < 90 ? '#F59E0B' : '#10B981' },
                      { label: 'Protocol', value: results.ssl.protocol },
                      { label: 'Key Strength', value: results.ssl.keyStrength ? results.ssl.keyStrength + ' bits' : 'Unknown' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid ' + border }}>
                        <span style={{ color: textMuted, fontSize: '0.875rem' }}>{item.label}</span>
                        <span style={{ color: item.color || textMain, fontWeight: '600', fontSize: '0.875rem' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Vulnerability Checks</h3>
                    {Object.entries(results.ssl.vulnerabilities || {}).map(([key, vulnerable], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid ' + border }}>
                        <span style={{ color: textMain, fontSize: '0.875rem', textTransform: 'uppercase', fontWeight: '500' }}>{key}</span>
                        <span style={{ padding: '0.2rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: vulnerable ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: vulnerable ? '#EF4444' : '#10B981' }}>
                          {vulnerable ? '🔴 Vulnerable' : '✅ Safe'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: '#EF4444', margin: 0 }}>❌ {errors.ssl || 'SSL check failed'}</p>
                </div>
              )
            )}

            {activeTab === 'dns' && results.dns && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>DNS Security Checks</h3>
                  {results.dns.securityChecks.map((check, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 0', borderBottom: i < results.dns.securityChecks.length - 1 ? '1px solid ' + border : 'none' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{check.present ? '✅' : check.severity === 'high' ? '🚨' : '⚠️'}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 0.2rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{check.name}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{check.description}</p>
                        {check.value && <p style={{ margin: '0.25rem 0 0', color: '#10B981', fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>{check.value.slice(0, 80)}{check.value.length > 80 ? '...' : ''}</p>}
                      </div>
                      <span style={{ padding: '0.2rem 0.5rem', borderRadius: '10px', fontSize: '0.7rem', fontWeight: '700', background: check.severity === 'high' ? 'rgba(239,68,68,0.1)' : check.severity === 'medium' ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)', color: check.severity === 'high' ? '#EF4444' : check.severity === 'medium' ? '#F59E0B' : '#6B7280', flexShrink: 0 }}>{check.severity}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>IP & Location</h3>
                    {results.dns.ipAddresses.map((ip, i) => <p key={i} style={{ margin: '0 0 0.25rem', color: '#10B981', fontFamily: 'monospace', fontSize: '0.875rem' }}>🌐 {ip}</p>)}
                    {results.dns.geoInfo && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid ' + border }}>
                        {results.dns.geoInfo.city && <p style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem' }}>📍 {results.dns.geoInfo.city}, {results.dns.geoInfo.country}</p>}
                        {results.dns.geoInfo.org && <p style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem' }}>🏢 {results.dns.geoInfo.org}</p>}
                      </div>
                    )}
                  </div>
                  {results.dns.nameservers?.length > 0 && (
                    <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Nameservers</h3>
                      {results.dns.nameservers.map((ns, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>🔷 {ns}</p>)}
                    </div>
                  )}
                  {results.dns.mxRecords?.length > 0 && (
                    <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '14px', padding: '1.5rem' }}>
                      <h3 style={{ margin: '0 0 1rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>MX Records</h3>
                      {results.dns.mxRecords.map((mx, i) => <p key={i} style={{ margin: '0.2rem 0', color: textMuted, fontSize: '0.8rem', fontFamily: 'monospace' }}>📧 {mx.exchange} (priority: {mx.priority})</p>)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {!isLoading && !results.headers && !results.dns && !results.ssl && (
          <div style={{ background: cardBg, border: '1px solid ' + border, borderRadius: '16px', padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
            <h2 style={{ color: textMain, margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Ready to Audit</h2>
            <p style={{ color: textMuted, margin: '0 0 2rem', fontSize: '0.875rem' }}>Enter any domain above. Results are automatically saved to your scan history.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '600px', margin: '0 auto' }}>
              {[{ icon: '🛡️', label: 'SSL Certificate', desc: 'Grade & validity' }, { icon: '🔒', label: 'Security Headers', desc: '9 headers checked' }, { icon: '🌐', label: 'DNS Records', desc: 'SPF, DMARC, MX, NS' }, { icon: '💾', label: 'Auto-Saved', desc: 'History tracked' }].map((item, i) => (
                <div key={i} style={{ padding: '1rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '10px', border: '1px solid ' + border }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <p style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '0.8rem', fontWeight: '600' }}>{item.label}</p>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}

export default function SiteAudit() {
  return (
    <Suspense fallback={<div style={{ background: "#0A0A0F", minHeight: "100vh" }} />}>
      <SiteAuditInner />
    </Suspense>
  )
}
