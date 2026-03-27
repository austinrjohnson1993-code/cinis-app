import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import Head from 'next/head'
import styles from '../styles/Auth.module.css'
import CinisMark from '../lib/CinisMark'

export default function ResetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event — fired when Supabase processes the
    // recovery token from the URL hash. More reliable than getSession() which
    // has a timing race before the hash is exchanged.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      } else if (event === 'SIGNED_IN' && session) {
        // Fallback: hash already exchanged before component mounted
        setSessionReady(true)
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        setSuccess(true)
        setPassword('')
        setConfirm('')
        setLoading(false)
        // Redirect to login after success
        setTimeout(() => router.push('/login'), 2000)
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
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

          <a href="/" className={styles.logoWrap}>
            <CinisMark size={24} className={styles.mark} aria-hidden="true" />
            <span className={styles.wordmark}>CINIS</span>
          </a>

          <p className={styles.tagline}>Where start meets finished.</p>

          {success ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <p>Password updated successfully!</p>
              <p className={styles.successSub}>Redirecting to sign in...</p>
            </div>
          ) : (
            <>
              <h1 className={styles.heading}>Reset your password.</h1>
              <p className={styles.sub}>Enter your new password below.</p>

              {error && <div className={styles.error}>{error}</div>}

              {sessionReady && (
                <form onSubmit={handleResetPassword} className={styles.form}>
                  <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={styles.input}
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className={styles.input}
                  />
                  <button type="submit" disabled={loading} className={styles.submitBtn}>
                    {loading ? 'Updating…' : 'Update password'}
                  </button>
                </form>
              )}

              <p className={styles.signupLink}>
                <a href="/login">Back to sign in</a>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
