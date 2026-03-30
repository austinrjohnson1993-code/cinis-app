import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { q } = req.query
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' })
  }

  const supabaseAdmin = getAdminClient()
  const term = `%${q.trim()}%`

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .or(`full_name.ilike.${term},email.ilike.${term}`)
    .neq('id', userId)
    .limit(5)

  if (error) {
    console.error('[co-session/search-users]', error)
    return res.status(500).json({ error: 'Search failed' })
  }

  return res.status(200).json(data || [])
}

export default withAuth(handler)
