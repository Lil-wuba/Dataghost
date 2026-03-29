'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPassword() {
  const [mode, setMode] = useState('request') // 'request' | 'update'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if this is a password reset callback from email link
    // Supabase puts the token in the URL hash or as query params
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'))
    const queryParams = new URLSearchParams(window.location.search)

    const accessToken = hashParams.get('access_token') || queryParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token')
    const type = hashParams.get('type') || queryParams.get('type')

    if (accessToken && (type === 'recovery' || type === 'signup')) {
      // Set the session from the token in the URL
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      }).then(({ error }) => {
        if (!error) {
          setMode('update')
        } else {
          setError('Reset link is invalid or expired. Please request a new one.')
        }
      })
    } else {
      // Check if user already has a session (came from settings page)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setMode('update')
      })
    }
  }, [])

  // Request password reset email
  async function handleRequest(e) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required'); return }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
    }
  }

  // Update password with new one
  async function handleUpdate(e) {
    e.preventDefault()
    if (!password || !confirm) { setError('Both fields are required'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.875rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: 'white',
    fontFamily: 'inherit', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080B14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <a href="/landing" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(16,185,129,0.35)' }}>👻</div>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>DataGhost</span>
          </a>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(19,19,26,0.8)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px',
          padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
        }}>

          {/* ── REQUEST MODE — Enter email ── */}
          {mode === 'request' && !done && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔑</div>
                <h1 style={{ color: 'white', fontSize: '1.35rem', fontWeight: '700', margin: '0 0 0.4rem' }}>Forgot Password?</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.875rem', lineHeight: 1.6 }}>
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#EF4444', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    placeholder="you@example.com"
                    style={inputStyle} required
                    onFocus={e => e.target.style.borderColor = '#10B981'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <button type="submit" disabled={loading} style={{
                  padding: '0.875rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981',
                  border: 'none', borderRadius: '10px', color: 'white',
                  fontFamily: 'inherit', fontWeight: '700', fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.3)',
                  marginTop: '0.25rem'
                }}>
                  {loading ? '⏳ Sending...' : '📧 Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* ── REQUEST DONE — Check email ── */}
          {mode === 'request' && done && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
              <h2 style={{ color: 'white', margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '700' }}>Check your email!</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem', fontSize: '0.875rem', lineHeight: 1.6 }}>We sent a reset link to</p>
              <p style={{ color: '#10B981', fontWeight: '600', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>{email}</p>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0, lineHeight: 1.6 }}>
                  Click the link in the email to reset your password. Check your spam folder if you don't see it.
                </p>
              </div>
              <button onClick={() => { setDone(false); setEmail('') }} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit', fontWeight: '600' }}>
                ← Try a different email
              </button>
            </div>
          )}

          {/* ── UPDATE MODE — Enter new password ── */}
          {mode === 'update' && !done && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔐</div>
                <h1 style={{ color: 'white', fontSize: '1.35rem', fontWeight: '700', margin: '0 0 0.4rem' }}>Set New Password</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.875rem' }}>
                  Choose a strong password for your account
                </p>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem', color: '#EF4444', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                  ❌ {error}
                </div>
              )}

              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Min 8 characters"
                      style={{ ...inputStyle, paddingRight: '3rem' }} required
                      onFocus={e => e.target.style.borderColor = '#10B981'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.875rem' }}>
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {/* Password strength */}
                  {password.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: '2px', transition: 'all 0.3s',
                          width: password.length < 6 ? '25%' : password.length < 8 ? '50%' : password.length < 12 ? '75%' : '100%',
                          background: password.length < 6 ? '#EF4444' : password.length < 8 ? '#F59E0B' : password.length < 12 ? '#6366F1' : '#10B981'
                        }} />
                      </div>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: password.length < 6 ? '#EF4444' : password.length < 8 ? '#F59E0B' : password.length < 12 ? '#6366F1' : '#10B981' }}>
                        {password.length < 6 ? 'Too weak' : password.length < 8 ? 'Weak' : password.length < 12 ? 'Good' : 'Strong ✓'}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
                  <input
                    type="password" value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="Repeat new password"
                    style={{ ...inputStyle, borderColor: confirm && confirm !== password ? 'rgba(239,68,68,0.5)' : confirm && confirm === password ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)' }}
                    required
                    onFocus={e => e.target.style.borderColor = '#10B981'}
                    onBlur={e => e.target.style.borderColor = confirm && confirm !== password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}
                  />
                  {confirm && confirm !== password && (
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.68rem', color: '#EF4444' }}>Passwords don't match</p>
                  )}
                </div>

                <button type="submit" disabled={loading} style={{
                  padding: '0.875rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981',
                  border: 'none', borderRadius: '10px', color: 'white',
                  fontFamily: 'inherit', fontWeight: '700', fontSize: '0.95rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(16,185,129,0.3)',
                  marginTop: '0.25rem'
                }}>
                  {loading ? '⏳ Updating...' : '🔐 Update Password'}
                </button>
              </form>
            </>
          )}

          {/* ── SUCCESS ── */}
          {mode === 'update' && done && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ color: '#10B981', margin: '0 0 0.75rem', fontSize: '1.25rem', fontWeight: '700' }}>Password Updated!</h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: '0.875rem' }}>Redirecting you to dashboard...</p>
              <div style={{ marginTop: '1.5rem', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#10B981', borderRadius: '2px', animation: 'progress 2.5s linear forwards' }} />
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '1.25rem' }}>
          Remember your password?{' '}
          <a href="/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '600' }}>Log in</a>
        </p>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        input::placeholder { color: #4B5563; }
      `}</style>
    </div>
  )
}