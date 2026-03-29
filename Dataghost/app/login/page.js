'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [particles, setParticles] = useState([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const p = Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 2 + Math.random() * 4, speed: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.4
    }))
    setParticles(p)
    const handleMouseMove = (e) => setMousePos({ x: e.clientX / window.innerWidth * 100, y: e.clientY / window.innerHeight * 100 })
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        // REGISTER
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } }
        })
        if (signUpError) throw signUpError

        // Create profile
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: fullName,
            role: 'admin',
            created_at: new Date().toISOString()
          })
        }

        // Send welcome email
        try {
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: email,
              subject: '👻 Welcome to DataGhost!',
              type: 'welcome',
              data: { name: fullName || email.split('@')[0] }
            })
          })
        } catch {}

        // If session exists (email confirm OFF) → go to onboarding
        // If no session (email confirm ON) → show message
        if (data.session) {
          router.push('/onboarding')
        } else {
          setError('✅ Check your email to confirm your account, then log in!')
        }

      } else {
        // LOGIN
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError

        // Audit log login
        await supabase.from('audit_logs').insert([{ user_id: data.user.id, action: 'auth.login', entity_type: 'auth', details: { email } }])

        // Check if user has completed onboarding (has a company or full_name set)
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, company')
          .eq('id', data.user.id)
          .single()

        // If no profile data at all → send to onboarding
        if (!profile?.full_name && !profile?.company) {
          router.push('/onboarding')
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', color: 'white',
    fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080B14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Animated gradient background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at ${mousePos.x}% ${mousePos.y}%, rgba(16,185,129,0.08) 0%, transparent 60%)`,
        transition: 'background 0.3s ease', pointerEvents: 'none'
      }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)`,
        backgroundSize: '40px 40px', pointerEvents: 'none'
      }} />

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`, borderRadius: '50%',
          background: '#10B981', opacity: p.opacity,
          boxShadow: `0 0 ${p.size * 3}px #10B981`,
          animation: `float ${3 + p.speed}s ease-in-out infinite alternate`,
          animationDelay: `${p.id * 0.1}s`
        }} />
      ))}

      {/* Glowing orbs */}
      <div style={{ position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '420px', padding: '0 1.5rem' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 0 20px rgba(16,185,129,0.4)' }}>👻</div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: 'white' }}>DataGhost</h1>
          </div>
          <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: 0 }}>Vulnerability Management Platform</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(19,19,26,0.8)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
          padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', marginBottom: '1.5rem' }}>
            {['Login', 'Register'].map(tab => (
              <button key={tab} onClick={() => { setIsRegister(tab === 'Register'); setError('') }} style={{
                flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s',
                background: (tab === 'Register') === isRegister ? '#10B981' : 'transparent',
                color: (tab === 'Register') === isRegister ? 'white' : '#6B7280'
              }}>{tab}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {isRegister && (
              <div>
                <label style={{ color: '#9CA3AF', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                <input type="text" placeholder="John Doe" value={fullName}
                  onChange={e => setFullName(e.target.value)} required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              </div>
            )}

            <div>
              <label style={{ color: '#9CA3AF', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Email Address</label>
              <input type="email" placeholder="you@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            </div>

            <div>
              <label style={{ color: '#9CA3AF', fontSize: '0.8rem', display: 'block', marginBottom: '0.4rem' }}>Password</label>
              <input type="password" placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} required style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
            </div>

            {error && (
              <div style={{
                fontSize: '0.8rem', textAlign: 'center', padding: '0.625rem', borderRadius: '8px',
                color: error.includes('✅') ? '#10B981' : '#EF4444',
                background: error.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${error.includes('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '0.875rem',
              background: loading ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', borderRadius: '10px', color: 'white',
              fontFamily: 'inherit', fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '700', boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.4)',
              transition: 'all 0.2s', marginTop: '0.25rem'
            }}>
              {loading ? '⏳ Please wait...' : isRegister ? '🚀 Create Account' : '🔐 Access System'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
          <a href="/reset-password" style={{ color: '#10B981', textDecoration: 'none' }}>Forgot password?</a>
        </p>

        <p style={{ textAlign: 'center', color: '#374151', fontSize: '0.75rem', marginTop: '1rem' }}>
          Protected by DataGhost Security Platform
        </p>
      </div>

      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to { transform: translateY(-20px) scale(1.2); }
        }
        input::placeholder { color: #4B5563; }
      `}</style>
    </div>
  )
}