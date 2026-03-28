import withAuth from '../../lib/authGuard'
import getAdminClient from '../../lib/supabaseAdmin'
import { sanitizeNotes } from '../../lib/sanitize'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── POST — store user feedback ─────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { message } = req.body

      // Validate required field
      if (!message) {
        return res.status(400).json({ error: 'message is required' })
      }

      // Sanitize message
      const sanitizedMessage = sanitizeNotes(message)

      // Insert feedback
      const { data, error } = await supabaseAdmin
        .from('feedback')
        .insert([{
          user_id: userId,
          message: sanitizedMessage,
          created_at: new Date().toISOString()
        }])
        .select()

      // Graceful fail if table doesn't exist or other error occurs
      if (error) {
        console.error('[feedback:POST] insert error:', JSON.stringify(error))
        // Still return success to not break client flow
        return res.status(200).json({ success: true })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('[feedback:POST] error:', err.message)
      // Graceful fail — return success even on error
      return res.status(200).json({ success: true })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
