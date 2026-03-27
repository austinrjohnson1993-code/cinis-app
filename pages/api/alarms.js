import getAdminClient from '../../lib/supabaseAdmin'
import withAuth from '../../lib/authGuard'

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // GET — fetch all active alarms for user, ordered by alarm_time
  if (req.method === 'GET') {

    const { data: alarms, error } = await supabaseAdmin
      .from('alarms')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('alarm_time', { ascending: true })

    if (error) {
      console.error('[alarms:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch alarms' })
    }

    return res.status(200).json({ alarms })
  }

  // POST { alarm_time, title, task_id } — create alarm
  if (req.method === 'POST') {
    const { alarm_time, title, task_id } = req.body
    if (!alarm_time || !title) {
      return res.status(400).json({ error: 'alarm_time and title required' })
    }

    const { data: alarm, error } = await supabaseAdmin
      .from('alarms')
      .insert({
        user_id: userId,
        alarm_time,
        title,
        task_id: task_id || null,
        active: true,
        triggered: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[alarms:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to create alarm' })
    }

    return res.status(201).json({ alarm })
  }

  // PATCH { id, triggered: true } — mark alarm as triggered
  if (req.method === 'PATCH') {
    const { id, triggered } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    const updates = {}
    if (triggered === true) {
      updates.triggered = true
      updates.active = false
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    const { data: alarm, error } = await supabaseAdmin
      .from('alarms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[alarms:PATCH] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to update alarm' })
    }

    return res.status(200).json({ alarm })
  }

  // DELETE { id } — delete alarm
  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'id required' })

    const { error } = await supabaseAdmin
      .from('alarms')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[alarms:DELETE] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to delete alarm' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
