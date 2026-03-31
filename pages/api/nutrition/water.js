import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()
  const timezone = req.query.timezone || 'America/Chicago'
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  const dayStart = new Date(`${todayStr}T00:00:00`)
  const dayEnd = new Date(`${todayStr}T23:59:59`)

  // ── GET — count of water entries today ────────────────────────────────────
  if (req.method === 'GET') {
    const { data: entries, error } = await supabaseAdmin
      .from('nutrition_log')
      .select('id, logged_at')
      .eq('user_id', userId)
      .eq('meal_type', 'water')
      .gte('logged_at', dayStart.toISOString())
      .lte('logged_at', dayEnd.toISOString())
      .order('logged_at', { ascending: true })

    if (error) {
      console.error('[nutrition/water:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch water count' })
    }

    return res.status(200).json({ count: (entries || []).length, entries: entries || [] })
  }

  // ── POST — log one glass of water ─────────────────────────────────────────
  if (req.method === 'POST') {
    const { data: entry, error } = await supabaseAdmin
      .from('nutrition_log')
      .insert({
        user_id:   userId,
        meal_name: 'Water',
        meal_type: 'water',
        calories:  0,
        protein_g: 0,
        carbs_g:   0,
        fat_g:     0,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[nutrition/water:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to log water' })
    }

    return res.status(200).json({ entry })
  }

  // ── DELETE — remove last water entry today ────────────────────────────────
  if (req.method === 'DELETE') {
    const { data: latest, error: fetchErr } = await supabaseAdmin
      .from('nutrition_log')
      .select('id')
      .eq('user_id', userId)
      .eq('meal_type', 'water')
      .gte('logged_at', dayStart.toISOString())
      .lte('logged_at', dayEnd.toISOString())
      .order('logged_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchErr || !latest) {
      return res.status(404).json({ error: 'No water entry to remove' })
    }

    const { error: deleteErr } = await supabaseAdmin
      .from('nutrition_log')
      .delete()
      .eq('id', latest.id)
      .eq('user_id', userId)

    if (deleteErr) {
      console.error('[nutrition/water:DELETE] error:', JSON.stringify(deleteErr))
      return res.status(500).json({ error: 'Failed to remove water entry' })
    }

    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
