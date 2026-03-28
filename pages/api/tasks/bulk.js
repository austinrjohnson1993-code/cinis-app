import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'
import { sanitizeTitle } from '../../../lib/sanitize'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── POST — bulk create multiple tasks ──────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { lines, default_date } = req.body

      // Validate required fields
      if (!Array.isArray(lines)) {
        return res.status(400).json({ error: 'lines must be an array' })
      }

      if (!default_date) {
        return res.status(400).json({ error: 'default_date is required' })
      }

      // Filter out empty lines and create task objects
      const tasks = lines
        .filter(line => line && typeof line === 'string' && line.trim().length > 0)
        .map(line => ({
          user_id: userId,
          title: sanitizeTitle(line),
          scheduled_for: default_date,
          completed: false,
          archived: false,
          task_type: 'task',
          recurrence: 'none',
          recurrence_days: null,
          estimated_minutes: null,
          reminder: null,
          notes: null
        }))

      if (tasks.length === 0) {
        return res.status(400).json({ error: 'No valid task titles provided' })
      }

      // Bulk insert tasks
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert(tasks)
        .select()

      if (error) {
        console.error('[tasks/bulk:POST] insert error:', JSON.stringify(error))
        return res.status(500).json({ error: 'Failed to create tasks' })
      }

      return res.status(201).json({
        created: data.length,
        tasks: data
      })
    } catch (err) {
      console.error('[tasks/bulk:POST] error:', err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
