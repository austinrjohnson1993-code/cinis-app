import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import styles from '../styles/Auth.module.css'
import CinisMark from '../lib/CinisMark'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://cinis.app/reset-password',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Reset Password — Cinis</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.card}>
          <a href="/" style={{ display: 'inline-block', marginBottom: '28px', lineHeight: 0, textDecoration: 'none' }}>
            <CinisMark size={40} />
          </a>

          <h1 className={styles.heading}>Reset your password.</h1>
          <p className={styles.sub}>Enter your email and we&apos;ll send you a reset link.</p>

          {sent ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <p>Check your email for a reset link.</p>
              <p className={styles.successSub}>Link expires in 60 minutes.</p>
            </div>
          ) : (
            <>
              {error && <div className={styles.error}>{error}</div>}
              <form onSubmit={handleReset} className={styles.form}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={styles.input}
                />
                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <p className={styles.signupLink} style={{ marginTop: '20px' }}>
            <a href="/login">← Back to sign in</a>
          </p>
        </div>
      </div>
    </>
  )
}
