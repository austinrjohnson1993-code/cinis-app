import withAuth from '../../lib/authGuard'
import getAdminClient from '../../lib/supabaseAdmin'



async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // GET — fetch habits + last 7 days completions
  if (req.method === 'GET') {

    const since = new Date()
    since.setDate(since.getDate() - 7)
    since.setHours(0, 0, 0, 0)

    const [habitsRes, completionsRes] = await Promise.all([
      supabaseAdmin
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('created_at', { ascending: true }),
      supabaseAdmin
        .from('habit_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', since.toISOString()),
    ])

    if (habitsRes.error) {
      console.error('[habits:GET] habits error:', JSON.stringify(habitsRes.error))
      return res.status(500).json({ error: 'Failed to fetch habits' })
    }

    return res.status(200).json({
      habits: habitsRes.data || [],
      completions: completionsRes.data || [],
    })
  }

  // POST { name, habit_type?, description?, frequency? } — create habit
  if (req.method === 'POST') {
    const { name, habit_type, description, frequency } = req.body
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' })

    const { data: habit, error } = await supabaseAdmin
      .from('habits')
      .insert({
        user_id: userId,
        name: name.trim(),
        habit_type: habit_type || 'build',
        description: description || null,
        frequency: frequency || 'daily',
        archived: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[habits:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to create habit' })
    }

    return res.status(201).json({ habit })
  }

  // DELETE ?habitId=xxx — archive habit
  if (req.method === 'DELETE') {
    const { habitId } = req.query
    if (!habitId) return res.status(400).json({ error: 'habitId required' })

    const { error } = await supabaseAdmin
      .from('habits')
      .update({ archived: true })
      .eq('id', habitId)
      .eq('user_id', userId)

    if (error) {
      console.error('[habits:DELETE] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to archive habit' })
    }

    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
