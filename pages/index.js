import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
  }, [])

  const features = [
    {
      title: 'It comes to you',
      description: "Morning check-ins, evening wrap-ups, proactive nudges. You don't open Cinis. Cinis opens the conversation."
    },
    {
      title: 'It knows you',
      description: '13 questions on day one. A coaching profile built from your answers. Every interaction shaped by who you actually are.'
    },
    {
      title: 'It remembers you',
      description: 'Patterns, avoidances, wins, momentum. The longer you use Cinis, the better it knows what you need.'
    }
  ]

  return (
    <>
      <Head>
        <title>Cinis — AI that shows up for you</title>
        <meta name="description" content="An AI coaching partner that knows your patterns, learns your pace, and reaches out before you fall behind." />
      </Head>

      <div className={styles.page}>
        {/* Navigation */}
        <nav className={styles.nav}>
          <span className={styles.logo}>Cinis</span>
          <div className={styles.navLinks}>
            <a href="/login" className={styles.navSignIn}>Sign in</a>
            <a href="/signup" className={styles.navCta}>Get started free</a>
          </div>
        </nav>

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.badge}>EARLY ACCESS — NOW OPEN</div>
            <h1 className={styles.headline}>
              Most productivity apps wait for you to remember them.
              <br />
              <span className={styles.accentText}>Cinis remembers you.</span>
            </h1>
            <p className={styles.subhead}>
              An AI coaching partner that knows your patterns, learns your pace, and reaches out before you fall behind.
            </p>
            <div className={styles.heroCtas}>
              <a href="/signup" className={styles.ctaPrimary}>Create free account</a>
              <a href="/login" className={styles.ctaSecondary}>Sign in</a>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className={styles.socialProof}>
          <p className={styles.proofText}>Built for ADHD brains. Works for everyone.</p>
        </section>

        {/* Features */}
        <section className={styles.features}>
          <div className={styles.featureGrid}>
            {features.map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureBody}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className={styles.closingSection}>
          <h2 className={styles.closingHeadline}>Ready for a partner that actually shows up?</h2>
          <p className={styles.closingSubhead}>Free to start. No credit card required.</p>
          <a href="/signup" className={styles.closingCta}>Create your free account</a>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>Cinis · Early Access 2026</p>
        </footer>
      </div>
    </>
  )
}
