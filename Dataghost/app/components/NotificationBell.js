'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NotificationBell({ darkMode }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const bellRef = useRef(null)
  const dropdownRef = useRef(null)
  const router = useRouter()

  const cardBg = darkMode ? '#1A1A2E' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  useEffect(() => {
    loadNotifications()

    // Real-time: new vulnerability inserted
    const channel = supabase.channel('notif-vulns')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vulnerabilities' }, async (payload) => {
        const sev = payload.new.severity
        const notif = {
          type: sev === 'critical' ? 'critical' : 'warning',
          title: sev === 'critical' ? '🚨 Critical Vulnerability!' : '⚠️ New Vulnerability Found',
          message: payload.new.title,
          href: '/vulnerabilities'
        }
        // Persist to notifications table
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.from('notifications').insert([{ user_id: session.user.id, ...notif }])
        }
        setNotifications(prev => [{ id: Date.now(), ...notif, time: 'Just now', read: false }, ...prev.slice(0, 9)])
        setUnread(prev => prev + 1)
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scan_history' }, (payload) => {
        const n = {
          id: Date.now() + 1,
          type: payload.new.grade?.startsWith('A') ? 'success' : payload.new.grade === 'F' ? 'critical' : 'warning',
          title: payload.new.grade?.startsWith('A') ? '✅ Site Audit Complete' : '⚠️ Site Audit Issues Found',
          message: (payload.new.hostname || payload.new.url) + ' — Grade: ' + (payload.new.grade || '?'),
          time: 'Just now',
          read: false,
          href: '/scan-history'
        }
        setNotifications(prev => [n, ...prev.slice(0, 9)])
        setUnread(prev => prev + 1)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target) && dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadNotifications() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    // Load from persistent notifications table first
    const { data: persisted } = await supabase.from('notifications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(8)

    if (persisted && persisted.length > 0) {
      const mapped = persisted.map(n => ({
        id: n.id, type: n.type, title: n.title,
        message: n.message, time: timeAgo(n.created_at), read: n.read, href: n.href || '/dashboard',
        dbId: n.id
      }))
      setNotifications(mapped)
      setUnread(mapped.filter(n => !n.read).length)
      return
    }

    // Fallback: build from vulnerabilities + remediation_plans
    const { data: vulns } = await supabase.from('vulnerabilities').select('id, title, severity, discovered_at').eq('user_id', session.user.id).order('discovered_at', { ascending: false }).limit(5)
    const { data: plans } = await supabase.from('remediation_plans').select('id, priority, status, created_at, vulnerabilities(title)').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(3)
    const { data: scans } = await supabase.from('scan_history').select('id, hostname, grade, created_at').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(3)

    const notifs = [
      ...(vulns || []).map(v => ({ id: v.id, type: v.severity === 'critical' ? 'critical' : v.severity === 'high' ? 'warning' : 'info', title: v.severity === 'critical' ? '🚨 Critical Vulnerability' : v.severity === 'high' ? '⚠️ High Vulnerability' : '🔍 Vulnerability Found', message: v.title, time: timeAgo(v.discovered_at), read: false, href: '/vulnerabilities' })),
      ...(plans || []).map(p => ({ id: 'plan-' + p.id, type: 'success', title: '🔧 Remediation Plan Created', message: p.vulnerabilities?.title || 'New plan', time: timeAgo(p.created_at), read: true, href: '/remediation' })),
      ...(scans || []).map(s => ({ id: 'scan-' + s.id, type: s.grade?.startsWith('A') ? 'success' : 'warning', title: s.grade?.startsWith('A') ? '✅ Site Audit Passed' : '⚠️ Site Audit Issues', message: (s.hostname || 'Unknown') + ' — Grade: ' + (s.grade || '?'), time: timeAgo(s.created_at), read: true, href: '/scan-history' })),
    ].sort((a, b) => a.read - b.read).slice(0, 8)

    setNotifications(notifs)
    setUnread(notifs.filter(n => !n.read).length)
  }

  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return mins + 'm ago'
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return hrs + 'h ago'
    return Math.floor(hrs / 24) + 'd ago'
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnread(0)
    // Persist to DB
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false)
    }
  }

  async function dismissNotification(e, notifId, dbId) {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== notifId))
    if (dbId) {
      await supabase.from('notifications').delete().eq('id', dbId)
    }
    setUnread(prev => Math.max(0, prev - 1))
  }

  const typeColors = { critical: '#EF4444', warning: '#F59E0B', info: '#6366F1', success: '#10B981' }
  const typeBg = { critical: 'rgba(239,68,68,0.1)', warning: 'rgba(245,158,11,0.1)', info: 'rgba(99,102,241,0.1)', success: 'rgba(16,185,129,0.1)' }
  const typeIcon = { critical: '🚨', warning: '⚠️', info: 'ℹ️', success: '✅' }

  return (
    <>
      <button ref={bellRef} onClick={() => setOpen(!open)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: '1px solid ' + (open ? '#10B981' : border), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', transition: 'all 0.2s', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#10B981'}
        onMouseLeave={e => e.currentTarget.style.borderColor = open ? '#10B981' : border}>
        🔔
        {unread > 0 && (
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: '700', border: '2px solid ' + cardBg, boxShadow: '0 0 6px rgba(239,68,68,0.5)', animation: 'bellPulse 2s infinite' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999998, backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setOpen(false)}>
          <div ref={dropdownRef} onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', background: cardBg, border: '1px solid ' + border, borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid ' + border, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: textMain, fontSize: '0.95rem', fontWeight: '700' }}>Notifications</h3>
                <p style={{ margin: 0, color: textMuted, fontSize: '0.75rem' }}>{unread > 0 ? unread + ' unread' : 'All caught up'}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {unread > 0 && <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', fontFamily: 'inherit' }}>Mark all read</button>}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: textMuted, fontSize: '1.1rem', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: textMuted }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔔</div>
                  <p style={{ margin: '0 0 0.25rem', fontWeight: '600', color: textMain, fontSize: '0.9rem' }}>All caught up!</p>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>No notifications yet. Add vulnerabilities or run a site scan to get started.</p>
                </div>
              ) : notifications.map((notif, i) => (
                <div key={notif.id} onClick={() => { router.push(notif.href); setOpen(false) }}
                  style={{ display: 'flex', gap: '0.875rem', padding: '0.875rem 1.25rem', borderBottom: i < notifications.length - 1 ? '1px solid ' + border : 'none', cursor: 'pointer', background: !notif.read ? (darkMode ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.03)') : 'transparent', transition: 'background 0.15s', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = !notif.read ? (darkMode ? 'rgba(16,185,129,0.04)' : 'rgba(16,185,129,0.03)') : 'transparent'}
                >
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: typeBg[notif.type], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>{typeIcon[notif.type]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                      <p style={{ margin: 0, color: typeColors[notif.type], fontSize: '0.8rem', fontWeight: '700' }}>{notif.title}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
                        <span style={{ color: textMuted, fontSize: '0.7rem' }}>{notif.time}</span>
                        <button onClick={e => dismissNotification(e, notif.id, notif.dbId)} style={{ background: 'none', border: 'none', color: textMuted, fontSize: '0.8rem', cursor: 'pointer', padding: '0', lineHeight: 1, opacity: 0.6 }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>✕</button>
                      </div>
                    </div>
                    <p style={{ margin: 0, color: textMuted, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notif.message}</p>
                  </div>
                  {!notif.read && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0, marginTop: '4px', boxShadow: '0 0 6px #10B981' }} />}
                </div>
              ))}
            </div>
            <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid ' + border, display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { router.push('/vulnerabilities'); setOpen(false) }} style={{ flex: 1, padding: '0.5rem', background: '#10B981', border: 'none', borderRadius: '8px', color: 'white', fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}>View Vulnerabilities</button>
              <button onClick={() => { router.push('/scan-history'); setOpen(false) }} style={{ flex: 1, padding: '0.5rem', background: 'transparent', border: '1px solid ' + border, borderRadius: '8px', color: textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer' }}>Scan History</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes bellPulse { 0%,100%{box-shadow:0 0 6px rgba(239,68,68,0.5)} 50%{box-shadow:0 0 12px rgba(239,68,68,0.8)} }`}</style>
    </>
  )
}
