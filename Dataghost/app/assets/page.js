'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

const assetIcons = { server: '🖥️', endpoint: '💻', cloud: '☁️', network: '🌐', database: '🗄️' }
const riskColors = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Critical Risk' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'High Risk' },
  medium: { color: '#6366F1', bg: 'rgba(99,102,241,0.1)', label: 'Medium Risk' },
  low: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Low Risk' },
}

export default function Assets() {
  const router = useRouter()
  const darkMode = useTheme()
  const [assets, setAssets] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [scanModal, setScanModal] = useState(false)
  const [scanResults, setScanResults] = useState([])
  const [toast, setToast] = useState('')
  const [scanning, setScanning] = useState({})
  const [form, setForm] = useState({ name: '', ip_address: '', hostname: '', asset_type: 'server', os: '', environment: 'production', criticality: 'medium', owner_name: '' })

  useEffect(() => { loadAssets() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadAssets() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data } = await supabase.from('assets').select('*').eq('user_id', session.user.id)
    setAssets(data || [])
  }

  function validateIP(ip) {
    if (!ip) return true
    const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
    const ipv6 = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
    const cidr = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
    const hostname = /^[a-zA-Z0-9]([a-zA-Z0-9\-\.]{0,253}[a-zA-Z0-9])?$/
    return ipv4.test(ip) || ipv6.test(ip) || cidr.test(ip) || hostname.test(ip)
  }

  async function handleAddAsset(e) {
    e.preventDefault()
    if (!form.name.trim()) { showToast('❌ Asset name is required'); return }
    if (form.ip_address && !validateIP(form.ip_address)) {
      showToast('❌ Invalid IP. Use formats like 192.168.1.1, server.corp, or 10.0.0.0/24')
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('assets').insert([{ ...form, user_id: session.user.id }])
    if (error) { showToast('Error: ' + error.message); return }
    setShowModal(false)
    setForm({ name: '', ip_address: '', hostname: '', asset_type: 'server', os: '', environment: 'production', criticality: 'medium', owner_name: '' })
    loadAssets()
    showToast('✅ Asset added!')
    await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'asset.created', entity_type: 'asset', details: { name: form.name, ip_address: form.ip_address } }])
  }

  async function scanAsset(assetId) {
    const { data: { session } } = await supabase.auth.getSession()
    setScanning(prev => ({ ...prev, [assetId]: true }))
    try {
      const { error } = await supabase.rpc('simulate_scan', { p_asset_id: assetId, p_user_id: session.user.id })
      if (error) throw error
      const { data: newVulns } = await supabase
        .from('vulnerabilities')
        .select('title, severity')
        .eq('asset_id', assetId)
        .eq('user_id', session.user.id)
        .order('discovered_at', { ascending: false })
        .limit(10)
      setScanResults(newVulns || [])
      setScanModal(true)
      loadAssets()
    } catch (err) { showToast('Error: ' + err.message) }
    finally { setScanning(prev => ({ ...prev, [assetId]: false })) }
  }

  async function deleteAsset(assetId) {
    if (!confirm('Delete this asset?')) return
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('assets').delete().eq('id', assetId)
    await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'asset.deleted', entity_type: 'asset', entity_id: assetId, details: {} }])
    loadAssets()
    showToast('Asset deleted')
  }

  const filtered = assets.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.ip_address?.toLowerCase().includes(search.toLowerCase()) ||
    a.hostname?.toLowerCase().includes(search.toLowerCase())
  )

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'
  const sevColors = { critical: '#EF4444', high: '#F59E0B', medium: '#6366F1', low: '#6B7280' }
  const sevBg = { critical: 'rgba(239,68,68,0.1)', high: 'rgba(245,158,11,0.1)', medium: 'rgba(99,102,241,0.1)', low: 'rgba(107,114,128,0.1)' }

  const inputStyle = {
    width: '100%', padding: '0.6rem 0.875rem',
    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${border}`, borderRadius: '8px',
    color: textMain, fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s' }}>
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '1.5rem' }}>

        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: '700', color: textMain }}>Assets</h1>
            <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem' }}>Monitor and manage your infrastructure assets.</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: '0.6rem 1.25rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>+ Add Asset</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Assets', value: assets.length, color: '#10B981' },
            { label: 'Critical', value: assets.filter(a => a.criticality === 'critical').length, color: '#EF4444' },
            { label: 'Production', value: assets.filter(a => a.environment === 'production').length, color: '#F59E0B' },
            { label: 'Scanned', value: assets.filter(a => a.last_scanned).length, color: '#6366F1' },
          ].map((stat, i) => (
            <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.8rem' }}>{stat.label}</p>
              <p style={{ margin: 0, color: stat.color, fontSize: '1.75rem', fontWeight: '700' }}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.6rem 1rem', maxWidth: '400px' }}>
            <span style={{ color: textMuted }}>🔍</span>
            <input placeholder="Search by name, IP or hostname..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: textMain, fontFamily: 'inherit', fontSize: '0.875rem', width: '100%' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {filtered.map(asset => {
            const risk = riskColors[asset.criticality] || riskColors.low
            return (
              <div key={asset.id} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(16,185,129,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>{assetIcons[asset.asset_type] || '🖥️'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 0.2rem', color: textMain, fontSize: '0.95rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</h3>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem', textTransform: 'capitalize' }}>{asset.asset_type}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: '500' }}>Active</span>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', background: risk.bg, color: risk.color, fontWeight: '500' }}>{risk.label}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.1rem', color: textMuted }}>IP Address</p>
                    <p style={{ margin: 0, color: textMain, fontFamily: 'monospace' }}>{asset.ip_address || '-'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.1rem', color: textMuted }}>Environment</p>
                    <p style={{ margin: 0, color: textMain, textTransform: 'capitalize' }}>{asset.environment}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.1rem', color: textMuted }}>Owner</p>
                    <p style={{ margin: 0, color: textMain }}>{asset.owner_name || '-'}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.1rem', color: textMuted }}>Last Scanned</p>
                    <p style={{ margin: 0, color: asset.last_scanned ? '#10B981' : textMuted }}>{asset.last_scanned ? new Date(asset.last_scanned).toLocaleDateString() : 'Never'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => scanAsset(asset.id)} disabled={scanning[asset.id]} style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', background: scanning[asset.id] ? (darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : '#10B981', border: 'none', color: scanning[asset.id] ? textMuted : 'white', fontFamily: 'inherit', fontSize: '0.8rem', cursor: scanning[asset.id] ? 'not-allowed' : 'pointer', fontWeight: '500' }}>
                    {scanning[asset.id] ? '⏳ Scanning...' : '🔍 Scan'}
                  </button>
                  <button onClick={() => deleteAsset(asset.id)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem' }}>🗑️</button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: textMuted }}>
              {search ? `No assets found for "${search}"` : 'No assets yet. Add your first asset!'}
            </div>
          )}
        </div>

        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.25rem', fontWeight: '700' }}>Add New Asset</h2>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>Add a new asset to your inventory</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
              </div>
              <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Asset Name *', key: 'name', placeholder: 'e.g. Web Server 1' },
                  { label: 'IP Address', key: 'ip_address', placeholder: 'e.g. 192.168.1.10 or server.corp' },
                  { label: 'Hostname', key: 'hostname', placeholder: 'e.g. webserver1.local' },
                  { label: 'Operating System', key: 'os', placeholder: 'e.g. Ubuntu 22.04' },
                  { label: 'Owner Name', key: 'owner_name', placeholder: 'e.g. John Doe' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>{field.label}</label>
                    <input required={field.label.includes('*')} placeholder={field.placeholder} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                  </div>
                ))}
                {[
                  { label: 'Asset Type', key: 'asset_type', options: ['server', 'endpoint', 'cloud', 'network', 'database'] },
                  { label: 'Environment', key: 'environment', options: ['production', 'staging', 'development'] },
                  { label: 'Criticality', key: 'criticality', options: ['critical', 'high', 'medium', 'low'] },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem' }}>{field.label}</label>
                    <select value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} style={inputStyle}>
                      {field.options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" style={{ flex: 1, padding: '0.75rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600' }}>Add Asset</button>
                  <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {scanModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.25rem', fontWeight: '700' }}>🔍 Scan Complete</h2>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem' }}>{scanResults.length} vulnerabilities found</p>
                </div>
                <button onClick={() => setScanModal(false)} style={{ background: 'none', border: 'none', color: textMuted, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
              </div>
              {scanResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: textMuted }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                  <p style={{ margin: 0, fontWeight: '600', color: textMain }}>No vulnerabilities found!</p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem' }}>This asset looks clean.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {scanResults.map((v, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', borderRadius: '8px', border: `1px solid ${border}` }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', background: sevBg[v.severity], color: sevColors[v.severity], textTransform: 'uppercase', flexShrink: 0 }}>{v.severity}</span>
                      <p style={{ margin: 0, color: textMain, fontSize: '0.85rem', flex: 1 }}>{v.title}</p>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button onClick={() => { setScanModal(false); router.push('/vulnerabilities') }} style={{ flex: 1, padding: '0.75rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer', fontWeight: '600' }}>View All Vulnerabilities</button>
                <button onClick={() => setScanModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}