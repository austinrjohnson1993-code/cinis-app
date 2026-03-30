import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import CinisMark from '../../lib/CinisMark'

export default function JoinPage() {
  const router = useRouter()
  const { code } = router.query
  const [status, setStatus] = useState('loading') // loading | joining | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!code) return

    async function tryJoin() {
      setStatus('loading')

      // Check auth
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push(`/signup?redirect=/join/${code}`)
        return
      }

      setStatus('joining')
      try {
        const res = await fetch('/api/co-session/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ session_code: code }),
        })

        const data = await res.json()

        if (!res.ok) {
          setErrorMsg(data.error || 'Could not join session')
          setStatus('error')
          return
        }

        // Joined — go to focus tab with session loaded
        router.push(`/dashboard?tab=focus&session_id=${data.id}`)
      } catch {
        setErrorMsg('Something went wrong. Please try again.')
        setStatus('error')
      }
    }

    tryJoin()
  }, [code])

  return (
    <>
      <Head>
        <title>Join Focus Session · Cinis</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh',
        background: '#211A14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        fontFamily: "'Figtree', sans-serif",
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <CinisMark size={36} />
        </div>

        {(status === 'loading' || status === 'joining') && (
          <>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '2px solid rgba(164,123,219,0.25)',
              borderTopColor: '#A47BDB',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 20,
            }} />
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 18, color: '#F0EAD6', marginBottom: 6 }}>
              {status === 'loading' ? 'Checking session…' : 'Joining session…'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(240,234,214,0.35)' }}>
              One second
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(232,50,26,0.08)',
              border: '1px solid rgba(232,50,26,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E8321A" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 17, color: '#F0EAD6', marginBottom: 8 }}>
              Couldn&apos;t join
            </div>
            <div style={{ fontSize: 13, color: 'rgba(240,234,214,0.45)', marginBottom: 28, textAlign: 'center', maxWidth: 260, lineHeight: 1.6 }}>
              {errorMsg}
            </div>
            <button
              onClick={() => router.push('/dashboard?tab=focus')}
              style={{
                background: '#FF6644',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Go to Focus
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </>
  )
}
