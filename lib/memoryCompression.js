import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function compressAndSaveMemory(userId, messages, existingSummary) {
  if (!messages || messages.length < 2) return

  try {
    const convo = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n')

    const prompt = `You are compressing a coaching conversation into a memory summary.

Existing memory summary (may be empty):
${existingSummary || 'None yet.'}

New conversation to compress and add:
${convo}

Write a 2-3 sentence summary that captures:
- What the user was working on or struggling with
- Any wins, completions, or breakthroughs mentioned
- Emotional state or energy level if notable
- Any patterns worth remembering (avoidance, momentum, recurring tasks)

Merge with existing summary if present. Keep total under 150 words.
Write in third person. Be specific, not generic.
Return only the summary — no labels, no preamble.`

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

    if (!response.ok) {
      console.error('[memoryCompression] API error:', response.status)
      return
    }

    const data = await response.json()
    const newSummary = data?.content?.[0]?.text?.trim()
    if (!newSummary) return

    const supabaseAdmin = getAdminClient()
    await supabaseAdmin
      .from('profiles')
      .update({ rolling_memory_summary: newSummary })
      .eq('id', userId)

    console.log('[memoryCompression] saved summary for', userId)
  } catch (err) {
    console.error('[memoryCompression] failed:', err)
    // Never throw — memory compression is fire-and-forget
  }
}
