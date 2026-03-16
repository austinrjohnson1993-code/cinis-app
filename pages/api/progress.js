import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

const NEW_USER_INSIGHT = "Welcome to FocusBuddy. This is day one — your first win starts here. Add your first task and let's start building."

async function callHaiku(prompt) {
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
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) return null
    const data = await response.json()
    return data?.content?.[0]?.text?.trim() ?? null
  } catch {
    return null
  }
}

// Strip markdown headers/formatting and truncate to first sentence
function sanitizeInsight(text) {
  if (!text) return null
  // Remove lines that start with # (markdown headers like "# The Drill Sergeant")
  const lines = text.split('\n').filter(line => !line.trim().startsWith('#'))
  let cleaned = lines.join(' ').trim()
  // Strip bold, italic, inline code
  cleaned = cleaned
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  // Truncate to first sentence: ". " or "! " or "? " followed by a capital letter
  const firstSentence = cleaned.match(/^(.+?[.!?])\s+[A-Z]/)
  if (firstSentence) cleaned = firstSentence[1]
  return cleaned || null
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // T2-A: userId and type are read from query params — confirmed correct
  // TERMINAL 1 NOTE: dashboard.js must pass userId in the fetch call:
  //   fetch(`/api/progress?type=daily&userId=${session.user.id}&timezone=${tz}`)
  const { userId, type = 'weekly', timezone = 'UTC' } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const supabaseAdmin = getAdminClient()

  // ── daily ─────────────────────────────────────────────────────────────────
  if (type === 'daily') {
    // Compute today's boundaries in the user's local timezone
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
    const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: timezone })
    const todayStart = new Date(`${todayStr}T00:00:00`)
    const todayEnd = new Date(`${tomorrowStr}T00:00:00`)

    // T2-A: journal_entries filtered by user_id and created_at in user's timezone window
    const [{ data: tasks, error: tasksErr }, { data: profile }, { count: journalCount }] = await Promise.all([
      supabaseAdmin
        .from('tasks')
        .select('title, completed_at')
        .eq('user_id', userId)
        .eq('completed', true)
        .gte('completed_at', todayStart.toISOString())
        .lt('completed_at', todayEnd.toISOString()),
      supabaseAdmin.from('profiles').select('persona_blend').eq('id', userId).single(),
      supabaseAdmin
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString())
    ])

    if (tasksErr) return res.status(500).json({ error: 'Failed to fetch tasks' })

    const persona = profile?.persona_blend?.join(', ') || 'coach'
    const titles = tasks?.length ? tasks.map(t => `"${t.title}"`).join(', ') : 'none yet'

    const prompt = `Respond with a SINGLE sentence only. No headers, no bullet points, no markdown, no line breaks. One sentence maximum. Do not label by persona. In one persona-voiced sentence, give an encouraging observation about their day so far. Persona: ${persona}. Tasks done today: ${titles}. Be specific.`
    const raw = await callHaiku(prompt)
    const insight = sanitizeInsight(raw) ?? "You're making moves — keep going."

    // T2-A: journalCount returned as-is — key name matches frontend expectation
    return res.status(200).json({ type: 'daily', insight, tasksCompleted: tasks?.length ?? 0, journalCount: journalCount ?? 0 })
  }

  // ── monthly ───────────────────────────────────────────────────────────────
  if (type === 'monthly') {
    // T2-B: pull exactly 30 days of snapshots, not just calendar month-to-date
    const now = new Date()
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const [{ data: snapshots, error: snapErr }, { data: profile }, { count: allTimeCount }] = await Promise.all([
      supabaseAdmin
        .from('progress_snapshots')
        .select('snapshot_date, tasks_completed')
        .eq('user_id', userId)
        .gte('snapshot_date', thirtyDaysAgoStr),
      supabaseAdmin.from('profiles').select('persona_blend').eq('id', userId).single(),
      supabaseAdmin.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('completed', true)
    ])

    if (snapErr) return res.status(500).json({ error: 'Failed to fetch snapshots' })

    if ((allTimeCount ?? 0) === 0) {
      return res.status(200).json({ type: 'monthly', insight: NEW_USER_INSIGHT, totalTasks: 0, bestDay: null })
    }

    const totalTasks = (snapshots || []).reduce((sum, s) => sum + (s.tasks_completed || 0), 0)
    const best = (snapshots || []).slice().sort((a, b) => b.tasks_completed - a.tasks_completed)[0]
    const bestDay = best ? { date: best.snapshot_date, count: best.tasks_completed } : null

    const persona = profile?.persona_blend?.join(', ') || 'coach'
    // T2-B: explicitly different prompt from weekly — 30-day scope, trend/pattern focus, month name required
    const prompt = `This is a MONTHLY summary covering the past 30 days. Identify a meaningful trend or pattern across the whole month, not just this week. Reference the month by name. One sentence only. No markdown. No headers. Do not label by persona. Persona: ${persona}. Month: ${monthName}. Total tasks completed in the past 30 days: ${totalTasks}. Best single day: ${bestDay?.date ?? 'none'} with ${bestDay?.count ?? 0} tasks. Be specific about the pattern or growth you see.`
    const raw = await callHaiku(prompt)
    const insight = sanitizeInsight(raw) ?? `You completed ${totalTasks} tasks in ${monthName}.`

    return res.status(200).json({ type: 'monthly', insight, totalTasks, bestDay })
  }

  // ── weekly (default) ──────────────────────────────────────────────────────
  const { data: tasks, error } = await supabaseAdmin
    .from('tasks')
    .select('id, title, completed, completed_at, created_at')
    .eq('user_id', userId)
    .eq('archived', false)

  if (error) return res.status(500).json({ error: 'Failed to fetch tasks' })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const completedThisWeek = (tasks || []).filter(
    t => t.completed && t.completed_at && new Date(t.completed_at) > sevenDaysAgo
  )

  let streak = 0
  for (let i = 0; i < 30; i++) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    const ds = day.toDateString()
    if ((tasks || []).some(t => t.completed && t.completed_at && new Date(t.completed_at).toDateString() === ds)) {
      streak++
    } else if (i > 0) break
  }

  const dayCounts = {}
  ;(tasks || []).filter(t => t.completed && t.completed_at).forEach(t => {
    const day = new Date(t.completed_at).toLocaleDateString('en-US', { weekday: 'short' })
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  const bestDay = Object.keys(dayCounts).length
    ? Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0][0]
    : 'N/A'

  if ((tasks || []).filter(t => t.completed).length === 0) {
    return res.status(200).json({
      type: 'weekly',
      insight: NEW_USER_INSIGHT,
      completedThisWeek: [],
      streak: 0,
      bestDay: 'N/A',
      totalCompleted: 0,
    })
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('persona_blend').eq('id', userId).single()
  const persona = profile?.persona_blend?.join(', ') || 'coach'
  const completedTitles = completedThisWeek.length
    ? completedThisWeek.map(t => `"${t.title}"`).join(', ')
    : 'none this week'
  const weeklyPrompt = `Respond with a SINGLE sentence only. No headers, no bullet points, no markdown, no line breaks. One sentence maximum. Do not label by persona. In one persona-voiced sentence, give an encouraging weekly summary about the last 7 days. Persona: ${persona}. Completed this week: ${completedTitles}. Streak: ${streak} days. Be specific.`
  const raw = await callHaiku(weeklyPrompt)
  const insight = sanitizeInsight(raw) ?? `You completed ${completedThisWeek.length} tasks this week.`

  return res.status(200).json({
    type: 'weekly',
    insight,
    completedThisWeek,
    streak,
    bestDay,
    totalCompleted: (tasks || []).filter(t => t.completed).length,
  })
}
