'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Assets() {
  const router = useRouter()
  const darkMode = useTheme()
  const [assets, setAssets] = useState([])
  const [vulnCounts, setVulnCounts] = useState({})
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ name: '', ip_address: '', hostname: '', asset_type: 'server', os: '', environment: 'production', criticality: 'medium', owner_name: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('assets').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false })
    setAssets(data || [])
    const { data: vulns } = await supabase.from('vulnerabilities').select('asset_id, severity').eq('user_id', session.user.id)
    const counts = {}
    for (const v of (vulns || [])) {
      if (!v.asset_id) continue
      if (!counts[v.asset_id]) counts[v.asset_id] = { total: 0, critical: 0 }
      counts[v.asset_id].total++
      if (v.severity === 'critical') counts[v.asset_id].critical++
    }
    setVulnCounts(counts)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('❌ Name required'); return }
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('assets').insert([{ ...form, user_id: session.user.id }])
    setSaving(false)
    if (error) showToast('Error: ' + error.message)
    else { setShowModal(false); setForm({ name: '', ip_address: '', hostname: '', asset_type: 'server', os: '', environment: 'production', criticality: 'medium', owner_name: '' }); loadData(); showToast('✅ Asset added!') }
  }

  async function deleteAsset(id) {
    if (!confirm('Delete this asset?')) return
    await supabase.from('assets').delete().eq('id', id)
    setAssets(prev => prev.filter(a => a.id !== id))
    showToast('🗑️ Asset deleted')
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '10px', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }

  const criticConfig = { critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }, high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }, medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)' }, low: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' } }
  const envConfig = { production: '#EF4444', staging: '#F59E0B', development: '#6B7280' }
  const typeIcons = { server: '🖥️', database: '🗄️', network: '🌐', workstation: '💻', cloud: '☁️', mobile: '📱', other: '📦' }

  const filtered = assets.filter(a => !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.hostname?.toLowerCase().includes(search.toLowerCase()) || a.ip_address?.includes(search))

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>
        {toast && <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Assets</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Manage your infrastructure and monitored assets.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>+ Add Asset</button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Assets', value: assets.length, color: '#6366F1' },
            { label: 'Production', value: assets.filter(a => a.environment === 'production').length, color: '#EF4444' },
            { label: 'Critical Priority', value: assets.filter(a => a.criticality === 'critical').length, color: '#F59E0B' },
            { label: 'With Vulnerabilities', value: Object.keys(vulnCounts).length, color: '#10B981' },
          ].map((s, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1.25rem', transition: 'background 0.3s' }}>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{s.label}</p>
              <p style={{ margin: 0, color: s.color, fontSize: '1.75rem', fontWeight: '700' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.6rem 1rem', marginBottom: '1.25rem', maxWidth: '400px' }}>
          <span style={{ color: textMuted }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', flex: 1 }} />
        </div>

        {/* Asset Cards */}
        {filtered.length === 0 ? (
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🖥️</div>
            <p style={{ color: textMain, fontWeight: '600', margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{search ? 'No matching assets' : 'No assets yet'}</p>
            <p style={{ color: textMuted, margin: '0 0 1.5rem', fontSize: '0.875rem' }}>{search ? 'Try a different search' : 'Add your servers, databases, and network devices to start tracking vulnerabilities.'}</p>
            {!search && <button onClick={() => setShowModal(true)} style={{ padding: '0.6rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600' }}>+ Add First Asset</button>}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filtered.map(asset => {
              const vc = vulnCounts[asset.id] || { total: 0, critical: 0 }
              const cc = criticConfig[asset.criticality] || criticConfig.medium
              return (
                <div key={asset.id} style={{ background: cardBg, border: `1px solid ${vc.critical > 0 ? 'rgba(239,68,68,0.3)' : border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: vc.critical > 0 ? '#EF4444' : cc.color }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                        {typeIcons[asset.asset_type] || '📦'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>{asset.name}</h3>
                        <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{asset.hostname || asset.ip_address || 'No hostname'}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteAsset(asset.id)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '0.9rem', padding: '0.2rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.opacity = '1' }}
                      onMouseLeave={e => { e.currentTarget.style.color = textMuted; e.currentTarget.style.opacity = '0.5' }}>🗑️</button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: cc.bg, color: cc.color, fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase' }}>{asset.criticality}</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: (envConfig[asset.environment] || '#6B7280') + '15', color: envConfig[asset.environment] || '#6B7280', fontSize: '0.68rem', fontWeight: '600' }}>{asset.environment}</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', color: textMuted, fontSize: '0.68rem' }}>{asset.asset_type}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.875rem' }}>
                    {asset.ip_address && <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>🌐 <span style={{ fontFamily: 'monospace', color: textMain }}>{asset.ip_address}</span></p>}
                    {asset.os && <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>💿 {asset.os}</p>}
                    {asset.owner_name && <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>👤 {asset.owner_name}</p>}
                    {asset.last_scanned && <p style={{ margin: 0, color: textMuted, fontSize: '0.78rem' }}>🕐 Scanned: {new Date(asset.last_scanned).toLocaleDateString()}</p>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: `1px solid ${border}` }}>
                    <div>
                      {vc.total > 0 ? (
                        <span style={{ color: vc.critical > 0 ? '#EF4444' : textMuted, fontSize: '0.8rem', fontWeight: '600' }}>
                          {vc.critical > 0 ? `🔴 ${vc.critical} critical` : `⚠️ ${vc.total} vuln${vc.total !== 1 ? 's' : ''}`}
                        </span>
                      ) : <span style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>✅ No vulnerabilities</span>}
                    </div>
                    <button onClick={() => router.push('/vulnerabilities')} style={{ padding: '0.3rem 0.75rem', background: 'rgba(16,185,129,0.1)', border: 'none', borderRadius: '6px', color: '#10B981', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit', fontWeight: '600' }}>View Vulns →</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div><h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.2rem', fontWeight: '700' }}>Add Asset</h2>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Add a server, database, or network device to monitor</p></div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Asset Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Production Web Server" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IP Address</label>
                  <input value={form.ip_address} onChange={e => setForm(p => ({...p, ip_address: e.target.value}))} placeholder="192.168.1.10" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hostname</label>
                  <input value={form.hostname} onChange={e => setForm(p => ({...p, hostname: e.target.value}))} placeholder="web-01.internal" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type</label>
                  <select value={form.asset_type} onChange={e => setForm(p => ({...p, asset_type: e.target.value}))} style={inputStyle}>
                    <option value="server">Server</option><option value="database">Database</option><option value="network">Network</option><option value="workstation">Workstation</option><option value="cloud">Cloud</option><option value="mobile">Mobile</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Environment</label>
                  <select value={form.environment} onChange={e => setForm(p => ({...p, environment: e.target.value}))} style={inputStyle}>
                    <option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Criticality</label>
                  <select value={form.criticality} onChange={e => setForm(p => ({...p, criticality: e.target.value}))} style={inputStyle}>
                    <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>OS / Platform</label>
                  <input value={form.os} onChange={e => setForm(p => ({...p, os: e.target.value}))} placeholder="Ubuntu 22.04 LTS" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
                <div>
                  <label style={{ color: textMuted, fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Owner</label>
                  <input value={form.owner_name} onChange={e => setForm(p => ({...p, owner_name: e.target.value}))} placeholder="Team or person" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.875rem', background: saving ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.9rem' }}>{saving ? '⏳ Saving...' : 'Add Asset'}</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@media (max-width: 768px) { main { margin-left: 0 !important; } }`}</style>
    </div>
  )
}
