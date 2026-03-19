import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, incomeEntries = [], monthlyIncome = 0 } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })

  const supabaseAdmin = getAdminClient()

  const { data: bills, error: billsErr } = await supabaseAdmin
    .from('bills')
    .select('name, amount, frequency, due_day, category, bill_type, interest_rate')
    .eq('user_id', userId)

  if (billsErr) return res.status(500).json({ error: 'Failed to fetch bills' })

  // Compute normalised monthly income
  const freqMult = { weekly: 4.33, biweekly: 2.17, monthly: 1, yearly: 1 / 12 }
  const normalizedIncome = incomeEntries.length > 0
    ? incomeEntries.reduce((sum, e) => sum + ((parseFloat(e.amount) || 0) * (freqMult[e.frequency] || 1)), 0)
    : parseFloat(monthlyIncome) || 0

  // Not enough data — return empty signal
  if ((!bills || bills.length === 0) && normalizedIncome === 0) {
    return res.status(200).json({ insights: [], empty: true })
  }

  // Build bill summary text
  const billLines = (bills || []).map(b => {
    const amt = parseFloat(b.amount) || 0
    const parts = [`${b.name}: $${amt.toFixed(2)} ${b.frequency || 'monthly'}`]
    if (b.due_day) parts.push(`due day ${b.due_day}`)
    if (b.category) parts.push(b.category)
    if (b.interest_rate) parts.push(`${b.interest_rate}% APR`)
    return parts.join(', ')
  })

  const monthlyBillsTotal = (bills || []).reduce((sum, b) => {
    const amt = parseFloat(b.amount) || 0
    if (b.frequency === 'weekly') return sum + amt * 4.33
    if (b.frequency === 'yearly') return sum + amt / 12
    return sum + amt
  }, 0)

  const incomeDesc = incomeEntries.length > 0
    ? incomeEntries.map(e => `${e.type} $${parseFloat(e.amount).toFixed(2)} ${e.frequency}`).join(', ')
    : normalizedIncome > 0 ? `$${normalizedIncome.toFixed(2)}/month` : 'not provided'

  const userPrompt = `You are a financial coach. The user has the following bills:
${billLines.length > 0 ? billLines.join('\n') : 'No bills recorded.'}

Their monthly income is $${normalizedIncome.toFixed(2)} broken down as: ${incomeDesc}.
Monthly bills total: $${monthlyBillsTotal.toFixed(2)}.
${normalizedIncome > 0 ? `Bills-to-income ratio: ${Math.round((monthlyBillsTotal / normalizedIncome) * 100)}%` : ''}

Using the 50/30/20 framework, analyze their financial picture. Give exactly 3 specific, actionable insights in 1-2 sentences each. Be direct, specific, and encouraging. No generic advice. Format as exactly 3 paragraphs separated by blank lines.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: 'You are a concise financial coach giving personalized insights. Respond with exactly 3 paragraphs (separated by a blank line), each 1-2 sentences of specific actionable advice. No headers, no bullet points, no numbering.',
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      console.error('[finance-insights] Claude error:', await response.text())
      return res.status(500).json({ error: 'AI call failed' })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text?.trim() || ''
    const insights = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean).slice(0, 3)

    return res.status(200).json({ insights })
  } catch (err) {
    console.error('[finance-insights] error:', err)
    return res.status(500).json({ error: 'Failed to generate insights' })
  }
}
