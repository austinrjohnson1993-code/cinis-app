import Head from 'next/head'
import styles from '../styles/Legal.module.css'
import CinisMark from '../lib/CinisMark'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Cinis</title>
      </Head>
      <div className={styles.page}>
        <div className={styles.topBar}>
          <a href="/dashboard" className={styles.logoLink}>
            <CinisMark size={28} />
            <span className={styles.wordmark}>Cinis</span>
          </a>
        </div>

        <div className={styles.body}>
          <h1 className={styles.pageTitle}>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: March 2026</p>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>What we collect</h2>
            <p className={styles.p}>To provide your AI coaching experience, Cinis collects the following:</p>
            <ul className={styles.ul}>
              <li><strong>Account information</strong> — your email address and authentication credentials.</li>
              <li><strong>Onboarding answers</strong> — your name, goals, challenges, and the coaching preferences you set during setup.</li>
              <li><strong>Tasks and to-dos</strong> — everything you add to your task list, including notes, due dates, and completion history.</li>
              <li><strong>Journal entries</strong> — the content of journal conversations you have with your coach.</li>
              <li><strong>Financial data</strong> — bills, income, and budget information you choose to enter.</li>
              <li><strong>Usage patterns</strong> — which features you use, when you check in, and how you interact with the app.</li>
              <li><strong>Device information</strong> — browser type, device type, and IP address for security and analytics.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>How we use it</h2>
            <ul className={styles.ul}>
              <li><strong>AI coaching personalization</strong> — your data is used to generate context-aware coaching messages, check-ins, and task suggestions.</li>
              <li><strong>Service improvement</strong> — aggregate usage patterns help us improve features and fix issues. We do not use individual journal content for model training.</li>
              <li><strong>Check-in scheduling</strong> — your time preferences and task data inform when and how your coach reaches out.</li>
              <li><strong>Communication</strong> — we send transactional emails (account setup, password reset, check-in notifications). We do not send marketing email without your consent.</li>
            </ul>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>What we share</h2>
            <p className={styles.p}>
              <strong>We never sell your personal data.</strong> We share data only with the service providers required to operate Cinis:
            </p>
            <ul className={styles.ul}>
              <li><strong>Anthropic</strong> — your tasks, coaching context, and journal messages are sent to Anthropic's API to generate AI responses. Anthropic's data use is governed by their API usage policy.</li>
              <li><strong>Supabase</strong> — all user data is stored in Supabase-hosted PostgreSQL databases with row-level security enabled.</li>
              <li><strong>Stripe</strong> — payment processing for Pro subscriptions. Stripe handles all card data; Cinis never stores payment card numbers.</li>
              <li><strong>Resend</strong> — transactional email delivery (account confirmation, password reset, notifications).</li>
            </ul>
            <p className={styles.p}>We do not share data with advertisers, data brokers, or analytics platforms that build user profiles.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Data retention</h2>
            <p className={styles.p}>
              Your data is retained for as long as your account is active. If you delete your account, all personal data — including tasks, journal entries, financial records, and coaching history — is permanently deleted within 30 days.
            </p>
            <p className={styles.p}>
              Anonymized, non-identifiable aggregate data may be retained for analytics purposes after account deletion.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Your rights</h2>
            <p className={styles.p}>You have the right to:</p>
            <ul className={styles.ul}>
              <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
              <li><strong>Correction</strong> — update or correct inaccurate information in your account at any time via Settings.</li>
              <li><strong>Deletion</strong> — request deletion of your account and all associated data.</li>
              <li><strong>Portability</strong> — request your data in a machine-readable format.</li>
            </ul>
            <p className={styles.p}>
              To exercise any of these rights, email us at{' '}
              <a href="mailto:hello@getcinis.app" className={styles.link}>hello@getcinis.app</a>.
              We respond to all requests within 30 days.
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>Contact</h2>
            <p className={styles.p}>
              Questions about this policy or your data? Email{' '}
              <a href="mailto:hello@getcinis.app" className={styles.link}>hello@getcinis.app</a>.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
