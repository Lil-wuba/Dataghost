'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function validatePassword(pass) {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Must contain at least one uppercase letter'
    if (!/[0-9]/.test(pass)) return 'Must contain at least one number'
    return null
  }

  async function handleSignup(e) {
    e.preventDefault()
    const { fullName, email, password, confirmPassword } = formData
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    const passError = validatePassword(password)
    if (passError) { setError(passError); return }

    setLoading(true)
    setError('')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })

      if (signUpError) { setError(signUpError.message); return }

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

      // If session exists go straight to onboarding, else show verify email
      if (data.session) {
        router.push('/onboarding')
      } else {
        setStep(2)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.875rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', fontSize: '0.875rem',
    transition: 'border-color 0.2s'
  }

  if (step === 2) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '2px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', margin: '0 auto 1.5rem' }}>📧</div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '700', margin: '0 0 0.75rem' }}>Check your email</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', margin: '0 0 0.5rem', lineHeight: 1.6 }}>We sent a confirmation link to</p>
          <p style={{ color: '#10B981', fontWeight: '600', margin: '0 0 2rem' }}>{formData.email}</p>
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '1rem', marginBottom: '2rem' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
              Click the link in the email to verify your account, then you'll be taken through onboarding to set up your security dashboard.
            </p>
          </div>
          <a href="/login" style={{ display: 'block', padding: '0.875rem', background: '#10B981', borderRadius: '10px', color: 'white', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem', textAlign: 'center' }}>
            Go to Login →
          </a>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Didn't receive it? Check spam or{' '}
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>try again</button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', margin: '0 auto 1rem', boxShadow: '0 0 25px rgba(16,185,129,0.35)' }}>👻</div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem' }}>Create your account</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.875rem' }}>Start securing your infrastructure today</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem' }}>
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
              <input value={formData.fullName} onChange={e => updateField('fullName', e.target.value)}
                placeholder="John Doe" style={inputStyle} required
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input type="email" value={formData.email} onChange={e => updateField('email', e.target.value)}
                placeholder="you@company.com" style={inputStyle} required
                onFocus={e => e.target.style.borderColor = '#10B981'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={e => updateField('password', e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number" style={{ ...inputStyle, paddingRight: '3rem' }} required
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword}
                  onChange={e => updateField('confirmPassword', e.target.value)}
                  placeholder="Repeat password" style={{ ...inputStyle, paddingRight: '3rem' }} required
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '0.875rem' }}>
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: error.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${error.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', padding: '0.75rem', color: error.includes('✅') ? '#10B981' : '#EF4444', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ padding: '0.9rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', marginTop: '0.25rem' }}>
              {loading ? '⏳ Creating account...' : 'Create Account →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#10B981', textDecoration: 'none', fontWeight: '600' }}>Log in</a>
        </p>
      </div>
    </div>
  )
}