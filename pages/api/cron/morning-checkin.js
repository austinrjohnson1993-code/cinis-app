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

function topTask(pending) {
  return pending.find(t => t.consequence_level === 'external' || t.due_time)
    || pending.find(t => (t.rollover_count || 0) > 0)
    || pending[0]
    || null
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

// Called daily at 8AM UTC by Vercel cron (see vercel.json)
export default async function handler(req, res) {
  const supabaseAdmin = getAdminClient()
  const currentUtcHour = new Date().getUTCHours()

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .contains('checkin_times', ['morning'])

  if (!profiles || profiles.length === 0) {
    return res.status(200).json({ success: true, pregenerated: 0 })
  }

  // Filter to users whose morning_time preference is near the current UTC hour (or unset)
  const activeProfiles = profiles.filter(p => isInTimeWindow(p.morning_time, currentUtcHour))

  if (activeProfiles.length === 0) {
    return res.status(200).json({ success: true, pregenerated: 0 })
  }

  let pregenerated = 0

  await Promise.allSettled(activeProfiles.map(async (profile) => {
    try {
      const { data: tasks = [] } = await supabaseAdmin
        .from('tasks').select('*').eq('user_id', profile.id).eq('archived', false)

      const pending = (tasks || []).filter(t => !t.completed)
      const name = profile.full_name?.split(' ')[0] || 'there'
      const top = topTask(pending)

      const topLine = top
        ? `Top priority: ${fmtTask(top)}.`
        : 'No pending tasks today.'

      const allPendingLine = pending.length > 1
        ? `Also pending: ${pending.filter(t => t !== top).map(fmtTask).join(', ')}.`
        : ''

      const contextPrompt = `It's morning. ${name} is starting their day. ${topLine} ${allPendingLine} Write the morning check-in. 2-3 sentences max. Name the top task specifically. Be direct and energizing.`

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
              title: 'Good morning, ' + name,
              body: message,
              url: '/dashboard'
            })
          )
        } catch (pushErr) {
          console.error(`[morning-checkin] Push failed for ${profile.id}:`, pushErr.message)
        }
      }

      pregenerated++
    } catch (err) {
      console.error(`[morning-checkin] Pre-gen failed for ${profile.id}:`, err.message)
    }
  }))

  return res.status(200).json({ success: true, pregenerated })
}
