// app/components/AuthGuard.js
// Wrap your pages with this to prevent auth flash

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthGuard({ children }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAuthenticated(true)
      } else {
        router.push('/login')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.push('/login')
      if (event === 'SIGNED_IN') setAuthenticated(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0D0D14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1rem',
      }}>
        <div style={{
          width: '50px', height: '50px', borderRadius: '14px',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', boxShadow: '0 0 25px rgba(16,185,129,0.4)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>👻</div>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading DataGhost...</p>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    )
  }

  if (!authenticated) return null

  return <>{children}</>
}