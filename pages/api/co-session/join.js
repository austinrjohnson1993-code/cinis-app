import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { session_code } = req.body
  if (!session_code) return res.status(400).json({ error: 'session_code required' })

  const supabaseAdmin = getAdminClient()

  const { data: session, error: findError } = await supabaseAdmin
    .from('co_sessions')
    .select('*')
    .eq('session_code', session_code.toUpperCase().trim())
    .eq('status', 'waiting')
    .single()

  if (findError || !session) {
    return res.status(404).json({ error: 'Session not found or already started' })
  }

  if (session.guest_user_id) {
    return res.status(409).json({ error: 'Session already has a partner' })
  }

  if (session.host_user_id === userId) {
    return res.status(400).json({ error: 'Cannot join your own session' })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('co_sessions')
    .update({
      guest_user_id: userId,
      status: 'active',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.id)
    .select()
    .single()

  if (updateError) {
    console.error('[co-session/join]', updateError)
    return res.status(500).json({ error: 'Failed to join session' })
  }

  return res.status(200).json(updated)
}

export default withAuth(handler)
