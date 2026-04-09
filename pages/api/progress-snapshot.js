import withAuth from '../../lib/authGuard'
import getAdminClient from '../../lib/supabaseAdmin'

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 1 bounded-CRON strategy (see S41_HANDOFF.md)
// ─────────────────────────────────────────────────────────────────────────────
// The CRON that drives progress_snapshots runs ONCE per day at 04:00 UTC (see
// vercel.json). On day N at 04:00 UTC we aggregate the UTC calendar day that
// just ended — day N-1 — and write one snapshot row per user with
// snapshot_date = N-1 (UTC).
//
// Why a single global run instead of per-user local midnight:
//   • profiles.timezone does not exist yet — we have no way to know each
//     user's local day cutoff server-side. Reality check on 2026-04-09 showed
//     the column missing entirely.
//   • A single deterministic cutoff is strictly better than the pre-sprint
//     behaviour ("gte todayStart UTC" run at 00:00 UTC, which queried the
//     future and produced ~empty snapshots for every user).
//   • 04:00 UTC is late enough that even US Pacific (~8pm PT) has finished
//     its own calendar day UTC-wise and any writes in flight have landed,
//     and early enough that Europe hasn't started the next day of work yet.
//
// Known limitation: for users west of UTC, the UTC-day window shifts their
// local "evening" forward into the next snapshot. A 10pm CT task completion
// on Monday lands in Tuesday's UTC window and therefore Tuesday's snapshot.
// This is stable, documented, and identical for every western user.
//
// ⚠ SPRINT 2 TODO — replace with true per-user local-midnight snapshots:
//   1. Add profiles.timezone column (TEXT, default 'America/Chicago')
//   2. Populate on signup from client-detected IANA tz
//   3. Replace the single-run CRON with an hourly sweep that processes users
//      whose local day just ended in the last hour
//   4. Use getLocalDayBounds(userTz) from lib/dateUtils.js to build the
//      window instead of UTC midnights
// ─────────────────────────────────────────────────────────────────────────────

export async function runProgressSnapshot(userId) {
  const supabaseAdmin = getAdminClient()

  // Window = the UTC calendar day that just ended (i.e. yesterday UTC).
  // At 04:00 UTC on day N this means [N-1 00:00 UTC, N 00:00 UTC).
  const windowEnd = new Date()
  windowEnd.setUTCHours(0, 0, 0, 0) // today 00:00 UTC
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000) // yesterday 00:00 UTC
  const windowStartISO = windowStart.toISOString()
  const windowEndISO = windowEnd.toISOString()

  // snapshot_date = the UTC date of the day we're aggregating (yesterday).
  // Derive from Y/M/D directly — the "slice ISO at T" shortcut is forbidden
  // by preflight rule 1 (see lib/dateUtils.js for the approved helper).
  const y = windowStart.getUTCFullYear()
  const m = String(windowStart.getUTCMonth() + 1).padStart(2, '0')
  const d = String(windowStart.getUTCDate()).padStart(2, '0')
  const snapshotDate = `${y}-${m}-${d}`

  // Tasks completed in window
  const { count: tasksCompleted } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', windowStartISO)
    .lt('completed_at', windowEndISO)

  // Tasks added in window
  const { count: tasksAdded } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStartISO)
    .lt('created_at', windowEndISO)

  // Tasks rolled in window (scheduled_for updated while still incomplete)
  const { count: tasksRolled } = await supabaseAdmin
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', false)
    .gt('rollover_count', 0)
    .gte('updated_at', windowStartISO)
    .lt('updated_at', windowEndISO)

  // Focus minutes — graceful fallback if table doesn't exist yet
  let focusMinutes = 0
  try {
    const { data: sessions } = await supabaseAdmin
      .from('focus_sessions')
      .select('duration_minutes')
      .eq('user_id', userId)
      .gte('started_at', windowStartISO)
      .lt('started_at', windowEndISO)
    focusMinutes = (sessions || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  } catch {
    // focus_sessions table not yet created — skip
  }

  // Journal entries in window
  const { count: journalEntries } = await supabaseAdmin
    .from('journal_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStartISO)
    .lt('created_at', windowEndISO)

  // Generate AI summary via Haiku
  const parts = []
  if (tasksCompleted) parts.push(`${tasksCompleted} task${tasksCompleted !== 1 ? 's' : ''} completed`)
  if (tasksRolled) parts.push(`${tasksRolled} rolled`)
  if (focusMinutes) parts.push(`${focusMinutes} minutes focused`)
  if (!parts.length) parts.push('no tasks completed')

  const prompt = `One sentence about today: ${parts.join(', ')}. Be specific and direct. No filler.`

  let aiSummary = ''
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (response.ok) {
      const data = await response.json()
      aiSummary = data?.content?.[0]?.text?.trim() ?? ''
    }
  } catch (err) {
    console.error('[progress-snapshot] AI summary failed:', err.message)
  }

  // Upsert into progress_snapshots (unique on user_id + snapshot_date)
  const { data: snapshot, error: upsertErr } = await supabaseAdmin
    .from('progress_snapshots')
    .upsert({
      user_id: userId,
      snapshot_date: snapshotDate,
      tasks_completed: tasksCompleted || 0,
      tasks_added: tasksAdded || 0,
      tasks_rolled: tasksRolled || 0,
      focus_minutes: focusMinutes,
      journal_entries: journalEntries || 0,
      ai_summary: aiSummary,
    }, { onConflict: 'user_id,snapshot_date' })
    .select()
    .single()

  if (upsertErr) throw new Error(upsertErr.message)

  return snapshot
}

async function handler(req, res, userId) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const snapshot = await runProgressSnapshot(userId)
    return res.status(200).json({ snapshot })
  } catch (err) {
    console.error('[progress-snapshot] Error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}

export default withAuth(handler)
