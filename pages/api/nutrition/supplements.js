import withAuth from '../../../lib/authGuard'
import { sanitizeTitle, sanitizeNotes } from '../../../lib/sanitize'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — all supplements for user ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: supplements, error } = await supabaseAdmin
      .from('supplements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[nutrition/supplements:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch supplements' })
    }

    return res.status(200).json({ supplements: supplements || [] })
  }

  // ── POST — add new supplement ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, dose, form, timing_groups, frequency, frequency_days, note } = req.body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    const cleanName = sanitizeTitle(name)
    if (!cleanName) {
      return res.status(400).json({ error: 'Invalid name' })
    }

    const { data: supplement, error } = await supabaseAdmin
      .from('supplements')
      .insert({
        user_id: userId,
        name: cleanName,
        dose: dose ? sanitizeTitle(dose) : null,
        form: form ? sanitizeTitle(form) : null,
        timing_groups: timing_groups || null,
        frequency: frequency || null,
        frequency_days: frequency_days ? parseInt(frequency_days) : null,
        note: note ? sanitizeNotes(note) : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[nutrition/supplements:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to add supplement' })
    }

    return res.status(200).json({ supplement })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
