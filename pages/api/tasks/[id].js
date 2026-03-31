import withAuth from '../../../lib/authGuard'
import { sanitizeTitle, sanitizeNotes } from '../../../lib/sanitize'
import getAdminClient from '../../../lib/supabaseAdmin'



const VALID_TASK_TYPES = ['task', 'bill', 'appointment', 'chore']

async function handler(req, res, userId) {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Task ID is required' })

  const supabaseAdmin = getAdminClient()

  // ── PATCH — update task ─────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const {
      completed,
      starred,
      sort_order,
      archived,
      title,
      notes,
      scheduled_for,
      task_type,
      estimated_minutes
    } = req.body
    const update = {}

    // Validate and collect fields
    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({ error: 'completed must be a boolean' })
      }
      update.completed = completed
      if (completed) {
        update.completed_at = new Date().toISOString()
      } else {
        update.completed_at = null
      }
    }

    if (starred !== undefined) {
      if (typeof starred !== 'boolean') {
        return res.status(400).json({ error: 'starred must be a boolean' })
      }
      update.starred = starred
    }

    if (sort_order !== undefined) {
      const order = parseInt(sort_order, 10)
      if (!Number.isInteger(order)) {
        return res.status(400).json({ error: 'sort_order must be an integer' })
      }
      update.sort_order = order
    }

    if (archived !== undefined) {
      if (typeof archived !== 'boolean') {
        return res.status(400).json({ error: 'archived must be a boolean' })
      }
      update.archived = archived
    }

    if (title !== undefined) {
      const sanitized = sanitizeTitle(title)
      if (!sanitized) {
        return res.status(400).json({ error: 'title cannot be empty' })
      }
      update.title = sanitized
    }

    if (notes !== undefined) {
      update.notes = sanitizeNotes(notes)
    }

    if (scheduled_for !== undefined) {
      update.scheduled_for = scheduled_for
    }

    if (task_type !== undefined) {
      const sanitized = sanitizeTitle(task_type)
      if (!VALID_TASK_TYPES.includes(sanitized)) {
        return res.status(400).json({ error: `task_type must be one of: ${VALID_TASK_TYPES.join(', ')}` })
      }
      update.task_type = sanitized
    }

    if (estimated_minutes !== undefined) {
      const mins = parseInt(estimated_minutes, 10)
      if (!Number.isInteger(mins) || mins <= 0) {
        return res.status(400).json({ error: 'estimated_minutes must be a positive integer' })
      }
      update.estimated_minutes = mins
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    try {
      // Verify task belongs to this user before updating
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Task not found' })
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('tasks')
        .update(update)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update task' })
      }

      return res.status(200).json({ success: true, task: updated })
    } catch (err) {
      console.error(`[tasks/${id}] PATCH error:`, err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // ── DELETE — delete task ────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      // Verify task belongs to this user before deleting
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .eq('id', id)
        .eq('user_id', userId)
        .single()

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Task not found' })
      }

      const { error: deleteError } = await supabaseAdmin
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)

      if (deleteError) {
        return res.status(500).json({ error: 'Failed to delete task' })
      }

      return res.status(200).json({ success: true })
    } catch (err) {
      console.error(`[tasks/${id}] DELETE error:`, err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
