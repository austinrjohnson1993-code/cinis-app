import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const timezone = req.query.timezone || 'America/Chicago'
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  const dayStart = new Date(`${todayStr}T00:00:00`)
  const dayEnd = new Date(`${todayStr}T23:59:59`)

  const { data: entries, error } = await supabaseAdmin
    .from('nutrition_log')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', dayStart.toISOString())
    .lte('logged_at', dayEnd.toISOString())
    .order('logged_at', { ascending: true })

  if (error) {
    console.error('[nutrition/today:GET] error:', JSON.stringify(error))
    return res.status(500).json({ error: 'Failed to fetch today\'s meals' })
  }

  const list = entries || []

  const totals = list.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein_g: acc.protein_g + parseFloat(e.protein_g || 0),
      carbs_g: acc.carbs_g + parseFloat(e.carbs_g || 0),
      fat_g: acc.fat_g + parseFloat(e.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  )

  // Round to 1 decimal for macros
  totals.protein_g = Math.round(totals.protein_g * 10) / 10
  totals.carbs_g = Math.round(totals.carbs_g * 10) / 10
  totals.fat_g = Math.round(totals.fat_g * 10) / 10

  return res.status(200).json({ entries: list, totals })
}

export default withAuth(handler)
