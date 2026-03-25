import { createClient } from '@supabase/supabase-js'
import withAuth from '../../../lib/authGuard'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const VALID_OUTCOMES = ['nailed_it', 'made_progress', 'got_stuck']

async function handler(req, res, userId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { duration, outcome } = req.body

  if (!duration || typeof duration !== 'number' || duration <= 0) {
    return res.status(400).json({ error: 'duration (positive number in minutes) required' })
  }
  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return res.status(400).json({ error: `outcome must be one of: ${VALID_OUTCOMES.join(', ')}` })
  }

  const supabaseAdmin = getAdminClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch existing snapshot for today (if any)
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from('progress_snapshots')
    .select('focus_minutes')
    .eq('user_id', userId)
    .eq('snapshot_date', today)
    .limit(1)
    .single()

  if (fetchErr && fetchErr.code !== 'PGRST116') {
    // PGRST116 = no rows — that's fine, anything else is an error
    console.error('[focus/complete] fetch error:', JSON.stringify(fetchErr))
    return res.status(500).json({ error: 'Failed to fetch snapshot' })
  }

  const currentMinutes = existing?.focus_minutes || 0
  const newMinutes = currentMinutes + Math.round(duration)

  const { error: upsertErr } = await supabaseAdmin
    .from('progress_snapshots')
    .upsert({
      user_id: userId,
      snapshot_date: today,
      focus_minutes: newMinutes,
    }, { onConflict: 'user_id,snapshot_date' })

  if (upsertErr) {
    console.error('[focus/complete] upsert error:', JSON.stringify(upsertErr))
    return res.status(500).json({ error: 'Failed to save focus session' })
  }

  return res.status(200).json({ success: true, focus_minutes: newMinutes })
}

export default withAuth(handler)
