import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../../lib/stripe'

export const config = { api: { bodyParser: false } }

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const sig = req.headers['stripe-signature']
  if (!sig) return res.status(400).json({ error: 'Missing stripe-signature header' })

  let event
  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err.message)
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` })
  }

  const supabaseAdmin = getAdminClient()

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      const customerId = session.customer
      if (userId) {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'pro', stripe_customer_id: customerId })
          .eq('id', userId)
        console.log(`[stripe/webhook] checkout.session.completed — set pro for user ${userId}, saved customer ID ${customerId}`)
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      const status = sub.status === 'active' ? 'pro' : 'cancelled'
      // Look up user by stripe customer ID stored in metadata or customer field
      const customerId = sub.customer
      const customers = await stripe.customers.retrieve(customerId)
      const email = customers.email
      if (email) {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: status })
          .eq('email', email)
        console.log(`[stripe/webhook] subscription.updated — set ${status} for ${email}`)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const customerId = sub.customer

      // Try to look up by stripe_customer_id first (reliable method)
      let { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('stripe_customer_id', customerId)

      // Fall back to email lookup if stripe_customer_id not found
      if (!profiles || profiles.length === 0) {
        const customer = await stripe.customers.retrieve(customerId)
        const email = customer.email
        if (email) {
          ({ data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email))
        }
      }

      // Update subscription status for matching profile
      if (profiles && profiles.length > 0) {
        const userId = profiles[0].id
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId)
        console.log(`[stripe/webhook] subscription.deleted — set cancelled for user ${userId}`)
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
