import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { duration_minutes = 25, host_task = '' } = req.body
  const supabaseAdmin = getAdminClient()

  // Generate unique session code
  let session_code = null
  let attempts = 0
  while (!session_code && attempts < 10) {
    const candidate = generateCode()
    const { data: existing } = await supabaseAdmin
      .from('co_sessions')
      .select('id')
      .eq('session_code', candidate)
      .single()
    if (!existing) session_code = candidate
    attempts++
  }

  if (!session_code) {
    return res.status(500).json({ error: 'Could not generate unique session code' })
  }

  const { data: session, error } = await supabaseAdmin
    .from('co_sessions')
    .insert({
      host_user_id: userId,
      session_code,
      duration_minutes: parseInt(duration_minutes) || 25,
      host_task: host_task || null,
      status: 'waiting',
    })
    .select()
    .single()

  if (error) {
    console.error('[co-session/create]', error)
    return res.status(500).json({ error: 'Failed to create session' })
  }

  return res.status(200).json({
    session_id: session.id,
    session_code: session.session_code,
    join_url: `https://cinis.app/join/${session.session_code}`,
  })
}

export default withAuth(handler)
