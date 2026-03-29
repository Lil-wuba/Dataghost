import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'DataGhost <onboarding@resend.dev>',
        to: ['delivered@resend.dev'],
        subject: '🧪 DataGhost Test Email',
        html: '<h1>✅ Working!</h1>'
      })
    })

    const data = await res.json()

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      response: data,
      apiKeyExists: !!process.env.RESEND_API_KEY,
      apiKeyFirst8: process.env.RESEND_API_KEY?.slice(0, 8) ?? 'NOT FOUND'
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}