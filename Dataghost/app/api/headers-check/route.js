import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const targetUrl = url.startsWith('http') ? url : `https://${url}`

    let headers = {}
    try {
      const res = await fetch(targetUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'DataGhost-Security-Scanner/1.0' }
      })
      headers = Object.fromEntries(res.headers.entries())
    } catch {
      const res = await fetch(targetUrl.replace('https://', 'http://'), {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'DataGhost-Security-Scanner/1.0' }
      })
      headers = Object.fromEntries(res.headers.entries())
    }

    const checks = [
      {
        name: 'Strict-Transport-Security',
        key: 'strict-transport-security',
        description: 'Forces HTTPS connections. Protects against downgrade attacks.',
        recommendation: 'Add: Strict-Transport-Security: max-age=31536000; includeSubDomains',
        weight: 20,
        critical: true,
      },
      {
        name: 'Content-Security-Policy',
        key: 'content-security-policy',
        description: 'Prevents XSS attacks by controlling resource loading.',
        recommendation: 'Add: Content-Security-Policy: default-src \'self\'',
        weight: 20,
        critical: true,
      },
      {
        name: 'X-Frame-Options',
        key: 'x-frame-options',
        description: 'Prevents clickjacking attacks by controlling iframe embedding.',
        recommendation: 'Add: X-Frame-Options: DENY',
        weight: 15,
        critical: false,
      },
      {
        name: 'X-Content-Type-Options',
        key: 'x-content-type-options',
        description: 'Prevents MIME type sniffing attacks.',
        recommendation: 'Add: X-Content-Type-Options: nosniff',
        weight: 10,
        critical: false,
      },
      {
        name: 'Referrer-Policy',
        key: 'referrer-policy',
        description: 'Controls how much referrer information is shared.',
        recommendation: 'Add: Referrer-Policy: strict-origin-when-cross-origin',
        weight: 10,
        critical: false,
      },
      {
        name: 'Permissions-Policy',
        key: 'permissions-policy',
        description: 'Controls browser features and APIs access.',
        recommendation: 'Add: Permissions-Policy: camera=(), microphone=(), geolocation=()',
        weight: 10,
        critical: false,
      },
      {
        name: 'X-XSS-Protection',
        key: 'x-xss-protection',
        description: 'Legacy XSS filter for older browsers.',
        recommendation: 'Add: X-XSS-Protection: 1; mode=block',
        weight: 5,
        critical: false,
      },
      {
        name: 'Cross-Origin-Opener-Policy',
        key: 'cross-origin-opener-policy',
        description: 'Isolates browsing context to prevent cross-origin attacks.',
        recommendation: 'Add: Cross-Origin-Opener-Policy: same-origin',
        weight: 5,
        critical: false,
      },
      {
        name: 'Cross-Origin-Resource-Policy',
        key: 'cross-origin-resource-policy',
        description: 'Prevents other origins from reading your resources.',
        recommendation: 'Add: Cross-Origin-Resource-Policy: same-origin',
        weight: 5,
        critical: false,
      },
    ]

    let totalScore = 0
    const results = checks.map(check => {
      const present = !!headers[check.key]
      const value = headers[check.key] || null
      if (present) totalScore += check.weight
      return { ...check, present, value }
    })

    // Check for dangerous headers
    const dangerousHeaders = ['server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version']
    const exposedHeaders = dangerousHeaders.filter(h => headers[h]).map(h => ({ name: h, value: headers[h] }))

    return NextResponse.json({
      url: targetUrl,
      score: totalScore,
      grade: totalScore >= 90 ? 'A+' : totalScore >= 80 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 60 ? 'C' : totalScore >= 50 ? 'D' : 'F',
      checks: results,
      exposedHeaders,
      totalHeaders: Object.keys(headers).length,
      passCount: results.filter(r => r.present).length,
      failCount: results.filter(r => !r.present).length,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to reach URL: ' + err.message }, { status: 500 })
  }
}