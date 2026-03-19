import { createClient } from '@supabase/supabase-js'
import { checkDailyRateLimit, rateLimitErrorResponse } from '../../lib/rateLimit'

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

  const rateCheck = await checkDailyRateLimit(userId)
  if (!rateCheck.allowed) {
    return res.status(429).json(rateLimitErrorResponse(rateCheck))
  }

  const supabaseAdmin = getAdminClient()

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('full_name, mental_health_context, persona_blend, persona_voice, checkin_times, ranked_priorities, main_struggle, diagnosis, communication_style, work_schedule, biggest_friction, accountability_style, current_priorities, ai_context')
    .eq('id', userId)
    .single()

  if (profileErr || !profile) {
    return res.status(500).json({ error: 'Failed to fetch profile' })
  }

  const {
    full_name,
    mental_health_context,
    persona_blend,
    persona_voice,
    checkin_times,
    ranked_priorities,
    main_struggle,
    diagnosis,
    communication_style,
    work_schedule,
    biggest_friction,
    accountability_style,
    current_priorities,
    ai_context,
  } = profile

  const name = full_name || 'this user'
  const ns = (v) => v || 'not specified'
  const arr = (v) => Array.isArray(v) ? v.join(', ') : ns(v)
  const userPrompt = `Generate a coaching profile for ${name}.

- Mental health context: ${ns(mental_health_context)}
- Diagnosis: ${ns(diagnosis)}
- Coaching persona blend: ${arr(persona_blend)}
- Voice preference: ${ns(persona_voice)}
- Communication style preference: ${ns(communication_style)}
- Check-in times: ${arr(checkin_times)}
- Ranked priorities: ${arr(ranked_priorities)}
- Peak energy / best work time: ${ns(work_schedule)}
- Main avoidance pattern: ${ns(main_struggle)}
- Biggest friction / what they want help with most: ${ns(biggest_friction)}
- Accountability/motivation style: ${ns(accountability_style)}
- Life area focus: ${ns(current_priorities)}
- Additional context: ${ns(ai_context)}

Based on this, describe: who this person is, how they like to be coached, what their biggest friction points likely are, and what kind of support will move them most.`

  let generatedText = null
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: 'You are generating a private coaching profile for a Cinis AI coach. This profile will be injected into every future AI interaction to make coaching personal. Write in second person about the user. Be specific, warm, and actionable. 200 words maximum.',
        messages: [{ role: 'user', content: userPrompt }]
      })
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[generate-baseline-profile] Claude API error:', errBody)
      return res.status(500).json({ error: 'Claude API call failed' })
    }

    const data = await response.json()
    generatedText = data?.content?.[0]?.text?.trim() ?? null
  } catch (err) {
    console.error('[generate-baseline-profile] fetch error:', err)
    return res.status(500).json({ error: 'Claude API call failed' })
  }

  if (!generatedText) {
    return res.status(500).json({ error: 'No profile text generated' })
  }

  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ baseline_profile: generatedText })
    .eq('id', userId)

  if (updateErr) {
    console.error('[generate-baseline-profile] update error:', JSON.stringify(updateErr))
    return res.status(500).json({ error: 'Failed to save baseline profile' })
  }

  console.log('[generate-baseline-profile] saved profile for', userId, '— first 100 chars:', generatedText.slice(0, 100))

  return res.status(200).json({ success: true, profile: generatedText })
}
