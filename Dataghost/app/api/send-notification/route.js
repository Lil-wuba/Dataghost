import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { to, subject, type, data } = await req.json()
    if (!to || !subject) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const templates = {
      critical_vuln: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: white; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">🚨</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Critical Vulnerability Detected</h1>
          </div>
          <div style="padding: 32px;">
            <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; margin: 0 0 20px;">A critical vulnerability has been discovered in your infrastructure:</p>
            <div style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 20px; margin: 0 0 24px;">
              <p style="margin: 0 0 8px; color: #EF4444; font-weight: 700; font-size: 18px;">${data?.title || 'Unknown Vulnerability'}</p>
              <p style="margin: 0; color: rgba(255,255,255,0.6);">Severity: <strong style="color: #EF4444;">CRITICAL</strong></p>
              ${data?.asset ? `<p style="margin: 8px 0 0; color: rgba(255,255,255,0.6);">Asset: <strong style="color: white;">${data.asset}</strong></p>` : ''}
            </div>
            <a href="https://vulnerability-app-blush.vercel.app/vulnerabilities" style="display: inline-block; padding: 14px 28px; background: #EF4444; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px;">View Vulnerability →</a>
          </div>
          <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; color: rgba(255,255,255,0.3); font-size: 13px;">👻 DataGhost Security Platform • <a href="https://vulnerability-app-blush.vercel.app" style="color: #10B981; text-decoration: none;">vulnerability-app-blush.vercel.app</a></p>
          </div>
        </div>`,

      welcome: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: white; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #10B981, #059669); padding: 40px; text-align: center;">
            <div style="font-size: 56px; margin-bottom: 16px;">👻</div>
            <h1 style="margin: 0; font-size: 28px; font-weight: 900;">Welcome to DataGhost!</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 16px;">Your security platform is ready</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.6; margin: 0 0 24px;">Hey <strong style="color: white;">${data?.name || 'there'}</strong>, welcome aboard! Here's how to get started:</p>
            ${['Add your first asset 🖥️', 'Run a vulnerability scan 🔍', 'Check your site security score 🔒', 'Generate a compliance report 📊'].map((step, i) => `
              <div style="display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #10B981; flex-shrink: 0; text-align: center; line-height: 32px;">${i + 1}</div>
                <span style="color: rgba(255,255,255,0.8); font-size: 15px;">${step}</span>
              </div>`).join('')}
            <div style="margin-top: 28px;">
              <a href="https://vulnerability-app-blush.vercel.app/dashboard" style="display: inline-block; padding: 14px 28px; background: #10B981; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 15px rgba(16,185,129,0.3);">Go to Dashboard →</a>
            </div>
          </div>
          <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; color: rgba(255,255,255,0.3); font-size: 13px;">👻 DataGhost Security Platform • <a href="https://vulnerability-app-blush.vercel.app" style="color: #10B981; text-decoration: none;">vulnerability-app-blush.vercel.app</a></p>
          </div>
        </div>`,

      scan_complete: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: white; border-radius: 16px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #6366F1, #4F46E5); padding: 32px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">🔍</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Scan Complete</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8);">${data?.hostname || 'Your Site'}</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: rgba(255,255,255,0.7); margin: 0 0 20px; font-size: 16px;">Here are your security scan results:</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 36px; font-weight: 800; color: ${(data?.score || 0) >= 70 ? '#10B981' : '#EF4444'};">${data?.grade || 'N/A'}</p>
                <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 13px;">Overall Grade</p>
              </div>
              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="margin: 0 0 6px; font-size: 36px; font-weight: 800; color: ${(data?.score || 0) >= 70 ? '#10B981' : '#EF4444'};">${data?.score || 0}</p>
                <p style="margin: 0; color: rgba(255,255,255,0.5); font-size: 13px;">Security Score / 100</p>
              </div>
            </div>
            <a href="https://vulnerability-app-blush.vercel.app/scan-history" style="display: inline-block; padding: 14px 28px; background: #6366F1; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px;">View Full Report →</a>
          </div>
          <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="margin: 0; color: rgba(255,255,255,0.3); font-size: 13px;">👻 DataGhost Security Platform</p>
          </div>
        </div>`
    }

    const html = templates[type] || templates.welcome

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'DataGhost <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      })
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return NextResponse.json({ error: resendData.message || 'Email failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: resendData.id })

  } catch (err) {
    console.error('Email error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}