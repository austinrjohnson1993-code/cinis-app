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

function buildContextPrompt(checkInType, profile, pending, completed) {
  const name = profile.full_name?.split(' ')[0] || 'there'
  const rollovers = pending.filter(t => (t.rollover_count || 0) > 0)

  if (checkInType === 'morning') {
    const rolloverNote = rollovers.length > 0
      ? ` Note: ${rollovers.length} task${rollovers.length !== 1 ? 's have' : ' has'} rolled over from earlier: ${fmtList(rollovers)}.`
      : ''
    return `It's morning. ${name} has ${pending.length} task${pending.length !== 1 ? 's' : ''} on their list: ${fmtList(pending)}.${rolloverNote} Start with a brief personal greeting using their name. Ask how they're feeling and what's on their mind. Then gently surface the top 1–2 priority tasks. Keep it under 3 sentences. Sound human, not like a notification.`
  }

  if (checkInType === 'midday') {
    const nothingDone = completed.length === 0
      ? `They haven't completed anything yet — be gentle but direct per your persona.`
      : `Acknowledge what they've knocked out.`
    return `It's midday. ${name} has completed ${completed.length} task${completed.length !== 1 ? 's' : ''}: ${fmtList(completed)}. Still pending: ${fmtList(pending)}. ${nothingDone} Surface what's most important for the afternoon. Keep it under 3 sentences.`
  }

  // evening
  const rolloverNote = rollovers.length > 0
    ? ` ${rollovers.length} task${rollovers.length !== 1 ? 's have' : ' has'} been rolling over — note that gently.`
    : ''
  return `It's evening. The day is wrapping up for ${name}. Completed: ${fmtList(completed)}. Still pending (will roll to tomorrow): ${fmtList(pending)}.${rolloverNote} Lead with wins first, always — even on a hard day. Close with something brief that makes them feel good about showing up tomorrow. Keep it under 4 sentences.`
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

  const contextPrompt = buildContextPrompt(type, profile, pending, completed)

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
