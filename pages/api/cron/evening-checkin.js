import { createClient } from '@supabase/supabase-js'
import { runRollover } from '../rollover-tasks'
import { runBillsToTasks } from '../bills-to-tasks'
import { runProgressSnapshot } from '../progress-snapshot'
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

// Called nightly at 8PM UTC by Vercel cron (see vercel.json)
export default async function handler(req, res) {
  const supabaseAdmin = getAdminClient()
  const currentUtcHour = new Date().getUTCHours()

  // 1. Run nightly rollover
  let rolloverResult = { rolled: 0, tasks: [] }
  try {
    rolloverResult = await runRollover()
  } catch (err) {
    console.error('[evening-checkin] Rollover error:', err.message)
  }

  // 2. Pre-generate evening check-in message for users who have evening check-ins enabled
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .contains('checkin_times', ['evening'])

  if (!profiles || profiles.length === 0) {
    return res.status(200).json({ success: true, rolled: rolloverResult.rolled, pregenerated: 0 })
  }

  // Filter to users whose evening_time preference is near the current UTC hour (or unset)
  const activeProfiles = profiles.filter(p => isInTimeWindow(p.evening_time, currentUtcHour))

  let pregenerated = 0

  await Promise.allSettled(activeProfiles.map(async (profile) => {
    try {
      const { data: tasks = [] } = await supabaseAdmin
        .from('tasks').select('*').eq('user_id', profile.id).eq('archived', false)

      const pending = (tasks || []).filter(t => !t.completed)
      const completed = (tasks || []).filter(t => t.completed)
      const rollovers = pending.filter(t => (t.rollover_count || 0) > 0)
      const name = profile.full_name?.split(' ')[0] || 'there'

      const rolloverNote = rollovers.length > 0
        ? ` ${rollovers.length} task${rollovers.length !== 1 ? 's have' : ' has'} been rolling over.`
        : ''
      const contextPrompt = `It's evening. The day is wrapping up for ${name}. Completed: ${completed.length > 0 ? completed.map(fmtTask).join(', ') : 'none'}. Still pending (will roll to tomorrow): ${pending.length > 0 ? pending.map(fmtTask).join(', ') : 'none'}.${rolloverNote} Lead with wins first, always. Close with something that makes them feel good about showing up tomorrow. Under 4 sentences.`

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
              title: 'Evening check-in, ' + name,
              body: message,
              url: '/dashboard'
            })
          )
        } catch (pushErr) {
          console.error(`[evening-checkin] Push failed for ${profile.id}:`, pushErr.message)
        }
      }

      pregenerated++

      // 3. Create bill tasks due today or tomorrow
      try {
        const billResult = await runBillsToTasks(profile.id)
        if (billResult.created > 0) {
        }
      } catch (billErr) {
        console.error(`[evening-checkin] Bill tasks failed for ${profile.id}:`, billErr.message)
      }

      // 4. Save today's progress snapshot before the day ends
      try {
        await runProgressSnapshot(profile.id)
      } catch (snapErr) {
        console.error(`[evening-checkin] Progress snapshot failed for ${profile.id}:`, snapErr.message)
      }
    } catch (err) {
      console.error(`[evening-checkin] Pre-gen failed for ${profile.id}:`, err.message)
    }
  }))

  return res.status(200).json({ success: true, rolled: rolloverResult.rolled, pregenerated })
}
