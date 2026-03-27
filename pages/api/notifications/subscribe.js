import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'



async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { subscription, enabled } = req.body

  const supabase = getAdminClient()

  // Unsubscribe path
  if (enabled === false) {
    await supabase
      .from('profiles')
      .update({ push_notifications_enabled: false, push_subscription: null })
      .eq('id', userId)
    return res.status(200).json({ success: true, enabled: false })
  }

  // Subscribe path
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' })
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      push_subscription: subscription,
      push_notifications_enabled: true
    })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ success: true, enabled: true })
}

export default withAuth(handler)
