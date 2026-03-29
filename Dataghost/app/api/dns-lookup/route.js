// app/api/dns-lookup/route.js
import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

    const hostname = url.replace(/^https?:\/\//, '').split('/')[0].split(':')[0]

    // Use Cloudflare's public DNS-over-HTTPS (no API key needed)
    const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA']
    const results = {}
    let score = 0

    await Promise.all(types.map(async (type) => {
      try {
        const res = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`,
          { headers: { 'Accept': 'application/dns-json' }, signal: AbortSignal.timeout(5000) }
        )
        const data = await res.json()
        if (data.Answer && data.Answer.length > 0) {
          results[type] = data.Answer.map(r => ({
            name: r.name,
            value: r.data,
            ttl: r.TTL,
          }))
        } else {
          results[type] = []
        }
      } catch {
        results[type] = []
      }
    }))

    // Security scoring
    const checks = []

    // Check SPF record
    const txtRecords = results.TXT || []
    const spfRecord = txtRecords.find(r => r.value?.includes('v=spf1'))
    checks.push({ name: 'SPF Record', present: !!spfRecord, value: spfRecord?.value || null, description: 'Prevents email spoofing', recommendation: 'Add TXT record: v=spf1 include:_spf.yourdomain.com ~all', weight: 25 })
    if (spfRecord) score += 25

    // Check DMARC
    let dmarcRecord = null
    try {
      const dmarcRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=_dmarc.${encodeURIComponent(hostname)}&type=TXT`,
        { headers: { 'Accept': 'application/dns-json' }, signal: AbortSignal.timeout(5000) }
      )
      const dmarcData = await dmarcRes.json()
      dmarcRecord = dmarcData.Answer?.find(r => r.data?.includes('v=DMARC1'))
    } catch {}
    checks.push({ name: 'DMARC Record', present: !!dmarcRecord, value: dmarcRecord?.data || null, description: 'Email authentication policy enforcement', recommendation: 'Add TXT record at _dmarc.' + hostname + ': v=DMARC1; p=reject; rua=mailto:dmarc@' + hostname, weight: 25 })
    if (dmarcRecord) score += 25

    // Check DNSSEC (check for DS/RRSIG)
    let dnssecEnabled = false
    try {
      const dsRes = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=DS`,
        { headers: { 'Accept': 'application/dns-json' }, signal: AbortSignal.timeout(5000) }
      )
      const dsData = await dsRes.json()
      dnssecEnabled = (dsData.Answer?.length > 0) || false
    } catch {}
    checks.push({ name: 'DNSSEC', present: dnssecEnabled, value: dnssecEnabled ? 'Enabled' : null, description: 'Protects against DNS spoofing/cache poisoning', recommendation: 'Enable DNSSEC through your domain registrar', weight: 25 })
    if (dnssecEnabled) score += 25

    // Check MX records
    const hasMX = (results.MX || []).length > 0
    checks.push({ name: 'MX Records', present: hasMX, value: hasMX ? results.MX.map(r => r.value).join(', ') : null, description: 'Valid mail exchange records', recommendation: 'Configure MX records for email routing', weight: 25 })
    if (hasMX) score += 25

    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F'

    return NextResponse.json({
      hostname,
      score,
      grade,
      records: results,
      checks,
      aRecords: results.A || [],
      nsRecords: results.NS || [],
      mxRecords: results.MX || [],
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}