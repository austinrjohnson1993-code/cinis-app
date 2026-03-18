import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DAILY_LIMITS = {
  free: 5,
  pro: 15,
  pro_sms: 20,
  unlimited: 40,
  cancelled: 2,
}

export async function checkDailyRateLimit(userId) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('subscription_status, ai_interactions_today, ai_interactions_reset_at')
    .eq('id', userId)
    .single()

  if (error || !profile) return { allowed: false, reason: 'profile_not_found' }

  const now = new Date()
  const resetAt = profile.ai_interactions_reset_at
    ? new Date(profile.ai_interactions_reset_at)
    : new Date(0)
  const isNewDay = now.toDateString() !== resetAt.toDateString()

  let currentCount = profile.ai_interactions_today || 0

  if (isNewDay) {
    currentCount = 0
    await supabaseAdmin
      .from('profiles')
      .update({
        ai_interactions_today: 0,
        ai_interactions_reset_at: now.toISOString()
      })
      .eq('id', userId)
  }

  const status = profile.subscription_status || 'free'
  const limit = DAILY_LIMITS[status] ?? DAILY_LIMITS.free
  const isPro = !['free', 'cancelled'].includes(status)

  if (currentCount >= limit) {
    return { allowed: false, reason: 'limit_reached', current: currentCount, limit, status, isPro }
  }

  await supabaseAdmin
    .from('profiles')
    .update({ ai_interactions_today: currentCount + 1 })
    .eq('id', userId)

  return { allowed: true, current: currentCount + 1, limit, status, isPro }
}

export function rateLimitErrorResponse(limitData) {
  const isPro = limitData.isPro
  return {
    error: 'rate_limit_reached',
    message: isPro
      ? `You've used all ${limitData.limit} daily check-ins. Resets at midnight.`
      : `You've used your ${limitData.limit} free daily check-ins. Upgrade to Pro for 15 per day, persistent memory, and morning check-ins.`,
    limit: limitData.limit,
    current: limitData.current,
    isPro,
    upgradeRequired: !isPro,
  }
}
