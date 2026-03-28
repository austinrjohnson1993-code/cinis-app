import Anthropic from '@anthropic-ai/sdk'
import withAuth from '../../../lib/authGuard'
import getAdminClient from '../../../lib/supabaseAdmin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function handler(req, res, userId) {
  const supabaseAdmin = getAdminClient()

  // ── POST — generate monthly finance insight ────────────────────────────────
  if (req.method === 'POST') {
    try {
      const { bills, total_income } = req.body

      // Validate required fields
      if (!Array.isArray(bills)) {
        return res.status(400).json({ error: 'bills must be an array' })
      }

      if (total_income === undefined || typeof total_income !== 'number') {
        return res.status(400).json({ error: 'total_income is required and must be a number' })
      }

      // Build system and user prompts
      const systemPrompt = 'You are a concise financial coach. Give a 2-3 sentence personalized insight about the user\'s bills and spending. Be specific, actionable, warm.'

      const userPrompt = JSON.stringify({ bills, total_income })

      // Call Anthropic Claude API
      let insight = null

      try {
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        })

        const responseText = response.content.find(b => b.type === 'text')?.text?.trim() ?? null

        if (responseText) {
          insight = responseText
        }
      } catch (aiErr) {
        console.error('[finance/insight:POST] Anthropic API error:', aiErr.message)
        // Continue without insight on API failure
      }

      if (!insight) {
        return res.status(502).json({ error: 'Failed to generate insight from AI' })
      }

      return res.status(200).json({ insight })
    } catch (err) {
      console.error('[finance/insight:POST] error:', err.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withAuth(handler)
