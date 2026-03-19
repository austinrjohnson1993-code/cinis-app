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
    console.log('[stripe/webhook] Webhook received:', event.type)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      const customerId = session.customer
      const customerEmail = session.customer_details?.email

      console.log('[stripe/webhook] Checkout completed - userId:', userId, 'email:', customerEmail, 'customerId:', customerId)

      if (userId) {
        // Update by userId (primary method)
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'pro', stripe_customer_id: customerId })
          .eq('id', userId)
        console.log('[stripe/webhook] Updated subscription_status to pro for userId:', userId)
      } else if (customerEmail) {
        // Fallback: update by email if userId not in metadata
        const { data: user } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .single()

        console.log('[stripe/webhook] Fallback user lookup by email:', customerEmail, 'result:', user)

        if (user) {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'pro', stripe_customer_id: customerId })
            .eq('id', user.id)
          console.log('[stripe/webhook] Updated subscription_status to pro for email:', customerEmail)
        }
      } else {
        console.warn('[stripe/webhook] No userId or customerEmail in checkout session - cannot update subscription')
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      const status = sub.status === 'active' ? 'pro' : 'cancelled'
      const customerId = sub.customer

      console.log('[stripe/webhook] Subscription updated - customerId:', customerId, 'status:', status)

      const customers = await stripe.customers.retrieve(customerId)
      const email = customers.email

      console.log('[stripe/webhook] Customer lookup - email:', email)

      if (email) {
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: status })
          .eq('email', email)
        console.log('[stripe/webhook] Updated subscription_status to', status, 'for email:', email)
      } else {
        console.warn('[stripe/webhook] No email found for customerId:', customerId)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const customerId = sub.customer

      console.log('[stripe/webhook] Subscription deleted - customerId:', customerId)

      // Try to look up by stripe_customer_id first (reliable method)
      let { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('stripe_customer_id', customerId)

      console.log('[stripe/webhook] Lookup by stripe_customer_id - result:', profiles)

      // Fall back to email lookup if stripe_customer_id not found
      if (!profiles || profiles.length === 0) {
        const customer = await stripe.customers.retrieve(customerId)
        const email = customer.email

        console.log('[stripe/webhook] Fallback lookup by email:', email)

        if (email) {
          ({ data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email))
          console.log('[stripe/webhook] Fallback result:', profiles)
        }
      }

      // Update subscription status for matching profile
      if (profiles && profiles.length > 0) {
        const userId = profiles[0].id
        await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId)
        console.log('[stripe/webhook] Updated subscription_status to cancelled for userId:', userId)
      } else {
        console.warn('[stripe/webhook] No profile found for customerId:', customerId)
      }
    } else {
      console.log('[stripe/webhook] Unhandled event type:', event.type)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
