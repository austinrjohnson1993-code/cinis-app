import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'
import { sendPushToUsers } from '../../../lib/push'

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { session_id, message } = req.body
  if (!session_id || !message) {
    return res.status(400).json({ error: 'session_id and message required' })
  }

  const supabaseAdmin = getAdminClient()

  // Verify user is host or guest
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('co_sessions')
    .select('id, host_user_id, guest_user_id, status')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const isHost = session.host_user_id === userId
  const isGuest = session.guest_user_id === userId

  if (!isHost && !isGuest) {
    return res.status(403).json({ error: 'Not a participant in this session' })
  }

  // Insert nudge
  const { error: insertError } = await supabaseAdmin
    .from('co_session_nudges')
    .insert({ session_id, from_user_id: userId, message })

  if (insertError) {
    console.error('[co-session/nudge]', insertError)
    return res.status(500).json({ error: 'Failed to send nudge' })
  }

  // Get sender name
  const { data: senderProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  const senderName = senderProfile?.full_name || 'Your partner'

  // Push to the other participant
  const otherId = isHost ? session.guest_user_id : session.host_user_id
  if (otherId) {
    await sendPushToUsers(supabaseAdmin, [otherId], {
      title: `Nudge from ${senderName}`,
      body: message,
      tag: `co-nudge-${session_id}`,
      url: `/dashboard?tab=focus&session_id=${session_id}`,
    })
  }

  return res.status(200).json({ sent: true })
}

export default withAuth(handler)
