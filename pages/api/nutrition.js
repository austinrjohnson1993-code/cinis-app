import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  const supabaseAdmin = getAdminClient()

  // GET ?userId=xxx — fetch staples (from profile) + today's log entries
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [{ data: profile, error: profileErr }, { data: entries, error: entriesErr }] = await Promise.all([
      supabaseAdmin.from('profiles').select('nutrition_staples').eq('id', userId).single(),
      supabaseAdmin
        .from('nutrition_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', todayStart.toISOString())
        .lte('logged_at', todayEnd.toISOString())
        .order('logged_at', { ascending: true }),
    ])

    if (profileErr) return res.status(500).json({ error: 'Failed to fetch profile' })
    if (entriesErr) return res.status(500).json({ error: 'Failed to fetch entries' })

    return res.status(200).json({
      staples: profile?.nutrition_staples || [],
      entries: entries || [],
    })
  }

  // POST { userId, type, name, category?, notes? }
  // type='staple' → append to profiles.nutrition_staples
  // type='entry'  → insert into nutrition_entries
  if (req.method === 'POST') {
    const { userId, type, name, category, notes } = req.body
    if (!userId || !name) return res.status(400).json({ error: 'userId and name required' })

    if (type === 'staple') {
      // Read existing staples, append new one (deduplicated)
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('nutrition_staples')
        .eq('id', userId)
        .single()

      if (profileErr) return res.status(500).json({ error: 'Failed to fetch profile' })

      const existing = profile?.nutrition_staples || []
      const trimmed = name.trim()
      if (existing.map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) {
        return res.status(200).json({ staples: existing }) // already present
      }
      const updated = [...existing, trimmed]

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ nutrition_staples: updated })
        .eq('id', userId)

      if (updateErr) return res.status(500).json({ error: 'Failed to save staple' })
      return res.status(200).json({ staples: updated })
    }

    // type='entry' (default)
    if (!category) return res.status(400).json({ error: 'category required for log entries' })

    const { data, error } = await supabaseAdmin
      .from('nutrition_entries')
      .insert({
        user_id: userId,
        name: name.trim(),
        category,
        notes: notes?.trim() || null,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[nutrition:POST] error:', JSON.stringify(error))
      return res.status(500).json({ error: 'Failed to log entry' })
    }

    return res.status(200).json({ entry: data })
  }

  // DELETE ?userId=xxx&type=staple&name=xxx  OR  ?userId=xxx&type=entry&id=xxx
  if (req.method === 'DELETE') {
    const { userId, type, name, id } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    if (type === 'staple') {
      if (!name) return res.status(400).json({ error: 'name required' })

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('profiles')
        .select('nutrition_staples')
        .eq('id', userId)
        .single()

      if (profileErr) return res.status(500).json({ error: 'Failed to fetch profile' })

      const updated = (profile?.nutrition_staples || []).filter(
        s => s.toLowerCase() !== name.toLowerCase()
      )

      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ nutrition_staples: updated })
        .eq('id', userId)

      if (updateErr) return res.status(500).json({ error: 'Failed to remove staple' })
      return res.status(200).json({ staples: updated })
    }

    // type='entry'
    if (!id) return res.status(400).json({ error: 'id required' })

    const { error } = await supabaseAdmin
      .from('nutrition_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) return res.status(500).json({ error: 'Failed to delete entry' })
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
