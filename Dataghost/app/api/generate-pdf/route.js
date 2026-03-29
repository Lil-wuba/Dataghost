import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { frameworkName, passRate, reportId, checks } = await req.json()

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const grade = passRate >= 90 ? 'A' : passRate >= 80 ? 'B' : passRate >= 70 ? 'C' : passRate >= 60 ? 'D' : 'F'
    const statusColor = passRate >= 80 ? '#10B981' : passRate >= 60 ? '#F59E0B' : '#EF4444'
    const statusText = passRate >= 80 ? 'COMPLIANT' : passRate >= 60 ? 'PARTIAL' : 'NON-COMPLIANT'

    const sampleChecks = checks || [
      { name: 'Access Control', status: passRate > 60 ? 'pass' : 'fail' },
      { name: 'Cryptography', status: passRate > 50 ? 'pass' : 'fail' },
      { name: 'Network Security', status: passRate > 40 ? 'pass' : 'fail' },
      { name: 'Vulnerability Management', status: passRate > 70 ? 'pass' : 'fail' },
      { name: 'Incident Response', status: passRate > 80 ? 'pass' : 'fail' },
      { name: 'Risk Assessment', status: passRate > 75 ? 'pass' : 'fail' },
    ]

    // Generate HTML that will be used for the PDF
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${frameworkName} Compliance Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
    .header { background: linear-gradient(135deg, #0A0A0F, #13131A); color: white; padding: 40px; border-radius: 16px; margin-bottom: 32px; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50%; right: -10%; width: 300px; height: 300px; background: radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%); }
    .logo { font-size: 24px; font-weight: 800; color: #10B981; margin-bottom: 8px; }
    .report-title { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .report-date { color: rgba(255,255,255,0.6); font-size: 14px; }
    .status-badge { display: inline-block; padding: 8px 20px; border-radius: 30px; font-weight: 700; font-size: 14px; letter-spacing: 1px; margin-top: 16px; background: ${statusColor}22; color: ${statusColor}; border: 2px solid ${statusColor}; }
    .score-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .score-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px; text-align: center; }
    .score-value { font-size: 48px; font-weight: 800; color: ${statusColor}; }
    .score-label { color: #6B7280; font-size: 13px; margin-top: 4px; }
    .section-title { font-size: 18px; font-weight: 700; color: #111; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0; }
    .check-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 8px; margin-bottom: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; }
    .check-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .check-pass { background: #D1FAE5; color: #10B981; }
    .check-fail { background: #FEE2E2; color: #EF4444; }
    .check-name { font-weight: 500; font-size: 14px; color: #111; flex: 1; }
    .check-status { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
    .status-pass { background: #D1FAE5; color: #059669; }
    .status-fail { background: #FEE2E2; color: #DC2626; }
    .progress-bar { background: #E2E8F0; border-radius: 4px; height: 8px; margin: 8px 0; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 4px; background: ${statusColor}; width: ${passRate}%; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-weight: 700; color: #10B981; font-size: 16px; }
    .footer-text { color: #9CA3AF; font-size: 12px; }
    .recommendation { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px; padding: 20px; margin-top: 24px; }
    .recommendation h3 { color: #92400E; margin-bottom: 12px; font-size: 15px; }
    .recommendation p { color: #78350F; font-size: 13px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">👻 DataGhost</div>
    <div class="report-title">${frameworkName} Compliance Report</div>
    <div class="report-date">Generated on ${dateStr} • Report ID: ${reportId || 'RPT-' + Date.now()}</div>
    <div class="status-badge">${statusText}</div>
  </div>

  <div class="score-section">
    <div class="score-card">
      <div class="score-value">${passRate.toFixed(0)}%</div>
      <div class="score-label">Overall Pass Rate</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="color: #6366F1">${grade}</div>
      <div class="score-label">Compliance Grade</div>
    </div>
    <div class="score-card">
      <div class="score-value" style="font-size: 32px; color: #111">${frameworkName}</div>
      <div class="score-label">Framework</div>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-fill"></div>
  </div>
  <p style="color: #6B7280; font-size: 12px; text-align: right; margin-bottom: 32px;">${passRate.toFixed(1)}% of controls passing</p>

  <div class="section-title">Control Assessment Results</div>
  ${sampleChecks.map(check => `
    <div class="check-item">
      <div class="check-icon ${check.status === 'pass' ? 'check-pass' : 'check-fail'}">${check.status === 'pass' ? '✓' : '✗'}</div>
      <span class="check-name">${check.name}</span>
      <span class="check-status ${check.status === 'pass' ? 'status-pass' : 'status-fail'}">${check.status === 'pass' ? 'PASS' : 'FAIL'}</span>
    </div>
  `).join('')}

  ${passRate < 80 ? `
  <div class="recommendation">
    <h3>⚠️ Recommendations for Improvement</h3>
    <p>Your current pass rate of ${passRate.toFixed(0)}% indicates areas requiring attention. Focus on resolving critical vulnerabilities, implementing missing security controls, and conducting regular security audits to achieve full ${frameworkName} compliance. Consider engaging a qualified security assessor for detailed remediation guidance.</p>
  </div>
  ` : ''}

  <div class="footer">
    <div>
      <div class="footer-brand">👻 DataGhost Security Platform</div>
      <div class="footer-text">Confidential — For internal use only</div>
    </div>
    <div style="text-align: right">
      <div class="footer-text">Generated: ${dateStr}</div>
      <div class="footer-text">DataGhost v1.0 • Automated Compliance Reporting</div>
    </div>
  </div>
</body>
</html>`

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'X-Report-Grade': grade,
        'X-Pass-Rate': passRate.toString(),
      }
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}