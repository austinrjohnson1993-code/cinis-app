import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../lib/stripe'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), v.join('=')]
    }).filter(([k]) => k)
  )
}

function extractTokenFromCookies(cookieHeader) {
  if (!cookieHeader) return null
  const cookies = parseCookies(cookieHeader)
  const sessionKey = Object.keys(cookies).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
  if (!sessionKey) return null
  try {
    const decoded = decodeURIComponent(cookies[sessionKey])
    const parsed = JSON.parse(decoded)
    const session = Array.isArray(parsed) ? parsed[0] : parsed
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let token = req.headers.authorization?.replace('Bearer ', '').trim() || null
  if (!token) token = extractTokenFromCookies(req.headers.cookie)
  if (!token) return res.status(401).json({ error: 'No auth token provided' })

  const supabaseAdmin = getAdminClient()
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' })

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
