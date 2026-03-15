import { createClient } from '@supabase/supabase-js'
import { coachingMessage } from '../../lib/anthropic'
import { buildPersonaPrompt } from '../../lib/persona'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function fmtTask(t) {
  let s = `"${t.title}"`
  if (t.due_time) {
    s += ` (due ${new Date(t.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})`
  }
  if ((t.rollover_count || 0) > 0) s += ` [rolled over ${t.rollover_count}×]`
  return s
}

function fmtList(tasks) {
  if (!tasks.length) return 'none'
  return tasks.map(fmtTask).join(', ')
}

// Pick the highest-priority pending task to name specifically
function topTask(pending) {
  if (!pending.length) return null
  // prefer external or has due_time, then rollover, then first
  return pending.find(t => t.consequence_level === 'external' || t.due_time)
    || pending.find(t => (t.rollover_count || 0) > 0)
    || pending[0]
}

function buildContextPrompt(checkInType, profile, pending, completed, isFirstCheckin) {
  const name = profile.full_name?.split(' ')[0] || 'there'
  const top = topTask(pending)
  const otherPending = pending.filter(t => t !== top).slice(0, 3)
  const rollovers = pending.filter(t => (t.rollover_count || 0) > 0)
  const firstFlag = isFirstCheckin ? '\nThis is their very first check-in. Use the "Alright, first time working together." opener.' : ''

  if (checkInType === 'morning') {
    return `It's morning. User: ${name}.
Top priority task: ${top ? `"${top.title}"${top.due_time ? ` due ${new Date(top.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}${top.consequence_level === 'external' ? ' [external commitment]' : ''}` : 'none'}.
Other tasks today: ${otherPending.length ? otherPending.map(t => `"${t.title}"`).join(', ') : 'none'}.
Rolled over: ${rollovers.length ? `${rollovers.length} task${rollovers.length !== 1 ? 's' : ''} (${rollovers.map(t => `"${t.title}"`).join(', ')})` : 'none'}.${firstFlag}
Write the opening morning check-in. 2-3 sentences max. Name the top task specifically.`
  }

  if (checkInType === 'midday') {
    return `It's midday. User: ${name}.
Completed so far: ${completed.length ? completed.map(t => `"${t.title}"`).join(', ') : 'nothing yet'}.
Still pending: ${pending.length ? pending.map(t => `"${t.title}"${t.due_time ? ` (due ${new Date(t.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : ''}`).join(', ') : 'nothing'}.${firstFlag}
Write the midday check-in. 2 sentences. Acknowledge what's done by name, name what's next.`
  }

  // evening
  return `It's evening. User: ${name}.
Completed today: ${completed.length ? completed.map(t => `"${t.title}"`).join(', ') : 'nothing completed'}.
Rolling to tomorrow: ${pending.length ? pending.map(t => `"${t.title}"`).join(', ') : 'nothing'}.${firstFlag}
Write the evening check-in. 2-3 sentences. One specific win or honest acknowledgment, what rolls over, one closing line.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, checkInType, messages } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const supabaseAdmin = getAdminClient()

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles').select('*').eq('id', userId).single()
  if (profileErr || !profile) return res.status(404).json({ error: 'Profile not found' })

  const systemPrompt = buildPersonaPrompt(profile)

  // Continuing conversation — just pass through with persona
  if (messages && messages.length > 0) {
    try {
      const reply = await coachingMessage(messages, systemPrompt)
      return res.status(200).json({ message: reply })
    } catch (err) {
      console.error('[checkin] continuation error:', err.message)
      return res.status(500).json({ error: 'Failed to get response' })
    }
  }

  // Opening message — fetch tasks and build context
  const { data: tasks = [] } = await supabaseAdmin
    .from('tasks').select('*').eq('user_id', userId).eq('archived', false)

  const pending = (tasks || []).filter(t => !t.completed)
  const completed = (tasks || []).filter(t => t.completed)
  const type = checkInType || 'morning'
  const isFirstCheckin = !profile.last_checkin_at

  const contextPrompt = buildContextPrompt(type, profile, pending, completed, isFirstCheckin)

  // Mark that a check-in has happened so subsequent opens don't use the first-time opener
  if (isFirstCheckin) {
    supabaseAdmin.from('profiles').update({ last_checkin_at: new Date().toISOString() }).eq('id', profile.id)
  }

  try {
    const reply = await coachingMessage(
      [{ role: 'user', content: contextPrompt }],
      systemPrompt
    )
    return res.status(200).json({ message: reply })
  } catch (err) {
    console.error('[checkin] opening error:', err.message)
    return res.status(500).json({ error: 'Failed to generate check-in' })
  }
}
