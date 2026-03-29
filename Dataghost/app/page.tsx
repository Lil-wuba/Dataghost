'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        router.push('/landing')
      }
    }
    check()
  }, [])

  return (
    <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0D0D0D' }}>
      <div className="spinner" />
    </main>
  )
}
