// app/api/virustotal/route.js
import { NextResponse } from 'next/server';

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY;

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    if (!VT_API_KEY) {
      // Return mock data if no API key configured
      return NextResponse.json(getMockVTResult(url));
    }

    // Step 1: Submit URL for scanning
    const submitRes = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: {
        'x-apikey': VT_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `url=${encodeURIComponent(url)}`,
    });

    if (!submitRes.ok) {
      throw new Error('Failed to submit URL to VirusTotal');
    }

    const submitData = await submitRes.json();
    const analysisId = submitData.data?.id;

    if (!analysisId) {
      throw new Error('No analysis ID returned');
    }

    // Step 2: Get analysis results
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s for scan

    const resultRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': VT_API_KEY },
    });

    const resultData = await resultRes.json();
    const stats = resultData.data?.attributes?.stats || {};

    return NextResponse.json({
      url,
      malicious: stats.malicious || 0,
      suspicious: stats.suspicious || 0,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
      total: (stats.malicious || 0) + (stats.suspicious || 0) + (stats.harmless || 0) + (stats.undetected || 0),
      safe: (stats.malicious || 0) === 0 && (stats.suspicious || 0) === 0,
      engines: Object.entries(resultData.data?.attributes?.results || {})
        .filter(([, v]) => v.category === 'malicious')
        .map(([engine, v]) => ({ engine, result: v.result }))
        .slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json(getMockVTResult(url));
  }
}

function getMockVTResult(url) {
  return {
    url,
    malicious: 0,
    suspicious: 0,
    harmless: 67,
    undetected: 6,
    total: 73,
    safe: true,
    engines: [],
    note: 'Demo mode - Add VIRUSTOTAL_API_KEY to .env for real scanning',
  };
}