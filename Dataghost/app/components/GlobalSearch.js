'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const PAGES = [
  { label: 'Dashboard', icon: '📊', href: '/dashboard', desc: 'Overview & risk score' },
  { label: 'Assets', icon: '🖥️', href: '/assets', desc: 'Servers, databases, devices' },
  { label: 'Vulnerabilities', icon: '🔓', href: '/vulnerabilities', desc: 'Track & manage vulns' },
  { label: 'Threats', icon: '⚠️', href: '/threats', desc: 'Live CVE threat feed' },
  { label: 'Remediation', icon: '🔧', href: '/remediation', desc: 'Fix plans & progress' },
  { label: 'Compliance', icon: '📋', href: '/compliance', desc: 'PCI DSS, ISO 27001, SOC 2' },
  { label: 'Site Auditor', icon: '🔍', href: '/site-audit', desc: 'SSL, headers, DNS check' },
  { label: 'CVE Database', icon: '🔎', href: '/cve', desc: 'Search CVE database' },
  { label: 'Scan History', icon: '🕐', href: '/scan-history', desc: 'Past site security scans' },
  { label: 'Audit Logs', icon: '📜', href: '/audit-logs', desc: 'Activity & change logs' },
  { label: 'Settings', icon: '⚙️', href: '/profile', desc: 'Profile & preferences' },
  { label: 'Guide', icon: '📖', href: '/guide', desc: 'How to use DataGhost' },
]

export default function GlobalSearch({ darkMode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ pages: [], assets: [], vulns: [], threats: [], plans: [] })
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const router = useRouter()

  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const hoverBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) { inputRef.current.focus(); setSelectedIndex(0) }
  }, [open])

  useEffect(() => {
    const q = query.toLowerCase().trim()

    // Always filter pages client-side first (instant)
    const matchedPages = q ? PAGES.filter(p =>
      p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
    ) : []

    if (!q) {
      setResults({ pages: [], assets: [], vulns: [], threats: [], plans: [] })
      return
    }

    setResults(prev => ({ ...prev, pages: matchedPages }))

    // Debounce DB search
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const [{ data: assets }, { data: vulns }, { data: threats }, { data: plans }] = await Promise.all([
          supabase.from('assets').select('id, name, asset_type, ip_address, hostname').eq('user_id', session.user.id).or(`name.ilike.%${q}%,ip_address.ilike.%${q}%,hostname.ilike.%${q}%`).limit(3),
          supabase.from('vulnerabilities').select('id, title, severity, status').eq('user_id', session.user.id).ilike('title', `%${q}%`).limit(3),
          supabase.from('threat_feed').select('id, title, cve_id, severity').or(`title.ilike.%${q}%,cve_id.ilike.%${q}%`).limit(3),
          supabase.from('remediation_plans').select('id, priority, status, vulnerabilities(title)').eq('user_id', session.user.id).limit(3),
        ])
        setResults({ pages: matchedPages, assets: assets || [], vulns: vulns || [], threats: threats || [], plans: (plans || []).filter(p => p.vulnerabilities?.title?.toLowerCase().includes(q)) })
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  function navigate(href) { setOpen(false); setQuery(''); router.push(href) }

  const severityColors = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#6B7280' }
  const statusColors = { open: '#EF4444', in_progress: '#F59E0B', resolved: '#10B981' }

  const totalResults = results.pages.length + results.assets.length + results.vulns.length + results.threats.length + results.plans.length

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8vh', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }} onClick={() => { setOpen(false); setQuery('') }}>
      <div style={{ width: '90%', maxWidth: '620px', background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: `1px solid ${border}` }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔍</span>
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pages, assets, vulnerabilities, threats..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: textMain, fontSize: '1rem', fontFamily: 'inherit' }} />
          {loading && <div style={{ width: '16px', height: '16px', border: `2px solid ${border}`, borderTop: '2px solid #10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />}
          <kbd style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', color: textMuted, padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontFamily: 'inherit', flexShrink: 0 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '65vh', overflowY: 'auto' }}>

          {/* Empty state */}
          {!query && (
            <div>
              <div style={{ padding: '0.875rem 1.25rem 0.5rem' }}>
                <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.5rem', fontWeight: '700' }}>Quick Navigate</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                  {PAGES.map(page => (
                    <div key={page.href} onClick={() => navigate(page.href)} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${border}`, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.background = 'rgba(16,185,129,0.06)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>{page.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, color: textMain, fontSize: '0.82rem', fontWeight: '600' }}>{page.label}</p>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{page.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ height: '0.75rem' }} />
            </div>
          )}

          {/* No results */}
          {query && !loading && totalResults === 0 && (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: textMuted }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>😕</div>
              <p style={{ margin: '0 0 0.25rem', fontWeight: '600', color: textMain }}>No results for "{query}"</p>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Try searching by page name, asset, CVE ID, or vulnerability title</p>
            </div>
          )}

          {/* Pages */}
          {results.pages.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: '700' }}>📄 Pages</p>
              {results.pages.map(p => (
                <div key={p.href} onClick={() => navigate(p.href)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '600' }}>{p.label}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{p.desc}</p>
                  </div>
                  <span style={{ color: textMuted, fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Assets */}
          {results.assets.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: '700' }}>🖥️ Assets</p>
              {results.assets.map(a => (
                <div key={a.id} onClick={() => navigate('/assets')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🖥️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{a.name}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{a.ip_address || a.hostname || '—'} · {a.asset_type}</p>
                  </div>
                  <span style={{ color: textMuted, fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Vulnerabilities */}
          {results.vulns.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: '700' }}>🔓 Vulnerabilities</p>
              {results.vulns.map(v => (
                <div key={v.id} onClick={() => navigate('/vulnerabilities')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${severityColors[v.severity] || '#6B7280'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🔓</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span style={{ color: severityColors[v.severity] || '#6B7280', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>{v.severity}</span>
                      <span style={{ color: statusColors[v.status] || textMuted, fontSize: '0.72rem', textTransform: 'capitalize' }}>· {v.status?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <span style={{ color: textMuted, fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Threats */}
          {results.threats.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: '700' }}>⚠️ Threats</p>
              {results.threats.map(t => (
                <div key={t.id} onClick={() => navigate('/threats')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>⚠️</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.72rem', fontFamily: 'monospace' }}>{t.cve_id || t.severity}</p>
                  </div>
                  <span style={{ color: textMuted, fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Remediation Plans */}
          {results.plans.length > 0 && (
            <div style={{ padding: '0.75rem 1.25rem 0' }}>
              <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.4rem', fontWeight: '700' }}>🔧 Remediation Plans</p>
              {results.plans.map(p => (
                <div key={p.id} onClick={() => navigate('/remediation')} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.2rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🔧</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{p.vulnerabilities?.title || 'Plan'}</p>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.72rem', textTransform: 'capitalize' }}>{p.priority} · {p.status?.replace('_', ' ')}</p>
                  </div>
                  <span style={{ color: textMuted, fontSize: '0.75rem', flexShrink: 0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {(query && totalResults > 0) && <div style={{ height: '0.75rem' }} />}
        </div>

        <div style={{ padding: '0.625rem 1.25rem', borderTop: `1px solid ${border}`, display: 'flex', gap: '1.25rem' }}>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>↑↓ navigate</span>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>↵ select</span>
          <span style={{ color: textMuted, fontSize: '0.7rem' }}>ESC close</span>
          {query && <span style={{ color: textMuted, fontSize: '0.7rem', marginLeft: 'auto' }}>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>}
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
