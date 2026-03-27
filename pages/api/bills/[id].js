import getAdminClient from '../../../lib/supabaseAdmin'
import withAuth from '../../../lib/authGuard'



async function handler(req, res, userId) {
  if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' })

  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Bill ID required' })

  const supabaseAdmin = getAdminClient()

  const { error } = await supabaseAdmin
    .from('bills')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('[bills/delete] error:', JSON.stringify(error))
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({ success: true })
}

export default withAuth(handler)
