import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    let hostname = url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]

    // Use SSL Labs API (free, no key needed)
    const sslRes = await fetch(`https://api.ssllabs.com/api/v3/analyze?host=${hostname}&publish=off&all=done&ignoreMismatch=on`, {
      headers: { 'User-Agent': 'DataGhost/1.0' }
    })
    const sslData = await sslRes.json()

    if (sslData.status === 'ERROR') {
      return NextResponse.json({ error: sslData.statusMessage || 'SSL check failed' }, { status: 400 })
    }

    if (sslData.status !== 'READY') {
      // Return in-progress so frontend can poll
      return NextResponse.json({ status: sslData.status, hostname, inProgress: true })
    }

    const endpoint = sslData.endpoints?.[0]
    const grade = endpoint?.grade || 'N/A'
    const cert = endpoint?.details?.cert

    return NextResponse.json({
      hostname,
      grade,
      status: 'READY',
      inProgress: false,
      issuer: cert?.issuerLabel || 'Unknown',
      subject: cert?.subject || hostname,
      validFrom: cert?.notBefore ? new Date(cert.notBefore).toLocaleDateString() : 'Unknown',
      validTo: cert?.notAfter ? new Date(cert.notAfter).toLocaleDateString() : 'Unknown',
      daysLeft: cert?.notAfter ? Math.floor((cert.notAfter - Date.now()) / 86400000) : null,
      protocol: endpoint?.details?.protocols?.map(p => p.name + ' ' + p.version).join(', ') || 'Unknown',
      keyStrength: cert?.keyStrength || null,
      vulnerabilities: {
        heartbleed: endpoint?.details?.heartbleed || false,
        poodle: endpoint?.details?.poodle || false,
        freak: endpoint?.details?.freak || false,
        logjam: endpoint?.details?.logjam || false,
        beast: endpoint?.details?.vulnBeast || false,
        ticketbleed: endpoint?.details?.ticketbleed === 2 || false,
      },
      score: grade === 'A+' ? 100 : grade === 'A' ? 90 : grade === 'B' ? 75 : grade === 'C' ? 60 : grade === 'D' ? 45 : grade === 'F' ? 20 : 0
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}