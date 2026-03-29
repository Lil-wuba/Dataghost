'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/app/components/Sidebar'
import { useTheme } from '@/app/hooks/useTheme'

export default function Guide() {
  const darkMode = useTheme()
  const [activeSection, setActiveSection] = useState('getting-started')
  const router = useRouter()

  const bg = darkMode ? '#0A0A0F' : '#F0F2F5'
  const cardBg = darkMode ? '#13131A' : '#FFFFFF'
  const border = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
  const textMuted = darkMode ? '#6B7280' : '#9CA3AF'
  const textMain = darkMode ? '#FFFFFF' : '#111111'

  const sections = [
    { id: 'getting-started', label: 'Getting Started', icon: '🚀' },
    { id: 'assets', label: 'Managing Assets', icon: '🖥️' },
    { id: 'scanning', label: 'Running Scans', icon: '🔍' },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '⚠️' },
    { id: 'threats', label: 'Threat Feed', icon: '🛡️' },
    { id: 'remediation', label: 'Remediation', icon: '🔧' },
    { id: 'compliance', label: 'Compliance', icon: '📋' },
    { id: 'faq', label: 'FAQ', icon: '❓' },
  ]

  const content = {
    'getting-started': { title: 'Getting Started with DataGhost', desc: 'Welcome to DataGhost! Here\'s how to get up and running in minutes.', steps: [
      { title: 'Create Your Account', desc: 'Register with your email and password on the login page. Check your email to confirm your account.', icon: '👤', color: '#10B981' },
      { title: 'Add Your First Asset', desc: 'Go to Assets page and click "Add Asset". Enter your server or device details like IP address, hostname, and OS.', icon: '🖥️', color: '#6366F1' },
      { title: 'Run a Scan', desc: 'Click the "Scan" button on any asset to discover vulnerabilities. The scan takes a few seconds.', icon: '🔍', color: '#F59E0B' },
      { title: 'Review Vulnerabilities', desc: 'Go to the Vulnerabilities page to see what was found. Filter by severity and update statuses.', icon: '⚠️', color: '#EF4444' },
      { title: 'Create Remediation Plans', desc: 'For critical vulnerabilities, create a remediation plan with step-by-step fix instructions.', icon: '🔧', color: '#10B981' },
      { title: 'Generate Reports', desc: 'Go to Compliance page to generate reports for PCI DSS, ISO 27001, SOC 2, and GDPR frameworks.', icon: '📋', color: '#6366F1' },
    ]},
    'assets': { title: 'Managing Assets', desc: 'Assets are the servers, devices, and services in your infrastructure.', steps: [
      { title: 'What is an Asset?', desc: 'An asset is any server, computer, cloud service, database, or network device you want to monitor for vulnerabilities.', icon: '💡', color: '#10B981' },
      { title: 'Adding an Asset', desc: 'Click "+ Add Asset". Fill in Name (required), IP Address (required), Hostname, OS, Owner, Type, Environment, and Criticality.', icon: '➕', color: '#6366F1' },
      { title: 'Asset Types', desc: 'Choose from: Server, Endpoint (laptop/desktop), Cloud (AWS/Azure), Network (router/switch), or Database.', icon: '📁', color: '#F59E0B' },
      { title: 'Criticality Levels', desc: 'Critical = most important systems. High = important. Medium = standard. Low = less critical. This affects your risk score.', icon: '⭐', color: '#EF4444' },
      { title: 'Deleting Assets', desc: 'Click the 🗑️ button to delete an asset. Warning: this will also delete all associated vulnerabilities.', icon: '🗑️', color: '#EF4444' },
    ]},
    'scanning': { title: 'Running Security Scans', desc: 'Scans discover vulnerabilities on your assets automatically.', steps: [
      { title: 'How to Scan', desc: 'Go to Assets page. Find your asset and click the "🔍 Scan" button. The scan runs automatically.', icon: '▶️', color: '#10B981' },
      { title: 'What Happens During a Scan', desc: 'DataGhost simulates a security scan and generates realistic vulnerabilities based on your asset type and OS.', icon: '⚙️', color: '#6366F1' },
      { title: 'After the Scan', desc: 'The "Last Scanned" date updates on your asset. Go to Vulnerabilities page to see all discovered issues.', icon: '✅', color: '#10B981' },
      { title: 'Scan Multiple Assets', desc: 'You can scan all your assets one by one. Tip: Start with Critical and High criticality assets first!', icon: '🔄', color: '#F59E0B' },
    ]},
    'vulnerabilities': { title: 'Understanding Vulnerabilities', desc: 'Vulnerabilities are security weaknesses found on your assets.', steps: [
      { title: 'Severity Levels', desc: 'Critical = fix immediately! High = fix soon. Medium = fix this month. Low = fix when possible. Info = informational only.', icon: '🎯', color: '#EF4444' },
      { title: 'Vulnerability Status', desc: 'Open = not fixed. In Progress = being worked on. Resolved = fixed. Accepted = risk accepted. False Positive = not real.', icon: '📊', color: '#6366F1' },
      { title: 'Updating Status', desc: 'In the Vulnerabilities table, use the dropdown in the Status column to update each vulnerability.', icon: '✏️', color: '#10B981' },
      { title: 'CVE ID', desc: 'CVE stands for Common Vulnerabilities and Exposures. It\'s a unique ID for each known vulnerability e.g. CVE-2024-1234.', icon: '🔖', color: '#F59E0B' },
      { title: 'CVSS Score', desc: 'CVSS score rates severity from 0-10. 9-10 = Critical. 7-8.9 = High. 4-6.9 = Medium. 0-3.9 = Low.', icon: '📈', color: '#EF4444' },
      { title: 'Export to CSV', desc: 'Click "📥 Export CSV" to download all vulnerabilities as a spreadsheet for reporting or sharing.', icon: '📥', color: '#10B981' },
    ]},
    'threats': { title: 'Threat Intelligence Feed', desc: 'Live feed of the latest cybersecurity threats and CVEs.', steps: [
      { title: 'What is the Threat Feed?', desc: 'The Threat Feed shows the latest CVEs from the internet so you can stay ahead of new threats.', icon: '📡', color: '#EF4444' },
      { title: 'Refreshing the Feed', desc: 'Click "🔄 Refresh" to reload the latest threats. New threats will appear at the top.', icon: '🔄', color: '#10B981' },
      { title: 'Filtering Threats', desc: 'Use the severity buttons (Critical, High, Medium, Low) to filter threats. Click again to remove the filter.', icon: '🔽', color: '#6366F1' },
      { title: 'Exploit Available', desc: 'If a threat shows "🔴 Exploit Available" it means hackers have tools to attack this vulnerability. Fix it immediately!', icon: '🚨', color: '#EF4444' },
      { title: 'CVSS Score', desc: 'Each threat has a CVSS score. Higher = more dangerous. Focus on threats with CVSS score above 7.', icon: '📊', color: '#F59E0B' },
    ]},
    'remediation': { title: 'Remediation Planning', desc: 'Create step-by-step plans to fix your vulnerabilities.', steps: [
      { title: 'Creating a Plan', desc: 'Click "+ Create Plan". Select a vulnerability, set priority (Immediate/High/Medium/Low), and estimated hours to fix.', icon: '➕', color: '#10B981' },
      { title: 'Plan Priority', desc: 'Immediate = fix today! High = fix this week. Medium = fix this month. Low = fix when possible.', icon: '⚡', color: '#EF4444' },
      { title: 'Following Steps', desc: 'Each plan has 3 steps: Identify affected systems → Apply patch or fix → Verify fix and rescan.', icon: '📝', color: '#6366F1' },
      { title: 'Marking Steps Done', desc: 'Click the checkbox next to each step as you complete it. The progress bar will update automatically.', icon: '☑️', color: '#10B981' },
      { title: 'Completing a Plan', desc: 'Once all 3 steps are checked, click "✅ Mark Plan Verified" to complete the plan.', icon: '🏆', color: '#10B981' },
    ]},
    'compliance': { title: 'Compliance Reporting', desc: 'Generate compliance reports for major security frameworks.', steps: [
      { title: 'PCI DSS', desc: 'Payment Card Industry Data Security Standard. Required if you handle credit card payments.', icon: '💳', color: '#6366F1' },
      { title: 'ISO 27001', desc: 'International standard for information security management. Good for enterprise organizations.', icon: '🔒', color: '#10B981' },
      { title: 'SOC 2', desc: 'Service Organization Control 2. Required by many enterprise customers before doing business.', icon: '🛡️', color: '#F59E0B' },
      { title: 'GDPR', desc: 'General Data Protection Regulation. Required if you handle EU citizen data.', icon: '🇪🇺', color: '#EF4444' },
      { title: 'Pass Rate', desc: 'The donut chart shows your pass rate. Aim for 80%+ to be considered compliant.', icon: '📊', color: '#10B981' },
      { title: 'Generating Reports', desc: 'Click "📊 Generate Report" on any framework. Calculated based on your resolved vulnerabilities.', icon: '📋', color: '#6366F1' },
    ]},
    'faq': { title: 'Frequently Asked Questions', desc: 'Common questions and answers about DataGhost.', steps: [
      { title: 'Why is my Risk Score high?', desc: 'Your risk score is based on the number and severity of open vulnerabilities. Fix critical and high vulns to lower it.', icon: '❓', color: '#EF4444' },
      { title: 'Can other people see my data?', desc: 'No! All your data is private to your account. Other users cannot see your assets, vulnerabilities, or reports.', icon: '🔐', color: '#10B981' },
      { title: 'How do I share access with my team?', desc: 'Currently each person needs their own account. Team accounts are coming soon!', icon: '👥', color: '#6366F1' },
      { title: 'Is the scan data real?', desc: 'The scans are simulated for demo purposes. In production, scans would connect to real scanners like Nessus.', icon: '💡', color: '#F59E0B' },
      { title: 'How do I export my data?', desc: 'Go to Vulnerabilities page and click "📥 Export CSV". Compliance reports can be downloaded from Compliance page.', icon: '📥', color: '#10B981' },
      { title: 'I forgot my password', desc: 'Go to your Profile page and use the "Change Password" tab to update it after logging in.', icon: '🔑', color: '#F59E0B' },
    ]},
  }

  const current = content[activeSection]

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', transition: 'background 0.3s', position: 'relative' }}>
      {/* Background blur glow */}
      <div style={{ position: 'fixed', top: '20%', left: '40%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: '20%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <Sidebar />
      <main style={{ marginLeft: '260px', padding: '2rem 3rem', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.75rem', fontWeight: '700', color: textMain }}>📖 How to Use DataGhost</h1>
          <p style={{ margin: 0, color: textMuted, fontSize: '0.95rem' }}>Complete guide to using the DataGhost security platform.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem' }}>
          {/* Sidebar nav */}
          <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '1rem', height: 'fit-content', position: 'sticky', top: '1.5rem', transition: 'background 0.3s' }}>
            <p style={{ color: textMuted, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 0.75rem', padding: '0 0.5rem' }}>Contents</p>
            {sections.map(section => (
              <button key={section.id} onClick={() => setActiveSection(section.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: '8px', border: 'none', background: activeSection === section.id ? 'rgba(16,185,129,0.1)' : 'transparent', color: activeSection === section.id ? '#10B981' : textMuted, fontFamily: 'inherit', fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left', fontWeight: activeSection === section.id ? '600' : '400', marginBottom: '0.15rem', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (activeSection !== section.id) e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                onMouseLeave={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
                {activeSection === section.id && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />}
              </button>
            ))}
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '10px' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#10B981', fontSize: '0.8rem', fontWeight: '600' }}>🆕 Quick Start</p>
              <p style={{ margin: '0 0 0.75rem', color: textMuted, fontSize: '0.75rem', lineHeight: 1.5 }}>New here? Start with Getting Started guide!</p>
              <button onClick={() => setActiveSection('getting-started')} style={{ width: '100%', padding: '0.5rem', background: '#10B981', border: 'none', borderRadius: '6px', color: 'white', fontFamily: 'inherit', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}>Start Guide →</button>
            </div>
          </div>

          {/* Content */}
          <div>
            <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden', transition: 'background 0.3s' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100px', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <h2 style={{ margin: '0 0 0.5rem', color: textMain, fontSize: '1.4rem', fontWeight: '700' }}>{current.title}</h2>
              <p style={{ margin: 0, color: textMuted, fontSize: '0.95rem' }}>{current.desc}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {current.steps.map((step, i) => (
                <div key={i} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem', transition: 'all 0.25s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = step.color; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 35px ${step.color}25` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: `${step.color}15`, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{step.icon}</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: step.color, color: 'white', fontSize: '0.7rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                        <h3 style={{ margin: 0, color: textMain, fontSize: '1rem', fontWeight: '700' }}>{step.title}</h3>
                      </div>
                      <p style={{ margin: 0, color: textMuted, fontSize: '0.875rem', lineHeight: 1.65 }}>{step.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
              {sections.findIndex(s => s.id === activeSection) > 0 && (
                <button onClick={() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) - 1].id)} style={{ padding: '0.75rem 1.5rem', background: cardBg, border: `1px solid ${border}`, borderRadius: '10px', color: textMuted, fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', transition: 'all 0.2s' }}>← Previous</button>
              )}
              {sections.findIndex(s => s.id === activeSection) < sections.length - 1 && (
                <button onClick={() => setActiveSection(sections[sections.findIndex(s => s.id === activeSection) + 1].id)} style={{ marginLeft: 'auto', padding: '0.75rem 1.5rem', background: '#10B981', border: 'none', borderRadius: '10px', color: 'white', fontFamily: 'inherit', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}>Next →</button>
              )}
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}