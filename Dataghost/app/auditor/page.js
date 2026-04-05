'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuditorRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => {
    const url = searchParams.get('url')
    router.replace(url ? `/site-audit?url=${encodeURIComponent(url)}` : '/site-audit')
  }, [])
  return (
    <div style={{ background: '#0A0A0F', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Redirecting...</p>
    </div>
  )
}

export default function Auditor() {
  return <Suspense fallback={<div style={{ background: '#0A0A0F', minHeight: '100vh' }} />}><AuditorRedirect /></Suspense>
}
