import { createClient } from '@supabase/supabase-js'
import { buildPersonaPrompt } from '../../../lib/persona'
import { coachingMessage } from '../../../lib/anthropic'
import webpush from 'web-push'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// Configure web-push with VAPID keys
if (process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:hello@cinis.app',
    process.env.NEXT_PUBLIC_VAPID_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

function fmtTask(t) {
  let s = `"${t.title}"`
  if ((t.rollover_count || 0) > 0) s += ` [rolled ${t.rollover_count}×]`
  if (t.due_time) s += ` [due ${new Date(t.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}]`
  if (t.consequence_level === 'external') s += ' [external]'
  return s
}

// Returns true if the user's saved time preference falls within ±windowMinutes of targetHour (UTC)
function isInTimeWindow(timeStr, targetHour, windowMinutes = 60) {
  if (!timeStr) return true // no preference set — always process
  const [h] = String(timeStr).split(':').map(Number)
  if (isNaN(h)) return true
  const diffHours = Math.abs(h - targetHour)
  const diffMin = Math.min(diffHours, 24 - diffHours) * 60
  return diffMin <= windowMinutes
}

// Called daily at 12PM UTC by Vercel cron (see vercel.json)
// Only fires for users with midday check-ins enabled (midday in checkin_times array)
export default async function handler(req, res) {
  const supabaseAdmin = getAdminClient()
  const currentUtcHour = new Date().getUTCHours()

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .contains('checkin_times', ['midday'])

  if (!profiles || profiles.length === 0) {
    return res.status(200).json({ success: true, pregenerated: 0 })
  }

  // Filter to users whose midday_time preference is near the current UTC hour (or unset)
  const activeProfiles = profiles.filter(p => isInTimeWindow(p.midday_time, currentUtcHour))

  if (activeProfiles.length === 0) {
    return res.status(200).json({ success: true, pregenerated: 0 })
  }

  let pregenerated = 0

  await Promise.allSettled(activeProfiles.map(async (profile) => {
    try {
      const { data: tasks = [] } = await supabaseAdmin
        .from('tasks').select('*').eq('user_id', profile.id).eq('archived', false)

      const pending = (tasks || []).filter(t => !t.completed)
      const completed = (tasks || []).filter(t => t.completed)
      const name = profile.full_name?.split(' ')[0] || 'there'

      const doneNote = completed.length > 0
        ? `Already done: ${completed.map(fmtTask).join(', ')}.`
        : 'Nothing completed yet.'

      const pendingNote = pending.length > 0
        ? `Still on the list: ${pending.map(fmtTask).join(', ')}.`
        : 'Nothing left pending — great job.'

      const contextPrompt = `It's midday. ${name} is checking in on how the day is going. ${doneNote} ${pendingNote} Write a brief midday check-in. Acknowledge progress so far. Focus on what matters most for the rest of the day. 2-3 sentences. Keep it grounded and practical.`

      const systemPrompt = buildPersonaPrompt(profile)
      const message = await coachingMessage(
        [{ role: 'user', content: contextPrompt }],
        systemPrompt
      )

      await supabaseAdmin.from('profiles').update({
        last_checkin_message: message,
        last_checkin_at: new Date().toISOString()
      }).eq('id', profile.id)

      // Send push notification if user has enabled it
      if (profile.push_notifications_enabled && profile.push_subscription) {
        try {
          await webpush.sendNotification(
            profile.push_subscription,
            JSON.stringify({
              title: 'Midday check-in, ' + name,
              body: message,
              url: '/dashboard'
            })
          )
          console.log(`[midday-checkin] Push sent to ${name}`)
        } catch (pushErr) {
          console.error(`[midday-checkin] Push failed for ${profile.id}:`, pushErr.message)
        }
      }

      pregenerated++
      console.log(`[midday-checkin] Pre-generated for ${name}`)
    } catch (err) {
      console.error(`[midday-checkin] Pre-gen failed for ${profile.id}:`, err.message)
    }
  }))

  return res.status(200).json({ success: true, pregenerated })
}
