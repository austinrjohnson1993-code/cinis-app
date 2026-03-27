import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'



async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { limit } = req.query

  const safeLimit = Math.min(parseInt(limit) || 30, 100)

  const since = new Date()
  since.setDate(since.getDate() - 30)
  since.setHours(0, 0, 0, 0)

  const supabaseAdmin = getAdminClient()

  const { data: entries, error } = await supabaseAdmin
    .from('journal_entries')
    .select('id, created_at, mood, content')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(safeLimit)

  if (error) {
    console.error('[journal/entries:GET] error:', JSON.stringify(error))
    return res.status(500).json({ error: 'Failed to fetch journal entries' })
  }

  return res.status(200).json({ entries: entries || [] })
}

export default withAuth(handler)
