'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Profile() {
  const router = useRouter()
  const darkMode = useTheme()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState({ full_name: '', role: '', email: '' })
  const [passwords, setPasswords] = useState({ new: '', confirm: '' })
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [stats, setStats] = useState({ assets: 0, vulns: 0, plans: 0, reports: 0 })

  useEffect(() => { loadProfile() }, [])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function loadProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    setUser(session.user)
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (data) {
      setProfile({ full_name: data.full_name || '', role: data.role || 'admin', email: session.user.email })
      if (data.notification_prefs) setNotifPrefs(data.notification_prefs)
    }
    const userId = session.user.id
    const [{ count: assets }, { count: vulns }, { count: plans }, { count: reports }] = await Promise.all([
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('vulnerabilities').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('remediation_plans').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('compliance_reports').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])
    setStats({ assets: assets || 0, vulns: vulns || 0, plans: plans || 0, reports: reports || 0 })
  }

  const [notifPrefs, setNotifPrefs] = useState({
    critical_vulns: true,
    threat_feed: true,
    scan_complete: false,
    compliance_reports: false,
  })

  async function saveNotifPrefs() {
    setLoading(true)
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        notification_prefs: notifPrefs,
        updated_at: new Date().toISOString()
      })
      if (error) throw error
      showToast('✅ Notification preferences saved!')
    } catch (err) {
      showToast('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile(e) {
    e.preventDefault(); setLoading(true)
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, full_name: profile.full_name, role: profile.role, updated_at: new Date().toISOString() })
      if (error) throw error
      showToast('✅ Profile updated!')
    } catch (error) { showToast('Error: ' + error.message) }
    finally { setLoading(false) }
  }

  async function updatePassword(e) {
    e.preventDefault()
    if (passwords.new !== passwords.confirm) { showToast('❌ Passwords do not match!'); return }
    if (passwords.new.length < 6) { showToast('❌ Min 6 characters!'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new })
      if (error) throw error
      showToast('✅ Password updated!')
      setPasswords({ new: '', confirm: '' })
    } catch (error) { showToast('Error: ' + error.message) }
    finally { setLoading(false) }
  }

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    border: `1px solid ${border}`, borderRadius: '10px',
    color: textMain, fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  const initials = profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  const activityData = [{ day: 'Mon', value: 4 }, { day: 'Tue', value: 7 }, { day: 'Wed', value: 3 }, { day: 'Thu', value: 9 }, { day: 'Fri', value: 6 }, { day: 'Sat', value: 2 }, { day: 'Sun', value: 5 }]
  const maxVal = Math.max(...activityData.map(d => d.value))

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s', position: 'relative' }}>

      {/* Background blur glow effects like landing page */}
      <div style={{ position: 'fixed', top: '20%', left: '35%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '50%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '2rem 3rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {toast && (
          <div style={{ position: 'fixed', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto', background: cardBg, border: '1px solid #10B981', borderRadius: '10px', padding: '0.875rem 1.25rem', color: textMain, boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 3000, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{toast}</div>
        )}

        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: '700', color: textMain }}>Profile & Settings</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.95rem' }}>Manage your account and preferences.</p>
        </div>

        {/* Hero Card */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.1))' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: '800', color: 'white', border: `4px solid ${cardBg}`, boxShadow: '0 0 25px rgba(16,185,129,0.3)' }}>{initials}</div>
              <div style={{ position: 'absolute', bottom: '4px', right: '4px', width: '14px', height: '14px', borderRadius: '50%', background: '#10B981', border: `2px solid ${cardBg}` }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 0.25rem', color: textMain, fontSize: '1.25rem', fontWeight: '700' }}>{profile.full_name || 'User'}</h2>
              <p style={{ margin: '0 0 0.5rem', color: textMuted, fontSize: '0.875rem' }}>{profile.email}</p>
              <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>{profile.role || 'admin'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Assets', value: stats.assets, color: '#10B981', icon: '🖥️' },
                { label: 'Vulns', value: stats.vulns, color: '#EF4444', icon: '🔍' },
                { label: 'Plans', value: stats.plans, color: '#F59E0B', icon: '🔧' },
                { label: 'Reports', value: stats.reports, color: '#6366F1', icon: '📋' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '0.75rem', background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderRadius: '10px', minWidth: '70px' }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{stat.icon}</div>
                  <p style={{ margin: '0 0 0.15rem', color: stat.color, fontSize: '1.25rem', fontWeight: '700' }}>{stat.value}</p>
                  <p style={{ margin: 0, color: textMuted, fontSize: '0.7rem' }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['profile', 'password', 'notifications'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: activeTab === tab ? 'none' : `1px solid ${border}`, cursor: 'pointer', background: activeTab === tab ? '#10B981' : cardBg, color: activeTab === tab ? 'white' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s' }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'profile' && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Personal Information</h3>
                <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Full Name</label>
                    <input value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} placeholder="Your full name" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Email</label>
                    <input value={profile.email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Role</label>
                    <select value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} style={inputStyle}>
                      <option value="admin">Admin</option>
                      <option value="analyst">Analyst</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>
                  <button type="submit" disabled={loading} style={{ padding: '0.75rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'password' && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Change Password</h3>
                <form onSubmit={updatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>New Password</label>
                    <input type="password" value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} placeholder="Min 6 characters" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                  </div>
                  <div>
                    <label style={{ color: textMuted, fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Confirm Password</label>
                    <input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Repeat password" style={inputStyle} onFocus={e => e.target.style.borderColor = '#10B981'} onBlur={e => e.target.style.borderColor = border} />
                  </div>
                  {passwords.new && passwords.confirm && (
                    <div style={{ padding: '0.75rem', borderRadius: '8px', background: passwords.new === passwords.confirm ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: passwords.new === passwords.confirm ? '#10B981' : '#EF4444', fontSize: '0.8rem' }}>
                      {passwords.new === passwords.confirm ? '✅ Passwords match!' : '❌ Passwords do not match'}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{ padding: '0.75rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', transition: 'background 0.3s' }}>
                <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Notification Preferences</h3>
                {[
                  { key: 'critical_vulns', label: 'Critical Vulnerabilities', desc: 'Get notified when critical vulns are discovered' },
                  { key: 'threat_feed', label: 'Threat Feed Updates', desc: 'Get notified when new CVEs are added' },
                  { key: 'scan_complete', label: 'Scan Completed', desc: 'Get notified when asset scans finish' },
                  { key: 'compliance_reports', label: 'Compliance Reports', desc: 'Get notified when reports are generated' },
                ].map((notif, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: i < 3 ? `1px solid ${border}` : 'none' }}>
                    <div>
                      <p style={{ margin: '0 0 0.2rem', color: textMain, fontSize: '0.875rem', fontWeight: '500' }}>{notif.label}</p>
                      <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{notif.desc}</p>
                    </div>
                    <div
                      onClick={() => setNotifPrefs(prev => ({ ...prev, [notif.key]: !prev[notif.key] }))}
                      style={{ width: '42px', height: '24px', borderRadius: '12px', background: notifPrefs[notif.key] ? '#10B981' : (darkMode ? 'rgba(255,255,255,0.1)' : '#D1D5DB'), position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'all 0.3s', boxShadow: notifPrefs[notif.key] ? '0 0 8px rgba(16,185,129,0.4)' : 'none' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: notifPrefs[notif.key] ? '21px' : '3px', transition: 'left 0.3s' }} />
                    </div>
                  </div>
                ))}
                <button onClick={saveNotifPrefs} disabled={loading} style={{ marginTop: '1.25rem', padding: '0.75rem 1.5rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600' }}>
                  {loading ? '⏳ Saving...' : 'Save Preferences'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Activity Chart */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', transition: 'background 0.3s' }}>
              <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Weekly Activity</h3>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '100px' }}>
                {activityData.map((d, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${(d.value / maxVal) * 80}px`, background: i === 3 ? '#10B981' : (darkMode ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'), transition: 'all 0.3s', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#10B981'}
                      onMouseLeave={e => e.currentTarget.style.background = i === 3 ? '#10B981' : (darkMode ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)')}
                    />
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.65rem' }}>{d.day}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Details */}
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', transition: 'background 0.3s' }}>
              <h3 style={{ margin: '0 0 1.25rem', color: textMain, fontSize: '1rem', fontWeight: '600' }}>Account Details</h3>
              {[
                { label: 'Member Since', value: user ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '-', icon: '📅' },
                { label: 'Account Status', value: 'Active', icon: '✅', color: '#10B981' },
                { label: 'Plan', value: 'Free', icon: '⭐', color: '#F59E0B' },
                { label: 'Last Login', value: 'Just now', icon: '🔐' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: i < 3 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{item.icon}</span>
                    <span style={{ color: textMuted, fontSize: '0.875rem' }}>{item.label}</span>
                  </div>
                  <span style={{ color: item.color || textMain, fontSize: '0.875rem', fontWeight: '600' }}>{item.value}</span>
                </div>
              ))}
            </div>

            {/* Danger Zone */}
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#EF4444', fontSize: '1rem', fontWeight: '600' }}>⚠️ Danger Zone</h3>
              <p style={{ margin: '0 0 1rem', color: textMuted, fontSize: '0.8rem' }}>These actions are irreversible. Please be careful.</p>
              <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ padding: '0.6rem 1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#EF4444', fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>🚪 Sign Out</button>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}