import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { session_id } = req.body
  if (!session_id) return res.status(400).json({ error: 'session_id required' })

  const supabaseAdmin = getAdminClient()

  const { data: session, error: sessionError } = await supabaseAdmin
    .from('co_sessions')
    .select('id, host_user_id, guest_user_id, status')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const isParticipant = session.host_user_id === userId || session.guest_user_id === userId
  if (!isParticipant) {
    return res.status(403).json({ error: 'Not a participant in this session' })
  }

  const { error: updateError } = await supabaseAdmin
    .from('co_sessions')
    .update({
      status: 'complete',
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', session_id)

  if (updateError) {
    console.error('[co-session/end]', updateError)
    return res.status(500).json({ error: 'Failed to end session' })
  }

  return res.status(200).json({ ended: true })
}

export default withAuth(handler)
