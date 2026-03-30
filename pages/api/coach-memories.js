import withAuth from '../../lib/authGuard'
import { sanitizeNotes } from '../../lib/sanitize'
import getAdminClient from '../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — fetch all coach memories for user ────────────────────────────────
  if (req.method === 'GET') {
    const { data: memories, error } = await supabaseAdmin
      .from('coach_memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[coach-memories:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch coach memories' })
    }

    return res.status(200).json({ memories: memories || [] })
  }

  // ── POST — add new coach memory ────────────────────────────────────────────
  if (req.method === 'POST') {
    const { text, category, source } = req.body

    if (!text) {
      return res.status(400).json({ error: 'text is required' })
    }

    const cleanText = sanitizeNotes(text)
    if (!cleanText) {
      return res.status(400).json({ error: 'Invalid text' })
    }

    const { data: memory, error } = await supabaseAdmin
      .from('coach_memories')
      .insert({
        user_id: userId,
        text: cleanText,
        category: category || 'pattern',
        source: source || 'user_note',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[coach-memories:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to add coach memory' })
    }

    return res.status(200).json({ memory })
  }

  // ── DELETE — remove coach memory by id ──────────────────────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'id is required' })
    }

    // Verify ownership before delete
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('coach_memories')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Coach memory not found' })
    }

    const { error } = await supabaseAdmin
      .from('coach_memories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('[coach-memories:DELETE] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to delete coach memory' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
