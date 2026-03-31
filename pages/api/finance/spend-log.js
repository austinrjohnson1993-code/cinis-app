import withAuth from '../../../lib/authGuard'
import { sanitizeNotes } from '../../../lib/sanitize'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — last 30 spend_log entries ────────────────────────────────────────
  if (req.method === 'GET') {
    const { data: entries, error } = await supabaseAdmin
      .from('spend_log')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('[finance/spend-log:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch spend log' })
    }

    return res.status(200).json({ entries: entries || [] })
  }

  // ── POST — insert new spend_log entry ─────────────────────────────────────
  if (req.method === 'POST') {
    const { amount, description } = req.body

    if (amount === undefined || amount === null) {
      return res.status(400).json({ error: 'amount required' })
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number' })
    }

    const { data: entry, error } = await supabaseAdmin
      .from('spend_log')
      .insert({
        user_id: userId,
        amount: parsedAmount,
        description: description ? sanitizeNotes(description) : null,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[finance/spend-log:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to log spend' })
    }

    return res.status(201).json({ entry })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
