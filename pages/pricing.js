import Head from 'next/head'
import { useRouter } from 'next/router'

const FREE_FEATURES = [
  'Basic task management',
  '5 AI check-ins per day',
  'Calendar view',
  'Journal',
]

const PRO_FEATURES = [
  'Unlimited AI coaching',
  'SMS check-ins',
  'All integrations',
  'Pattern recognition',
]

export default function Pricing() {
  const router = useRouter()

  const handleGoPro = async () => {
    try {
      const res = await fetch('/api/stripe-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      console.error('Stripe checkout failed')
    }
  }

  return (
    <>
      <Head><title>Pricing — FocusBuddy</title></Head>
      <div style={s.page}>
        <div style={s.header}>
          <a href="/" style={s.logo}>
            <span className="brand">
              <span className="focus">Focus</span><span className="buddy">Buddy</span>
            </span>
          </a>
          <p style={s.tagline}>Simple pricing. No surprises.</p>
        </div>

        <div style={s.grid}>
          {/* Free tier */}
          <div style={s.card}>
            <p style={s.tierLabel}>Free</p>
            <p style={s.price}>$0<span style={s.per}>/month</span></p>
            <p style={s.tierDesc}>Everything you need to get started.</p>
            <ul style={s.featureList}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={s.featureItem}>
                  <span style={s.check}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={() => router.push('/signup')} style={s.btnSecondary}>
              Start Free
            </button>
          </div>

          {/* Pro tier */}
          <div style={{ ...s.card, ...s.cardPro }}>
            <div style={s.proBadge}>Most Popular</div>
            <p style={s.tierLabel}>Pro</p>
            <p style={s.price}>$9.99<span style={s.per}>/month</span></p>
            <p style={s.tierDesc}>For people serious about getting things done.</p>
            <ul style={s.featureList}>
              <li style={s.featureItem}><span style={s.check}>✓</span> Everything in Free</li>
              {PRO_FEATURES.map(f => (
                <li key={f} style={s.featureItem}>
                  <span style={s.check}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button onClick={handleGoPro} style={s.btnPrimary}>
              Go Pro →
            </button>
          </div>
        </div>

        <p style={s.footer}>Cancel anytime. No contracts.</p>
      </div>
    </>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 24px 80px',
    background: '#0d1117',
  },
  header: {
    textAlign: 'center',
    marginBottom: '64px',
  },
  logo: {
    fontSize: '1.8rem',
    display: 'block',
    marginBottom: '16px',
  },
  tagline: {
    color: 'rgba(240,234,214,0.45)',
    fontSize: '1.05rem',
    fontWeight: 300,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    width: '100%',
    maxWidth: '720px',
  },
  card: {
    background: '#1a1208',
    border: '1px solid rgba(255,200,120,0.09)',
    borderRadius: '20px',
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
  },
  cardPro: {
    border: '1px solid rgba(255,77,28,0.35)',
    background: '#1f1409',
  },
  proBadge: {
    position: 'absolute',
    top: '-13px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#ff4d1c',
    color: '#0d1117',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 14px',
    borderRadius: '100px',
    whiteSpace: 'nowrap',
  },
  tierLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(240,234,214,0.35)',
    margin: 0,
  },
  price: {
    fontFamily: "'Playfair Display', serif",
    fontWeight: 900,
    fontSize: '2.8rem',
    color: '#f0ead6',
    lineHeight: 1,
    margin: 0,
  },
  per: {
    fontSize: '1rem',
    fontFamily: "'Figtree', sans-serif",
    fontWeight: 400,
    color: 'rgba(240,234,214,0.4)',
  },
  tierDesc: {
    fontSize: '0.92rem',
    color: 'rgba(240,234,214,0.5)',
    fontWeight: 300,
    margin: 0,
  },
  featureList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    flex: 1,
  },
  featureItem: {
    fontSize: '0.92rem',
    color: 'rgba(240,234,214,0.75)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  check: {
    color: '#ff4d1c',
    fontWeight: 700,
    flexShrink: 0,
  },
  btnPrimary: {
    background: '#ff4d1c',
    color: '#0d1117',
    border: 'none',
    borderRadius: '100px',
    padding: '14px 28px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'rgba(240,234,214,0.6)',
    border: '1px solid rgba(255,200,120,0.15)',
    borderRadius: '100px',
    padding: '14px 28px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
  footer: {
    marginTop: '48px',
    fontSize: '0.85rem',
    color: 'rgba(240,234,214,0.25)',
  },
}
