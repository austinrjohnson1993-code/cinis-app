import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'
import { getLocalDateString, resolveTimezone } from '../../../lib/dateUtils'



async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── GET — today's completions for the user ────────────────────────────────
  if (req.method === 'GET') {
    const timezone = resolveTimezone(req.query.timezone)
    const todayStr = getLocalDateString(new Date(), timezone)
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`).toISOString()
    const dayEnd   = new Date(`${todayStr}T23:59:59.999Z`).toISOString()

    const { data: completions, error } = await supabaseAdmin
      .from('habit_completions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)

    if (error) {
      console.error('[habits/complete:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch completions' })
    }

    return res.status(200).json({ completions: completions || [] })
  }

  // ── POST — toggle habit completion for a given date ───────────────────────
  if (req.method === 'POST') {
    const { habitId, date, timezone: bodyTz } = req.body
    if (!habitId) return res.status(400).json({ error: 'habitId required' })

    const timezone = resolveTimezone(bodyTz || req.query.timezone)
    const targetDate = date || getLocalDateString(new Date(), timezone)
    const dayStart = new Date(`${targetDate}T00:00:00.000Z`).toISOString()
    const dayEnd   = new Date(`${targetDate}T23:59:59.999Z`).toISOString()

    // Check for existing completion on this date
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('habit_completions')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .limit(1)

    if (fetchErr) {
      console.error('[habits/complete:POST] fetch error:', JSON.stringify(fetchErr))
      return res.status(500).json({ error: 'Failed to check completion' })
    }

    if (existing && existing.length > 0) {
      // Toggle off — remove existing completion
      const { error: deleteErr } = await supabaseAdmin
        .from('habit_completions')
        .delete()
        .eq('id', existing[0].id)

      if (deleteErr) {
        console.error('[habits/complete:POST] delete error:', JSON.stringify(deleteErr))
        return res.status(500).json({ error: 'Failed to remove completion' })
      }

      return res.status(200).json({ completed: false })
    } else {
      // Toggle on — insert completion at noon UTC of the target date.
      // BUG-06: habit_completions.completed_on has a DB default of CURRENT_DATE
      // (Postgres server UTC). If we don't set it explicitly, late-night local
      // completions land on the wrong day. Always pass targetDate.
      const { data: completion, error: insertErr } = await supabaseAdmin
        .from('habit_completions')
        .insert({
          habit_id:     habitId,
          user_id:      userId,
          completed_at: new Date(`${targetDate}T12:00:00.000Z`).toISOString(),
          completed_on: targetDate,
        })
        .select()
        .single()

      if (insertErr) {
        console.error('[habits/complete:POST] insert error:', JSON.stringify(insertErr))
        return res.status(500).json({ error: 'Failed to save completion' })
      }

      return res.status(201).json({ completed: true, completion })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
