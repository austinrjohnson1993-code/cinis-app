import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../lib/stripe'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        headers: { cookie: req.headers.cookie || '' }
      }
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  console.log('[stripe] user:', user?.id, user?.email)
  if (error || !user) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    const customer = customers.data[0]
    if (!customer) {
      return res.status(404).json({ error: 'No Stripe customer found for this account' })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: 'https://cinis.app/dashboard',
    })

    return res.status(200).json({ url: portalSession.url })
  } catch (err) {
    console.error('[stripe/portal] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
