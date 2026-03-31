import withAuth from '../../lib/authGuard'
import getAdminClient from '../../lib/supabaseAdmin'
import { sanitizeTitle, sanitizeNotes } from '../../lib/sanitize'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — fetch all tasks for authenticated user ───────────────────────────
  if (req.method === 'GET') {
    try {
      const { data: tasks, error } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[tasks:GET] error:', JSON.stringify(error))
        return res.status(500).json({ error: 'Failed to fetch tasks' })
      }

      return res.status(200).json({ tasks: tasks || [] })
    } catch (err) {
      console.error('[tasks:GET] error:', err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── POST — create a single task ────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const {
        title,
        scheduled_for,
        due_time,
        task_type = 'task',
        recurrence = 'none',
        recurrence_days,
        estimated_minutes,
        reminder,
        notes,
        starred = false
      } = req.body

      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: 'title is required' })
      }

      // Sanitize input
      const sanitizedTitle = sanitizeTitle(title)
      const sanitizedNotes = sanitizeNotes(notes || '')

      // Build task object
      const taskData = {
        user_id: userId,
        title: sanitizedTitle,
        completed: false,
        archived: false,
        starred: starred || false,
        task_type,
        recurrence,
        recurrence_days: recurrence_days || null,
        estimated_minutes: estimated_minutes || null,
        reminder: reminder || null,
        notes: sanitizedNotes || null
      }

      // Add optional date/time fields if provided
      if (scheduled_for) taskData.scheduled_for = scheduled_for
      if (due_time) taskData.due_time = due_time

      // Insert task
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('[tasks:POST] insert error:', JSON.stringify(error))
        return res.status(500).json({ error: 'Failed to create task' })
      }

      return res.status(201).json({ task: data })
    } catch (err) {
      console.error('[tasks:POST] error:', err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
