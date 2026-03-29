'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const steps = [
  { id: 1, title: 'Welcome to DataGhost! 👻', subtitle: "Let's set up your security platform in 3 quick steps", icon: '👻' },
  { id: 2, title: 'Tell us about yourself', subtitle: 'This helps us personalise your experience', icon: '👤' },
  { id: 3, title: 'Add your first asset', subtitle: 'Add a server or website you want to monitor', icon: '🖥️' },
  { id: 4, title: "You're all set! 🎉", subtitle: 'Your security dashboard is ready', icon: '🚀' },
]

export default function Onboarding() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [form, setForm] = useState({
    fullName: '', role: 'security_analyst', company: '',
    assetName: '', assetIp: '', assetType: 'server',
  })
  const router = useRouter()

  useEffect(() => {
    // Check auth — if not logged in, redirect to login
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        // Pre-fill name from profile
        const name = session.user?.user_metadata?.full_name || ''
        setForm(prev => ({ ...prev, fullName: name }))
        setCheckingAuth(false)
      }
    })
  }, [router])

  const handleNext = async () => {
    if (step === 2) {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: form.fullName,
          role: form.role,
          company: form.company,
          updated_at: new Date().toISOString(),
        })
      }
      setLoading(false)
    }

    if (step === 3 && form.assetName) {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await supabase.from('assets').insert({
          user_id: session.user.id,
          name: form.assetName,
          ip_address: form.assetIp || null,
          asset_type: form.assetType,
          environment: 'production',
          criticality: 'medium',
        })
      }
      setLoading(false)
    }

    if (step === 4) {
      router.push('/dashboard')
      return
    }

    setStep(step + 1)
  }

  const handleSkip = () => {
    if (step === 4) { router.push('/dashboard'); return }
    setStep(step + 1)
  }

  if (checkingAuth) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#10B981', fontSize: '1.5rem' }}>⏳</div>
      </div>
    )
  }

  const progress = ((step - 1) / (steps.length - 1)) * 100

  const inputStyle = {
    width: '100%', padding: '0.875rem 1rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#fff',
    outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', fontSize: '0.875rem',
    transition: 'border-color 0.2s'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>👻</div>
          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'white' }}>DataGhost</span>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            {steps.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', background: step > s.id ? '#10B981' : step === s.id ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)', border: `2px solid ${step >= s.id ? '#10B981' : 'rgba(255,255,255,0.1)'}`, color: step > s.id ? 'white' : step === s.id ? '#10B981' : 'rgba(255,255,255,0.3)', transition: 'all 0.3s' }}>
                  {step > s.id ? '✓' : s.id}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '2rem', backdropFilter: 'blur(10px)' }}>

          {/* Step header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{steps[step - 1].icon}</div>
            <h2 style={{ color: 'white', margin: '0 0 0.4rem', fontSize: '1.35rem', fontWeight: '700' }}>{steps[step - 1].title}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '0.875rem' }}>{steps[step - 1].subtitle}</p>
          </div>

          {/* Step 1 — Welcome */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { icon: '🛡️', title: 'Vulnerability Tracking', desc: 'Scan assets and track CVEs in real-time' },
                { icon: '📊', title: 'Compliance Reports', desc: 'SOC 2, ISO 27001, PCI DSS, GDPR' },
                { icon: '🔍', title: 'Site Security Auditor', desc: 'Check SSL, headers and DNS security' },
                { icon: '🔔', title: 'Real-time Alerts', desc: 'Instant email notifications for critical vulns' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{f.icon}</span>
                  <div>
                    <p style={{ margin: 0, color: 'white', fontSize: '0.875rem', fontWeight: '600' }}>{f.title}</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.78rem' }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2 — Profile */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  placeholder="John Doe" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Company / Organisation</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  placeholder="Acme Corp" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                  <option value="security_analyst">Security Analyst</option>
                  <option value="admin">System Admin</option>
                  <option value="developer">Developer</option>
                  <option value="manager">Security Manager</option>
                  <option value="auditor">Auditor</option>
                  <option value="cto">CTO / CISO</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3 — Add Asset */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Name *</label>
                <input value={form.assetName} onChange={e => setForm(p => ({ ...p, assetName: e.target.value }))}
                  placeholder="e.g. Web Server 1, Production DB" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IP Address / Hostname</label>
                <input value={form.assetIp} onChange={e => setForm(p => ({ ...p, assetIp: e.target.value }))}
                  placeholder="192.168.1.10 or myserver.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#10B981'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'} />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Asset Type</label>
                <select value={form.assetType} onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))} style={inputStyle}>
                  <option value="server">🖥️ Server</option>
                  <option value="endpoint">💻 Endpoint</option>
                  <option value="cloud">☁️ Cloud</option>
                  <option value="database">🗄️ Database</option>
                  <option value="network">🌐 Network Device</option>
                </select>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>You can skip this and add assets later from the Assets page.</p>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
                Your DataGhost security platform is ready. Start by scanning your assets, checking your site security, or exploring the live CVE threat feed.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { icon: '🖥️', text: 'Add more assets and run scans' },
                  { icon: '🔍', text: 'Audit any website security score' },
                  { icon: '📋', text: 'Generate compliance reports' },
                ].map((tip, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', background: 'rgba(16,185,129,0.05)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
                    <span>{tip.icon}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
            {step === 3 && (
              <button onClick={handleSkip} style={{ flex: 1, padding: '0.875rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.875rem' }}>
                Skip for now
              </button>
            )}
            <button onClick={handleNext} disabled={loading} style={{ flex: 2, padding: '0.875rem', background: loading ? 'rgba(16,185,129,0.5)' : '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.95rem', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}>
              {loading ? '⏳ Saving...' : step === 4 ? '🚀 Go to Dashboard' : step === 3 && !form.assetName ? 'Skip →' : 'Continue →'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', marginTop: '1.25rem' }}>
          Step {step} of {steps.length}
        </p>
      </div>
    </div>
  )
}