import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'session_id required' })

  const supabaseAdmin = getAdminClient()

  const { data: session, error } = await supabaseAdmin
    .from('co_sessions')
    .select('*')
    .eq('id', session_id)
    .single()

  if (error || !session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const isParticipant = session.host_user_id === userId || session.guest_user_id === userId
  if (!isParticipant) {
    return res.status(403).json({ error: 'Not a participant in this session' })
  }

  // Enrich with user names
  const userIds = [session.host_user_id, session.guest_user_id].filter(Boolean)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))

  return res.status(200).json({
    ...session,
    host_name: profileMap[session.host_user_id]?.full_name || 'Host',
    guest_name: session.guest_user_id
      ? profileMap[session.guest_user_id]?.full_name || 'Partner'
      : null,
  })
}

export default withAuth(handler)
