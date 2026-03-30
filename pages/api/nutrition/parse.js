import withAuth from '../../../lib/authGuard'

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { description, meal_type } = req.body

  if (!description) {
    return res.status(400).json({ error: 'description is required' })
  }

  const systemPrompt = `You are a nutrition analysis assistant. Given a meal description, return JSON with this exact structure:
{
  "meal_description": "string describing the meal",
  "items": [
    {
      "name": "food name",
      "portion": "portion size",
      "calories": 0,
      "protein_g": 0.0,
      "carbs_g": 0.0,
      "fat_g": 0.0
    }
  ],
  "totals": {
    "calories": 0,
    "protein_g": 0.0,
    "carbs_g": 0.0,
    "fat_g": 0.0
  },
  "confidence": "high|medium|low",
  "coach_note": "brief note about the analysis"
}

Rules:
- Use standard nutrition databases for accuracy
- confidence should reflect how certain you are about the estimates
- If meal includes multiple items, break them down individually
- Totals should be the sum of all items
- Return ONLY valid JSON, no other text or markdown`

  const userPrompt = `Meal description: "${description}"${meal_type ? `\nMeal type: ${meal_type}` : ''}`

  let data
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
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error('[nutrition/parse] Anthropic API error status:', response.status, errBody)
      return res.status(502).json({ error: 'Anthropic API error', status: response.status })
    }

    data = await response.json()
  } catch (err) {
    console.error('[nutrition/parse] Fetch to Anthropic failed:', err.message)
    return res.status(500).json({ error: 'Failed to reach Anthropic API', message: err.message })
  }

  const rawText = data?.content?.[0]?.text?.trim() ?? ''

  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[nutrition/parse] JSON parse failed:', parseErr.message, '| Raw text:', rawText)
    return res.status(500).json({ error: 'Failed to parse nutrition analysis as JSON', raw: rawText })
  }

  return res.status(200).json(parsed)
}

export default withAuth(handler)
