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
    console.log('[stripe/webhook] Webhook received:', event.type, 'data:', JSON.stringify(event.data.object, null, 2))

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const userId = session.metadata?.userId
      const customerId = session.customer
      const customerEmail = session.customer_details?.email

      console.log('[stripe/webhook] Checkout completed - userId:', userId, 'customerEmail:', customerEmail, 'customerId:', customerId)

      if (userId) {
        // Update by userId (primary method)
        const { data: updateResult, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'pro', stripe_customer_id: customerId })
          .eq('id', userId)
          .select()
        console.log('[stripe/webhook] Update by userId:', userId, 'result:', JSON.stringify(updateResult), 'error:', updateError)
      } else if (customerEmail) {
        // Fallback: update by email if userId not in metadata
        console.log('[stripe/webhook] userId missing, attempting fallback lookup by email:', customerEmail)
        const { data: user, error: lookupError } = await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .eq('email', customerEmail)
          .single()

        console.log('[stripe/webhook] Email lookup result:', JSON.stringify(user), 'error:', lookupError)

        if (user) {
          const { data: updateResult, error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'pro', stripe_customer_id: customerId })
            .eq('id', user.id)
            .select()
          console.log('[stripe/webhook] Update by email - userId:', user.id, 'result:', JSON.stringify(updateResult), 'error:', updateError)
        } else {
          console.warn('[stripe/webhook] Email lookup failed - no user found with email:', customerEmail)
        }
      } else {
        console.warn('[stripe/webhook] No userId or customerEmail in checkout session - cannot update subscription')
      }
    } else if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object
      const status = sub.status === 'active' ? 'pro' : 'cancelled'
      const customerId = sub.customer

      console.log('[stripe/webhook] Subscription updated - customerId:', customerId, 'Stripe status:', sub.status, 'mapped to:', status)

      const customers = await stripe.customers.retrieve(customerId)
      const email = customers.email

      console.log('[stripe/webhook] Customer lookup - customerId:', customerId, 'email:', email)

      if (email) {
        const { data: updateResult, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: status })
          .eq('email', email)
          .select()
        console.log('[stripe/webhook] Update result - email:', email, 'status:', status, 'result:', JSON.stringify(updateResult), 'error:', updateError)
      } else {
        console.warn('[stripe/webhook] No email found for customerId:', customerId)
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object
      const customerId = sub.customer

      console.log('[stripe/webhook] Subscription deleted - customerId:', customerId)

      // Try to look up by stripe_customer_id first (reliable method)
      let { data: profiles, error: lookupError1 } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('stripe_customer_id', customerId)

      console.log('[stripe/webhook] Lookup by stripe_customer_id - customerId:', customerId, 'result:', JSON.stringify(profiles), 'error:', lookupError1)

      // Fall back to email lookup if stripe_customer_id not found
      if (!profiles || profiles.length === 0) {
        const customer = await stripe.customers.retrieve(customerId)
        const email = customer.email

        console.log('[stripe/webhook] Fallback lookup by email - customerId:', customerId, 'email:', email)

        if (email) {
          const { data: fallbackProfiles, error: lookupError2 } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .eq('email', email)
          profiles = fallbackProfiles
          console.log('[stripe/webhook] Fallback result:', JSON.stringify(profiles), 'error:', lookupError2)
        }
      }

      // Update subscription status for matching profile
      if (profiles && profiles.length > 0) {
        const userId = profiles[0].id
        const { data: updateResult, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ subscription_status: 'cancelled' })
          .eq('id', userId)
          .select()
        console.log('[stripe/webhook] Update result - userId:', userId, 'result:', JSON.stringify(updateResult), 'error:', updateError)
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
