import withAuth from '../../../lib/authGuard'
import { sanitizeTitle, sanitizeNotes } from '../../../lib/sanitize'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — all meal templates, ordered by log_count ────────────────────────
  if (req.method === 'GET') {
    const { data: meals, error } = await supabaseAdmin
      .from('meal_templates')
      .select('*')
      .eq('user_id', userId)
      .order('log_count', { ascending: false })

    if (error) {
      console.error('[nutrition/meals:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch meal templates' })
    }

    return res.status(200).json({ meals: meals || [] })
  }

  // ── POST — add new meal template ───────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, description, calories, protein_g, carbs_g, fat_g } = req.body

    if (!name) {
      return res.status(400).json({ error: 'name is required' })
    }

    const cleanName = sanitizeTitle(name)
    if (!cleanName) {
      return res.status(400).json({ error: 'Invalid name' })
    }

    const { data: meal, error } = await supabaseAdmin
      .from('meal_templates')
      .insert({
        user_id: userId,
        name: cleanName,
        description: description ? sanitizeNotes(description) : null,
        calories: calories ? parseInt(calories) : 0,
        protein_g: protein_g ? parseFloat(protein_g) : 0,
        carbs_g: carbs_g ? parseFloat(carbs_g) : 0,
        fat_g: fat_g ? parseFloat(fat_g) : 0,
        log_count: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[nutrition/meals:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to add meal template' })
    }

    return res.status(200).json({ meal })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
