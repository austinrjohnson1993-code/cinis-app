import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  const supabaseAdmin = getAdminClient()

  // GET ?userId=xxx — fetch pairs, active partner stats, messages, pending invites
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId required' })

    const { data: pairs } = await supabaseAdmin
      .from('accountability_pairs')
      .select('*')
      .or(`user_id.eq.${userId},partner_id.eq.${userId}`)

    if (!pairs || pairs.length === 0) {
      return res.status(200).json({ pairs: [], partner: null, messages: [], pendingInvites: [] })
    }

    const activePair = pairs.find(p => p.status === 'active')
    const pendingInvites = pairs.filter(p => p.partner_id === userId && p.status === 'pending')

    let partner = null
    let messages = []

    if (activePair) {
      const partnerId = activePair.user_id === userId ? activePair.partner_id : activePair.user_id

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const [
        { data: partnerProfile },
        { data: tasksToday },
        { data: myTasksWeek },
        { data: partnerTasksWeek },
        { data: msgs },
      ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, full_name, email').eq('id', partnerId).single(),
        supabaseAdmin.from('tasks').select('id').eq('user_id', partnerId).eq('completed', true).gte('updated_at', todayStart.toISOString()),
        supabaseAdmin.from('tasks').select('id').eq('user_id', userId).eq('completed', true).gte('updated_at', weekStart.toISOString()),
        supabaseAdmin.from('tasks').select('id').eq('user_id', partnerId).eq('completed', true).gte('updated_at', weekStart.toISOString()),
        supabaseAdmin.from('accountability_messages').select('*').eq('pair_id', activePair.id).order('created_at', { ascending: true }).limit(30),
      ])

      partner = {
        id: partnerId,
        pairId: activePair.id,
        name: partnerProfile?.full_name || partnerProfile?.email || 'Your partner',
        tasksToday: (tasksToday || []).length,
        tasksThisWeek: (partnerTasksWeek || []).length,
        combinedTasksThisWeek: (myTasksWeek || []).length + (partnerTasksWeek || []).length,
      }
      messages = msgs || []
    }

    // Enrich pending invites with sender name
    const enrichedPendingInvites = await Promise.all(
      pendingInvites.map(async (invite) => {
        const { data: sender } = await supabaseAdmin
          .from('profiles').select('id, full_name, email').eq('id', invite.user_id).single()
        return { ...invite, senderName: sender?.full_name || sender?.email || 'Someone', senderEmail: sender?.email }
      })
    )

    return res.status(200).json({ pairs, partner, messages, pendingInvites: enrichedPendingInvites })
  }

  // POST — invite or message
  if (req.method === 'POST') {
    const { userId, action } = req.body

    if (action === 'invite') {
      const { email } = req.body
      if (!email) return res.status(400).json({ error: 'Email required' })

      const { data: target } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', email.trim().toLowerCase())
        .single()

      if (!target) return res.status(404).json({ error: 'No Cinis account found with that email.' })
      if (target.id === userId) return res.status(400).json({ error: "You can't partner with yourself." })

      // Check for existing pair in either direction
      const { data: existing } = await supabaseAdmin
        .from('accountability_pairs')
        .select('id, status')
        .or(`and(user_id.eq.${userId},partner_id.eq.${target.id}),and(user_id.eq.${target.id},partner_id.eq.${userId})`)
        .maybeSingle()

      if (existing) {
        if (existing.status === 'active') return res.status(400).json({ error: 'You already have an active partnership.' })
        if (existing.status === 'pending') return res.status(400).json({ error: 'An invite is already pending.' })
      }

      const { error } = await supabaseAdmin
        .from('accountability_pairs')
        .insert({ user_id: userId, partner_id: target.id, status: 'pending' })

      if (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Invite already sent.' })
        console.error('[accountability:invite]', error.message)
        return res.status(500).json({ error: 'Failed to send invite.' })
      }

      return res.status(200).json({ success: true, partnerName: target.full_name || target.email })
    }

    if (action === 'message') {
      const { partnerId, message } = req.body
      if (!message?.trim()) return res.status(400).json({ error: 'Message required' })

      const { data: pair } = await supabaseAdmin
        .from('accountability_pairs')
        .select('id')
        .eq('status', 'active')
        .or(`and(user_id.eq.${userId},partner_id.eq.${partnerId}),and(user_id.eq.${partnerId},partner_id.eq.${userId})`)
        .maybeSingle()

      if (!pair) return res.status(404).json({ error: 'No active partnership found.' })

      const { error } = await supabaseAdmin
        .from('accountability_messages')
        .insert({ pair_id: pair.id, sender_id: userId, message: message.trim() })

      if (error) {
        console.error('[accountability:message]', error.message)
        return res.status(500).json({ error: 'Failed to send message.' })
      }

      return res.status(200).json({ success: true })
    }

    return res.status(400).json({ error: 'Invalid action' })
  }

  // PATCH — accept or decline invite
  if (req.method === 'PATCH') {
    const { userId, pairId, action } = req.body
    if (!pairId || !action) return res.status(400).json({ error: 'pairId and action required' })

    const newStatus = action === 'accept' ? 'active' : 'declined'
    const { error } = await supabaseAdmin
      .from('accountability_pairs')
      .update({ status: newStatus })
      .eq('id', pairId)
      .eq('partner_id', userId)

    if (error) {
      console.error('[accountability:patch]', error.message)
      return res.status(500).json({ error: 'Failed to update invite.' })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
