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
    const { name, dose, form, timing_groups, frequency, frequency_days, preferred_time, note } = req.body

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
        frequency_days: frequency_days || null,
        preferred_time: preferred_time || null,
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

  // ── PATCH — mark supplement taken today ──────────────────────────────────
  if (req.method === 'PATCH') {
    const { id, taken } = req.body
    if (!id) return res.status(400).json({ error: 'id is required' })

    const last_taken_date = taken
      ? new Date().toISOString().split('T')[0]
      : null

    const { data: supplement, error } = await supabaseAdmin
      .from('supplements')
      .update({ last_taken_date })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[nutrition/supplements:PATCH] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to update supplement' })
    }

    return res.status(200).json({ supplement })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
