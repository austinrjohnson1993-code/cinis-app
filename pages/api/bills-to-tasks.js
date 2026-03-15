import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const supabaseAdmin = getAdminClient()

  const { data: bills, error: billsErr } = await supabaseAdmin
    .from('bills')
    .select('*')
    .eq('user_id', userId)
    .eq('auto_task', true)

  if (billsErr) {
    console.error('[bills-to-tasks] Failed to fetch bills:', JSON.stringify(billsErr))
    return res.status(500).json({ error: 'Failed to fetch bills' })
  }

  if (!bills || bills.length === 0) {
    return res.status(200).json({ created: 0, bills: [] })
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayDay = today.getDate()
  const tomorrowDay = tomorrow.getDate()

  const created = []

  for (const bill of bills) {
    if (bill.due_day !== todayDay && bill.due_day !== tomorrowDay) continue

    const expectedTitle = `Pay: ${bill.name}`

    const { data: existing } = await supabaseAdmin
      .from('tasks')
      .select('id')
      .eq('user_id', userId)
      .ilike('title', `${expectedTitle}%`)
      .eq('completed', false)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`[bills-to-tasks] Task already exists for bill "${bill.name}", skipping`)
      continue
    }

    const dueDate = bill.due_day === todayDay ? today : tomorrow
    dueDate.setHours(9, 0, 0, 0)
    const dueISO = dueDate.toISOString()

    const amountStr = bill.amount != null ? ` — $${Number(bill.amount).toFixed(2)}` : ''
    const title = `Pay: ${bill.name}${amountStr}`
    const noteParts = [`Recurring ${bill.frequency} bill`]
    if (bill.account) noteParts.push(bill.account)
    const notes = noteParts.join(' — ')

    const { error: insertErr } = await supabaseAdmin
      .from('tasks')
      .insert({
        user_id: userId,
        title,
        consequence_level: 'external',
        due_time: dueISO,
        notes,
      })

    if (insertErr) {
      console.error(`[bills-to-tasks] Failed to create task for "${bill.name}":`, JSON.stringify(insertErr))
    } else {
      console.log(`[bills-to-tasks] Created task: "${title}"`)
      created.push(bill.name)
    }
  }

  return res.status(200).json({ created: created.length, bills: created })
}
