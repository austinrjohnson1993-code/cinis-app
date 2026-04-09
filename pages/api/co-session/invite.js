import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'
import { sendPushToUsers } from '../../../lib/push'

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { session_id, invited_user_id } = req.body
  if (!session_id || !invited_user_id) {
    return res.status(400).json({ error: 'session_id and invited_user_id required' })
  }

  const supabaseAdmin = getAdminClient()

  // Verify requesting user is the host
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('co_sessions')
    .select('id, host_user_id, session_code, duration_minutes')
    .eq('id', session_id)
    .single()

  if (sessionError || !session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  if (session.host_user_id !== userId) {
    return res.status(403).json({ error: 'Only the host can send invites' })
  }

  // Get host name
  const { data: hostProfile } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  const hostName = hostProfile?.full_name || 'Someone'

  // Send push notification if invited user has push enabled
  await sendPushToUsers(supabaseAdmin, [invited_user_id], {
    title: 'Focus invite',
    body: `${hostName} wants to body double — ${session.duration_minutes} min session`,
    tag: `co-session-invite-${session_id}`,
    url: `/join/${session.session_code}`,
  })

  return res.status(200).json({ sent: true })
}

export default withAuth(handler)
