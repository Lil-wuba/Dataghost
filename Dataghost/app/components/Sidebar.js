'use client'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/assets', icon: '🖥️', label: 'Assets' },
  { href: '/vulnerabilities', icon: '🔓', label: 'Vulnerabilities' },
  { href: '/threats', icon: '⚠️', label: 'Threats' },
  { href: '/remediation', icon: '🔧', label: 'Remediation' },
  { href: '/compliance', icon: '📋', label: 'Reports' },
  { href: '/auditor', icon: '🔍', label: 'Site Auditor' },
  { href: '/cve', icon: '🔎', label: 'CVE Database' },
  { href: '/scan-history', icon: '🕐', label: 'Scan History' },
  { href: '/audit-logs', icon: '📜', label: 'Audit Logs' },
  { href: '/profile', icon: '⚙️', label: 'Settings' },
  { href: '/guide', icon: '📖', label: 'How to Use' },
]

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [darkMode, setDarkMode] = useState(true)
  const [userInitials, setUserInitials] = useState('?')
  const [userName, setUserName] = useState('User')
  const [userRole, setUserRole] = useState('admin')
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const saved = localStorage.getItem('darkMode')
    const isDark = saved === null ? true : saved === 'true'
    setDarkMode(isDark)
    applyTheme(isDark)

    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
        if (data?.full_name) {
          setUserName(data.full_name)
          setUserInitials(data.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2))
          setUserRole(data.role || 'admin')
        } else if (session.user.email) {
          setUserName(session.user.email.split('@')[0])
          setUserInitials(session.user.email[0].toUpperCase())
        }
      }
    }
    loadUser()

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  function applyTheme(isDark) {
    localStorage.setItem('darkMode', isDark.toString())
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { darkMode: isDark } }))
  }

  function toggleDarkMode() {
    const newMode = !darkMode
    setDarkMode(newMode)
    applyTheme(newMode)
  }

  async function logout() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('audit_logs').insert([{ user_id: session.user.id, action: 'auth.logout', entity_type: 'auth', details: {} }])
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  const bg = darkMode ? '#0D0D14' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const sidebarVisible = !isMobile || isMobileOpen

  return (
    <>
      <GlobalSearch darkMode={darkMode} />

      {/* Mobile Hamburger Button */}
      {isMobile && (
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          style={{
            position: 'fixed', top: '1rem', left: '1rem', zIndex: 1100,
            width: '42px', height: '42px', borderRadius: '10px',
            background: darkMode ? '#1a1a2e' : '#fff',
            border: `1px solid ${border}`,
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '5px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ width: '18px', height: '2px', background: isMobileOpen ? '#10B981' : textMuted, borderRadius: '2px', transition: 'all 0.3s', transform: isMobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <div style={{ width: '18px', height: '2px', background: isMobileOpen ? 'transparent' : textMuted, borderRadius: '2px', transition: 'all 0.3s' }} />
          <div style={{ width: '18px', height: '2px', background: isMobileOpen ? '#10B981' : textMuted, borderRadius: '2px', transition: 'all 0.3s', transform: isMobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* Sidebar */}
      <nav style={{
        position: 'fixed', left: 0, top: 0,
        width: '260px', height: '100vh',
        background: bg, borderRight: `1px solid ${border}`,
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'transform 0.3s ease, background 0.3s',
        overflowY: 'auto', overflowX: 'visible',
        transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
      }}>

        {/* Logo + Bell */}
        <div style={{ padding: '1.25rem 1.25rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', boxShadow: '0 0 15px rgba(16,185,129,0.3)', flexShrink: 0 }}>👻</div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: textMain }}>DataGhost</h2>
              <p style={{ margin: 0, fontSize: '0.65rem', color: textMuted }}>Security Platform</p>
            </div>
          </div>
          <NotificationBell darkMode={darkMode} />
        </div>

        {/* Search */}
        <div style={{ padding: '0.5rem 1rem 0.75rem', flexShrink: 0 }}>
          <div onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, borderRadius: '8px', padding: '0.5rem 0.75rem', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#10B981'}
            onMouseLeave={e => e.currentTarget.style.borderColor = border}
          >
            <span style={{ color: textMuted, fontSize: '0.875rem' }}>🔍</span>
            <span style={{ color: textMuted, fontSize: '0.8rem', flex: 1 }}>Search...</span>
            <span style={{ background: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: textMuted, fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>⌘K</span>
          </div>
        </div>

        {/* Nav Items */}
        <div style={{ flex: 1, padding: '0 0.75rem' }}>
          <p style={{ color: textMuted, fontSize: '0.62rem', letterSpacing: '0.1em', padding: '0 0.75rem', marginBottom: '0.4rem', textTransform: 'uppercase' }}>Main Menu</p>
          {navItems.map(item => {
            const isActive = pathname === item.href
            return (
              <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.75rem', borderRadius: '8px', marginBottom: '0.1rem', textDecoration: 'none', transition: 'all 0.15s', background: isActive ? (darkMode ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)') : 'transparent', border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'transparent'}` }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: '0.95rem', width: '20px', textAlign: 'center', color: isActive ? '#10B981' : textMuted, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: '0.84rem', fontWeight: isActive ? '600' : '400', color: isActive ? '#10B981' : textMuted, flex: 1 }}>{item.label}</span>
                {isActive && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />}
              </a>
            )
          })}
        </div>

        {/* Bottom */}
        <div style={{ padding: '0.75rem', borderTop: `1px solid ${border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', marginBottom: '0.4rem' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', flexShrink: 0 }} />
            <span style={{ color: textMuted, fontSize: '0.72rem' }}>All systems operational</span>
          </div>
          <div style={{ padding: '0.4rem 0.75rem', marginBottom: '0.4rem' }}>
            <div onClick={toggleDarkMode} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.4rem 0.5rem',
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${border}`,
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = darkMode ? '#F59E0B' : '#6366F1' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border }}
            >
              {/* Sun icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: !darkMode ? 'rgba(245,158,11,0.2)' : 'transparent',
                border: !darkMode ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', transition: 'all 0.3s',
                boxShadow: !darkMode ? '0 0 10px rgba(245,158,11,0.3)' : 'none'
              }}>☀️</div>

              {/* Label */}
              <span style={{ color: textMuted, fontSize: '0.72rem', fontWeight: '500', flex: 1, textAlign: 'center' }}>
                {darkMode ? 'Dark Mode' : 'Light Mode'}
              </span>

              {/* Moon icon */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: darkMode ? 'rgba(99,102,241,0.2)' : 'transparent',
                border: darkMode ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', transition: 'all 0.3s',
                boxShadow: darkMode ? '0 0 10px rgba(99,102,241,0.3)' : 'none'
              }}>🌙</div>
            </div>
          </div>
          {/* Profile card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${border}`, cursor: 'pointer', transition: 'all 0.2s', marginBottom: '0.5rem' }}
            onClick={() => router.push('/profile')}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#10B981'}
            onMouseLeave={e => e.currentTarget.style.borderColor = border}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', flexShrink: 0 }}>{userInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '600', color: textMain, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</p>
              <p style={{ margin: 0, fontSize: '0.68rem', color: textMuted, textTransform: 'capitalize' }}>{userRole}</p>
            </div>
            <span style={{ color: textMuted, fontSize: '0.7rem' }}>⚙️</span>
          </div>

          {/* Visible Logout Button */}
          <button
            onClick={logout}
            style={{
              width: '100%', padding: '0.6rem 0.75rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              transition: 'all 0.2s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.15)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'
            }}
          >
            <span style={{ fontSize: '0.875rem' }}>🚪</span>
            <span style={{ color: '#EF4444', fontSize: '0.82rem', fontWeight: '600' }}>Log Out</span>
          </button>
        </div>
      </nav>

      {/* Push main content on desktop only */}
      {!isMobile && <div style={{ width: '260px', flexShrink: 0 }} />}
    </>
  )
}