import withAuth from '../../../lib/authGuard'
import { sanitizeNotes } from '../../../lib/sanitize'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — last 30 weight entries ───────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: entries, error } = await supabaseAdmin
      .from('weight_log')
      .select('*')
      .eq('user_id', userId)
      .order('logged_date', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[nutrition/weight:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch weight log' })
    }

    return res.status(200).json({ entries: entries || [] })
  }

  // ── POST — add new weight entry ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { weight_lbs, unit_entered, logged_date, note } = req.body

    if (weight_lbs === undefined || weight_lbs === null) {
      return res.status(400).json({ error: 'weight_lbs is required' })
    }

    let finalWeight = parseFloat(weight_lbs)

    // Convert from kg to lbs if needed
    if (unit_entered === 'kg') {
      finalWeight = finalWeight * 2.20462
    }

    if (isNaN(finalWeight) || finalWeight <= 0) {
      return res.status(400).json({ error: 'weight_lbs must be a positive number' })
    }

    const { data: entry, error } = await supabaseAdmin
      .from('weight_log')
      .insert({
        user_id: userId,
        weight_lbs: finalWeight,
        unit_entered: unit_entered || 'lbs',
        logged_date: logged_date || new Date().toISOString().split('T')[0],
        note: note ? sanitizeNotes(note) : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[nutrition/weight:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to add weight entry' })
    }

    return res.status(200).json({ entry })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
