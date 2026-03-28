import withAuth from '../../lib/authGuard'
import getAdminClient from '../../lib/supabaseAdmin'

const VALID_FREQUENCIES = ['weekly', 'biweekly', 'bimonthly', 'monthly']



async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // GET — fetch income sources from income_sources table
  if (req.method === 'GET') {
    const { data: incomeSources, error } = await supabaseAdmin
      .from('income_sources')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[income:GET] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to fetch income sources' })
    }

    return res.status(200).json({
      income_sources: incomeSources || [],
    })
  }

  // POST { name, income_type, annual_amount?, hourly_rate?, hours_per_week?, monthly_amount?, pay_frequency, next_pay_date?, is_net? } — create income source
  if (req.method === 'POST') {
    const {
      name,
      income_type,
      annual_amount,
      hourly_rate,
      hours_per_week,
      monthly_amount: providedMonthlyAmount,
      pay_frequency,
      next_pay_date,
      is_net,
    } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name required' })
    }

    if (!income_type) {
      return res.status(400).json({ error: 'income_type required (salary, hourly, self-employed, other)' })
    }

    if (!pay_frequency) {
      return res.status(400).json({ error: 'pay_frequency required' })
    }

    // Calculate monthly_amount based on income_type
    let calculatedMonthlyAmount = null

    if (income_type === 'salary' && annual_amount) {
      calculatedMonthlyAmount = annual_amount / 12
    } else if (income_type === 'hourly' && hourly_rate && hours_per_week) {
      // hourly_rate * hours_per_week * 52 weeks / 12 months
      calculatedMonthlyAmount = (hourly_rate * hours_per_week * 52) / 12
    } else if (providedMonthlyAmount) {
      calculatedMonthlyAmount = providedMonthlyAmount
    }

    if (calculatedMonthlyAmount === null) {
      return res.status(400).json({
        error: 'Cannot calculate monthly amount. Provide: annual_amount (salary), hourly_rate+hours_per_week (hourly), or monthly_amount (other)',
      })
    }

    // Insert into income_sources table
    const { data: incomeSource, error: insertError } = await supabaseAdmin
      .from('income_sources')
      .insert({
        user_id: userId,
        name: name.trim(),
        income_type,
        annual_amount: income_type === 'salary' ? annual_amount : null,
        hourly_rate: income_type === 'hourly' ? hourly_rate : null,
        hours_per_week: income_type === 'hourly' ? hours_per_week : null,
        monthly_amount: calculatedMonthlyAmount,
        pay_frequency,
        next_pay_date: next_pay_date || null,
        is_net: is_net === true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[income:POST] insert error:', JSON.stringify(insertError))
      return res.status(500).json({ error: 'Failed to create income source' })
    }

    // Update profiles.monthly_income for backward compatibility
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('monthly_income')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('[income:POST] fetch profile error:', JSON.stringify(fetchError))
      return res.status(201).json({ income_source: incomeSource })
    }

    const currentMonthlyIncome = profile.monthly_income || 0
    const newTotalMonthlyIncome = currentMonthlyIncome + calculatedMonthlyAmount

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ monthly_income: newTotalMonthlyIncome })
      .eq('id', userId)

    if (updateError) {
      console.error('[income:POST] update profile error:', JSON.stringify(updateError))
      // Don't fail the request—income source was created successfully
    }

    return res.status(201).json({ income_source: incomeSource })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
