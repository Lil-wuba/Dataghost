'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function GlobalSearch({ darkMode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ assets: [], vulns: [], threats: [], plans: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const router = useRouter()

  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  useEffect(() => {
    if (!query.trim()) { setResults({ assets: [], vulns: [], threats: [], plans: [] }); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const q = query.toLowerCase()
      const [{ data: assets }, { data: vulns }, { data: threats }, { data: plans }] = await Promise.all([
        supabase.from('assets').select('id, name, asset_type, ip_address, hostname').eq('user_id', session.user.id).or(`name.ilike.%${q}%,ip_address.ilike.%${q}%,hostname.ilike.%${q}%`).limit(4),
        supabase.from('vulnerabilities').select('id, title, severity').eq('user_id', session.user.id).ilike('title', `%${q}%`).limit(4),
        supabase.from('threat_feed').select('id, title, cve_id, severity').ilike('title', `%${q}%`).limit(3),
        supabase.from('remediation_plans').select('id, priority, status, vulnerabilities(title)').eq('user_id', session.user.id).limit(3),
      ])
      setResults({ assets: assets || [], vulns: vulns || [], threats: threats || [], plans: plans || [] })
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const totalResults = results.assets.length + results.vulns.length + results.threats.length + results.plans.length

  const severityColors = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#6B7280' }

  function navigate(href) { setOpen(false); setQuery(''); router.push(href) }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }} onClick={() => setOpen(false)}>
      <div style={{ width: '90%', maxWidth: '600px', background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: `1px solid ${border}` }}>
          <span style={{ fontSize: '1.1rem' }}>🔍</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search assets, vulnerabilities, threats..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: textMain, fontSize: '1rem', fontFamily: 'inherit' }} />
          {loading && <div style={{ width: '16px', height: '16px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
          <kbd style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: textMuted, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontFamily: 'inherit' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {!query && (
            <div style={{ padding: '2rem', textAlign: 'center', color: textMuted }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
              <p style={{ margin: '0 0 0.5rem', fontWeight: '600', color: textMain }}>Search DataGhost</p>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Search across assets, vulnerabilities, threats and plans</p>
            </div>
          )}

          {query && !loading && totalResults === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: textMuted }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>😕</div>
              <p style={{ margin: 0 }}>No results found for "<strong style={{ color: textMain }}>{query}</strong>"</p>
            </div>
          )}

          {results.assets.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>🖥️ Assets</p>
              {results.assets.map(a => (
                <div key={a.id} onClick={() => navigate('/assets')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.25rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🖥️</div>
                  <div>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{a.name}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{a.ip_address || a.hostname || '—'} • {a.asset_type}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: textMuted, fontSize: '0.75rem' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {results.vulns.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>⚠️ Vulnerabilities</p>
              {results.vulns.map(v => (
                <div key={v.id} onClick={() => navigate('/vulnerabilities')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.25rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${severityColors[v.severity]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>⚠️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                    <p style={{ margin: 0, color: severityColors[v.severity], fontSize: '0.75rem', textTransform: 'capitalize' }}>{v.severity}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: textMuted, fontSize: '0.75rem' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {results.threats.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>🛡️ Threats</p>
              {results.threats.map(t => (
                <div key={t.id} onClick={() => navigate('/threats')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.25rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🛡️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', fontFamily: 'monospace' }}>{t.cve_id}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: textMuted, fontSize: '0.75rem' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {results.plans.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>🔧 Remediation Plans</p>
              {results.plans.map(p => (
                <div key={p.id} onClick={() => navigate('/remediation')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.25rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', flexShrink: 0 }}>🔧</div>
                  <div>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{p.vulnerabilities?.title || 'Plan'}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem', textTransform: 'capitalize' }}>{p.priority} • {p.status}</p>
                  </div>
                  <span style={{ marginLeft: 'auto', color: textMuted, fontSize: '0.75rem' }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Quick nav shortcuts */}
          {!query && (
            <div style={{ padding: '0.75rem 1.25rem 1rem' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem' }}>Quick Navigate</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[
                  { label: 'Dashboard', icon: '⊞', href: '/dashboard' },
                  { label: 'Assets', icon: '🖥️', href: '/assets' },
                  { label: 'Vulnerabilities', icon: '⚠️', href: '/vulnerabilities' },
                  { label: 'Threats', icon: '🛡️', href: '/threats' },
                  { label: 'Remediation', icon: '🔧', href: '/remediation' },
                  { label: 'Compliance', icon: '📋', href: '/compliance' },
                  { label: 'Scan History', icon: '🔍', href: '/scan-history' },
                  { label: 'Audit Logs', icon: '📜', href: '/audit-logs' },
                  { label: 'Site Audit', icon: '🌐', href: '/site-audit' },
                  { label: 'CVE Lookup', icon: '🔎', href: '/cve' },
                  { label: 'Profile', icon: '👤', href: '/profile' },
                  { label: 'Guide', icon: '📖', href: '/guide' },
                ].map(item => (
                  <div key={item.href} onClick={() => navigate(item.href)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${border}`, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'rgba(16,185,129,0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{ fontSize: '0.875rem' }}>{item.icon}</span>
                    <span style={{ color: textMain, fontSize: '0.8rem' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {query && totalResults > 0 && <div style={{ height: '0.75rem' }} />}
        </div>

        <div style={{ padding: '0.625rem 1.25rem', borderTop: `1px solid ${border}`, display: 'flex', gap: '1rem' }}>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>↑↓ navigate</span>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>↵ select</span>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>ESC close</span>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}