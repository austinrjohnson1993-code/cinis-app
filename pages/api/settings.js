import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const ALLOWED_FIELDS = ['full_name', 'accent_color', 'persona_blend', 'persona_voice', 'checkin_times']

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, updates } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  if (!updates || typeof updates !== 'object') return res.status(400).json({ error: 'updates object required' })

  const safeUpdates = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in updates) safeUpdates[key] = updates[key]
  }

  if (Object.keys(safeUpdates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const supabaseAdmin = getAdminClient()

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('[settings] Failed to update profile:', JSON.stringify(error))
    return res.status(500).json({ error: 'Failed to update profile' })
  }

  console.log('[settings] Updated profile for', userId, '— fields:', Object.keys(safeUpdates).join(', '))
  return res.status(200).json({ success: true, profile })
}
