import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = getAdminClient()

  const [profileRes, billsRes, sourcesRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('monthly_income, income_frequency, payday_day')
      .eq('id', userId)
      .single(),
    supabaseAdmin
      .from('bills')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('income_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const profile = profileRes.data || {}
  const bills   = billsRes.data || []
  const income_sources = sourcesRes.data || []

  const income = parseFloat(profile.monthly_income) || 0

  // Normalise all bills to monthly equivalent
  const bills_total = bills.reduce((sum, b) => {
    const amt = parseFloat(b.amount) || 0
    if (b.frequency === 'weekly')  return sum + amt * 4.33
    if (b.frequency === 'yearly')  return sum + amt / 12
    return sum + amt  // monthly (default) and bimonthly already monthly-ish
  }, 0)

  const suggested_savings = income * 0.20

  return res.status(200).json({
    income,
    income_frequency: profile.income_frequency || 'monthly',
    bills_total,
    income_sources,
    suggested_savings,
    bills,
  })
}

export default withAuth(handler)
