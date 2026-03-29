'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function useCountUp(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    if (typeof target === 'string') { setCount(target); return }
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

export default function Landing() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  const [statsVisible, setStatsVisible] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const statsRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', onScroll)

    // Intersection observer for stats animation
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true) },
      { threshold: 0.3 }
    )
    if (statsRef.current) observer.observe(statsRef.current)

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer.disconnect()
    }
  }, [])

  const features = [
    {
      icon: '🛡️', title: 'Vulnerability Tracking', color: '#EF4444',
      desc: 'Track CVEs with severity scoring, status management and one-click remediation plans. Get email alerts instantly for critical findings.',
      tags: ['CVE Detection', 'CVSS Scoring', 'Email Alerts']
    },
    {
      icon: '🔍', title: 'Site Security Auditor', color: '#10B981',
      desc: 'Scan any website for SSL certificates, HTTP security headers, and DNS records. Get a security grade from A+ to F with fix recommendations.',
      tags: ['SSL Check', 'Headers', 'DNS Records']
    },
    {
      icon: '📋', title: 'Compliance Reports', color: '#6366F1',
      desc: 'Generate audit-ready reports for SOC 2, ISO 27001, NIST CSF, PCI DSS, HIPAA and GDPR. Export to PDF in one click.',
      tags: ['SOC 2', 'ISO 27001', 'PCI DSS', 'GDPR']
    },
    {
      icon: '🌐', title: 'Live CVE Database', color: '#F59E0B',
      desc: 'Search 200,000+ vulnerabilities from NVD in real-time. Filter by severity, affected software and CVSS score.',
      tags: ['NVD Data', 'Real-time', 'Search']
    },
    {
      icon: '🔧', title: 'Remediation Plans', color: '#10B981',
      desc: 'Create step-by-step fix plans linked to vulnerabilities. Track progress, verify each step and celebrate when issues are resolved.',
      tags: ['Step Tracking', 'Verification', 'Progress']
    },
    {
      icon: '⚠️', title: 'Threat Intelligence', color: '#EF4444',
      desc: 'Live feed of the latest CVEs and security threats updated in real-time. Stay ahead of attackers with instant notifications.',
      tags: ['Live Feed', 'Real-time', 'Notifications']
    },
  ]

  const steps = [
    { step: '01', icon: '🖥️', title: 'Add Your Assets', desc: 'Add servers, endpoints, databases and cloud infrastructure to your inventory.' },
    { step: '02', icon: '🔍', title: 'Scan & Discover', desc: 'One click scan automatically finds vulnerabilities and security issues.' },
    { step: '03', icon: '🔧', title: 'Fix & Verify', desc: 'Follow remediation steps, verify fixes and track your security score improve.' },
  ]

  const testimonials = [
    { name: 'Sarah K.', role: 'Security Engineer', company: 'TechCorp', text: 'DataGhost found 3 critical CVEs in our infrastructure within minutes of onboarding. The email alerts alone are worth it.', avatar: 'SK', color: '#EF4444' },
    { name: 'James R.', role: 'CTO', company: 'StartupXYZ', text: 'The compliance reporting saves us 10+ hours a month. PCI DSS and ISO 27001 reports generated in one click. Incredible.', avatar: 'JR', color: '#6366F1' },
    { name: 'Priya M.', role: 'DevOps Lead', company: 'CloudBase', text: 'The site auditor is phenomenal. Instantly shows missing security headers with exact fix commands. Deployed all fixes in an hour.', avatar: 'PM', color: '#10B981' },
  ]

  const statItems = [
    { value: 200000, suffix: '+', label: 'CVEs in Database', color: '#EF4444' },
    { value: 7, suffix: '', label: 'Compliance Frameworks', color: '#6366F1' },
    { value: 9, suffix: '', label: 'Security Header Checks', color: '#10B981' },
    { value: 100, suffix: '/100', label: 'Max Security Score', color: '#F59E0B' },
  ]

  const c1 = useCountUp(200000, 2000, statsVisible)
  const c2 = useCountUp(7, 1500, statsVisible)
  const c3 = useCountUp(9, 1200, statsVisible)
  const c4 = useCountUp(100, 1800, statsVisible)
  const counts = [c1, c2, c3, c4]

  return (
    <div style={{ background: '#070B12', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: 'white', overflowX: 'hidden' }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0.875rem 2rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: scrolled ? 'rgba(7,11,18,0.95)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        transition: 'all 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'linear-gradient(135deg, #10B981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', boxShadow: '0 0 15px rgba(16,185,129,0.4)' }}>👻</div>
          <span style={{ fontSize: '1.15rem', fontWeight: '800', color: 'white', letterSpacing: '-0.02em' }}>DataGhost</span>
        </div>

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <a href="/login" style={{ padding: '0.5rem 1.1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#10B981'; e.currentTarget.style.color = '#10B981' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' }}
          >Log In</a>
          <a href="/signup" style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: '#10B981', color: 'white', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '700', boxShadow: '0 4px 12px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.55)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.35)'}
          >Get Started Free →</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '7rem 1.5rem 4rem', position: 'relative', overflow: 'hidden' }}>

        {/* Background effects */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '800px', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '5%', left: '8%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '5%', right: '8%', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Floating badges — desktop only */}
        {[
          { top: '28%', left: '4%', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', color: '#EF4444', title: '🚨 Critical CVE Found', sub: 'CVE-2024-6387 • CVSS 9.8', delay: '0s' },
          { top: '32%', right: '4%', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)', color: '#10B981', title: '✅ SSL Grade A+', sub: 'Security Score: 98/100', delay: '1s' },
          { bottom: '30%', left: '3%', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.25)', color: '#6366F1', title: '📊 SOC 2 Compliant', sub: '94% Pass Rate', delay: '2s' },
          { bottom: '34%', right: '3%', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: '#F59E0B', title: '📧 Alert Sent', sub: 'Critical vuln detected', delay: '0.5s' },
        ].map((badge, i) => (
          <div key={i} style={{
            position: 'absolute', ...badge,
            background: badge.bg, border: `1px solid ${badge.border}`,
            borderRadius: '12px', padding: '0.75rem 1rem',
            animation: `float 3.5s ease-in-out infinite`,
            animationDelay: badge.delay,
            display: 'none',
          }} className="floating-badge">
            <p style={{ margin: 0, color: badge.color, fontSize: '0.72rem', fontWeight: '700' }}>{badge.title}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem' }}>{badge.sub}</p>
          </div>
        ))}

        <div style={{ maxWidth: '820px', position: 'relative', zIndex: 1, width: '100%' }}>

          {/* Live badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '20px', padding: '0.35rem 1rem', marginBottom: '1.75rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981', animation: 'pulse 2s infinite' }} />
            <span style={{ color: '#10B981', fontSize: '0.78rem', fontWeight: '600' }}>Real-time Security Intelligence Platform</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.75rem)', fontWeight: '900', lineHeight: 1.08, margin: '0 0 1.5rem', letterSpacing: '-0.03em' }}>
            Security That{' '}
            <span style={{ background: 'linear-gradient(135deg, #10B981 0%, #6366F1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Thinks Ahead
            </span>
          </h1>

          <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.75, margin: '0 0 2.5rem', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            Track vulnerabilities, scan websites, generate compliance reports and stay ahead of threats — all in one platform. Free to use.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
            <a href="/signup" style={{ padding: '0.9rem 2rem', background: '#10B981', borderRadius: '10px', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '0.975rem', boxShadow: '0 4px 20px rgba(16,185,129,0.4)', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(16,185,129,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.4)' }}
            >🚀 Start for Free — No card needed</a>
            <a href="/login" style={{ padding: '0.9rem 1.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontWeight: '600', fontSize: '0.975rem', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
            >Log In →</a>
          </div>

          {/* Dashboard preview card */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '1.25rem 1.5rem', maxWidth: '640px', margin: '0 auto', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
            {/* Fake browser bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['#EF4444', '#F59E0B', '#10B981'].map((c, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
                ))}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.25rem 0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'left' }}>vulnerability-app-blush.vercel.app/dashboard</div>
            </div>
            {/* Mock stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {[
                { label: 'Total Vulns', value: '24', color: '#6366F1' },
                { label: 'Critical', value: '3', color: '#EF4444' },
                { label: 'Assets', value: '8', color: '#10B981' },
                { label: 'Risk Score', value: '42', color: '#F59E0B', suffix: '/100' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: '0 0 0.2rem', fontSize: '1.35rem', fontWeight: '800', color: item.color }}>{item.value}{item.suffix || ''}</p>
                  <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>{item.label}</p>
                </div>
              ))}
            </div>
            {/* Mock chart bar */}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.25rem', alignItems: 'flex-end', height: '40px' }}>
              {[60, 30, 80, 45, 70, 55, 90, 40, 65, 75, 50, 85].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '2px', background: i % 3 === 0 ? 'rgba(239,68,68,0.5)' : i % 3 === 1 ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.4)', transition: 'height 0.3s' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section ref={statsRef} style={{ padding: '3.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center' }}>
          {statItems.map((stat, i) => (
            <div key={i}>
              <p style={{ margin: '0 0 0.3rem', fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: '900', color: stat.color, fontVariantNumeric: 'tabular-nums' }}>
                {i === 0 ? (statsVisible ? counts[i].toLocaleString() : '0') + stat.suffix : counts[i] + stat.suffix}
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '6rem 1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <p style={{ color: '#10B981', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Everything You Need</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: '800', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>One Platform. Total Security.</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.65 }}>Stop juggling tools. DataGhost brings vulnerability management, compliance and threat intelligence under one roof.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1.25rem' }}>
          {features.map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.75rem', transition: 'all 0.25s', cursor: 'default', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${f.color}40`; e.currentTarget.style.background = `${f.color}08`; e.currentTarget.style.transform = 'translateY(-4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '100px', background: `radial-gradient(circle, ${f.color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.35rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', fontWeight: '700', color: 'white' }}>{f.title}</h3>
              <p style={{ margin: '0 0 1rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.65 }}>{f.desc}</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {f.tags.map((tag, j) => (
                  <span key={j} style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: `${f.color}12`, color: f.color, fontSize: '0.68rem', fontWeight: '600', border: `1px solid ${f.color}20` }}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '6rem 1.5rem', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ color: '#6366F1', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Simple Process</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: '800', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>Up and running in 5 minutes</h2>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: 0 }}>No complex setup. No credit card. Just sign up and go.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                {i < steps.length - 1 && (
                  <div style={{ position: 'absolute', top: '36px', left: '58%', right: '-42%', height: '1px', background: 'linear-gradient(90deg, rgba(16,185,129,0.5), rgba(16,185,129,0.05))', pointerEvents: 'none' }} />
                )}
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.15))', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.75rem' }}>{s.icon}</div>
                <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', color: '#10B981', fontSize: '0.7rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '6px', marginBottom: '0.6rem', letterSpacing: '0.05em' }}>STEP {s.step}</div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: '700' }}>{s.title}</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem', lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: '6rem 1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <p style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: '800', margin: '0 0 1rem', letterSpacing: '-0.025em' }}>Free. Forever.</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', margin: 0 }}>No hidden fees. No credit card required. All features included.</p>
        </div>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 0 60px rgba(16,185,129,0.08)' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: 'white', fontSize: '0.7rem', fontWeight: '700', padding: '0.25rem 1rem', borderRadius: '0 0 8px 8px', letterSpacing: '0.08em' }}>FREE PLAN</div>
          <div style={{ marginTop: '1rem' }}>
            <p style={{ fontSize: '3.5rem', fontWeight: '900', margin: '0 0 0.25rem', color: '#10B981' }}>$0</p>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 2rem', fontSize: '0.875rem' }}>Forever free — no limits</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', textAlign: 'left' }}>
            {[
              'Unlimited vulnerability tracking',
              'Asset inventory & scanning',
              'Site security auditor',
              '6 compliance frameworks (SOC2, ISO27001, PCI DSS…)',
              'Live CVE database (200K+ entries)',
              'Email alerts for critical vulnerabilities',
              'PDF report exports',
              'Audit logs & notifications',
              'Remediation plan tracking',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ color: '#10B981', fontWeight: '700', fontSize: '0.875rem', flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.875rem' }}>{item}</span>
              </div>
            ))}
          </div>
          <a href="/signup" style={{ display: 'block', padding: '0.9rem', background: '#10B981', borderRadius: '10px', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '1rem', boxShadow: '0 4px 20px rgba(16,185,129,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 28px rgba(16,185,129,0.55)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.35)'}
          >🚀 Get Started Free</a>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '6rem 1.5rem', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '980px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p style={{ color: '#F59E0B', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem' }}>What People Say</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', fontWeight: '800', margin: 0, letterSpacing: '-0.025em' }}>Trusted by Security Teams</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.75rem', transition: 'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#F59E0B', fontSize: '0.875rem' }}>★</span>)}
                </div>
                <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.65)', fontSize: '0.9rem', lineHeight: 1.7, fontStyle: 'italic' }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${t.color}, ${t.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem', flexShrink: 0 }}>{t.avatar}</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: '700', fontSize: '0.875rem', color: 'white' }}>{t.name}</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '7rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '700px', height: '700px', background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👻</div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '900', margin: '0 0 1.25rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Ready to secure your<br />
            <span style={{ background: 'linear-gradient(135deg, #10B981, #6366F1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>infrastructure?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', margin: '0 0 2.5rem', lineHeight: 1.65 }}>
            Join DataGhost today. Free forever — no credit card needed.
          </p>
          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2.25rem', background: '#10B981', borderRadius: '12px', color: 'white', textDecoration: 'none', fontWeight: '700', fontSize: '1rem', boxShadow: '0 4px 25px rgba(16,185,129,0.4)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 35px rgba(16,185,129,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 25px rgba(16,185,129,0.4)' }}
            >🚀 Get Started Free</a>
            <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 1.75rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
            >Log In →</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.1rem' }}>👻</span>
            <span style={{ fontWeight: '800', color: '#10B981', fontSize: '0.975rem' }}>DataGhost</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>© 2026 All rights reserved</span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Site Auditor', href: '/auditor' },
              { label: 'CVE Database', href: '/cve' },
              { label: 'Compliance', href: '/compliance' },
              { label: 'Sign Up', href: '/signup' },
              { label: 'Login', href: '/login' },
            ].map(link => (
              <a key={link.label} href={link.href} style={{ color: 'rgba(255,255,255,0.35)', textDecoration: 'none', fontSize: '0.825rem', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#10B981'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
              >{link.label}</a>
            ))}
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #10B981; }
          50% { opacity: 0.6; box-shadow: 0 0 12px #10B981; }
        }
        @media (min-width: 900px) {
          .floating-badge { display: block !important; }
        }
        @media (max-width: 600px) {
          section > div > div[style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}