import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { text } = req.body
  if (!text?.trim()) return res.json({ tasks: [] })

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You parse a block of text containing multiple tasks and extract them as a JSON array. Each task object has these fields: title (string, required), due_date (YYYY-MM-DD or null), due_time (HH:MM 24h or null), consequence_level ("self" or "external"), recurrence ("none", "daily", or "weekly"), notes (string or null). Return ONLY valid JSON — a bare array, no markdown, no explanation.`,
      messages: [{ role: 'user', content: text }],
    })
    const raw = response.content[0].text.trim()
    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return res.json({ tasks: [] })
    const tasks = JSON.parse(jsonMatch[0])
    return res.json({ tasks: Array.isArray(tasks) ? tasks : [] })
  } catch (err) {
    console.error('[parse-bulk-tasks]', err)
    return res.status(500).json({ tasks: [] })
  }
}
