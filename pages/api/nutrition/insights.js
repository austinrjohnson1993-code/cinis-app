import Anthropic from '@anthropic-ai/sdk'
import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function daysAgoISO(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = getAdminClient()
  const sevenDaysAgo = daysAgoISO(7)
  const today = todayStr()

  // ── Fetch 7-day nutrition_log + supplements in parallel ───────────────────
  const [logRes, suppRes] = await Promise.all([
    supabaseAdmin
      .from('nutrition_log')
      .select('meal_type, calories, protein_g, carbs_g, fat_g, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', sevenDaysAgo)
      .order('logged_at', { ascending: true }),
    supabaseAdmin
      .from('supplements')
      .select('name, last_taken_date')
      .eq('user_id', userId),
  ])

  const entries = logRes.data || []
  const supplements = suppRes.data || []

  // ── Compute stats ─────────────────────────────────────────────────────────
  // Group by date
  const dayMap = {}
  entries.forEach(e => {
    if (e.meal_type === 'water') return
    const d = e.logged_at.slice(0, 10)
    if (!dayMap[d]) dayMap[d] = { meals: 0, calories: 0, protein: 0 }
    dayMap[d].meals += 1
    dayMap[d].calories += e.calories || 0
    dayMap[d].protein += parseFloat(e.protein_g) || 0
  })

  const days = Object.values(dayMap)
  const avg_meals_per_day = days.length
    ? Math.round((days.reduce((s, d) => s + d.meals, 0) / days.length) * 10) / 10
    : 0
  const avg_calories_per_day = days.length
    ? Math.round(days.reduce((s, d) => s + d.calories, 0) / days.length)
    : 0
  const avg_protein_per_day = days.length
    ? Math.round(days.reduce((s, d) => s + d.protein, 0) / days.length)
    : 0

  // Water: count entries with meal_type='water' in last 7 days
  const waterEntries = entries.filter(e => e.meal_type === 'water')
  const avg_water_per_day = days.length
    ? Math.round((waterEntries.length / 7) * 10) / 10
    : 0

  // Supplement adherence: taken today / total supplements
  const supplement_adherence_pct = supplements.length
    ? Math.round((supplements.filter(s => s.last_taken_date === today).length / supplements.length) * 100)
    : 0

  const stats = { avg_meals_per_day, avg_calories_per_day, avg_protein_per_day, avg_water_per_day, supplement_adherence_pct }

  // ── AI insight (Haiku, brief) ─────────────────────────────────────────────
  let insight = null
  if (entries.length > 0) {
    try {
      const prompt = `You are Cinis, a concise nutrition coach. Given 7-day stats:
- Avg meals/day: ${avg_meals_per_day}
- Avg calories/day: ${avg_calories_per_day}
- Avg protein/day: ${avg_protein_per_day}g
- Avg water/day: ${avg_water_per_day} glasses
- Supplement adherence: ${supplement_adherence_pct}%

Write one sharp insight (2-3 sentences max). No fluff. No greetings. Start with a pattern or observation.`

      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      })
      insight = msg.content[0]?.text?.trim() || null
    } catch (e) {
      console.error('[nutrition/insights] AI error:', e.message)
    }
  }

  return res.status(200).json({ stats, insight })
}

export default withAuth(handler)
