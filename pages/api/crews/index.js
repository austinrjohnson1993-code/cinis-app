import { createClient } from '@supabase/supabase-js'
import withAuth from '../../../lib/authGuard'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function handler(req, res, userId) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = getAdminClient()

  // Get all crews the user belongs to
  const { data: memberships, error: memErr } = await supabaseAdmin
    .from('crew_members')
    .select('crew_id, role')
    .eq('user_id', userId)

  if (memErr) {
    console.error('[crews:GET] memberships error:', JSON.stringify(memErr))
    return res.status(500).json({ error: 'Failed to fetch crews' })
  }

  if (!memberships || memberships.length === 0) {
    return res.status(200).json({ crews: [] })
  }

  const crewIds = memberships.map(m => m.crew_id)

  // Fetch crews
  const { data: crews, error: crewsErr } = await supabaseAdmin
    .from('crews')
    .select('id, name, crew_type, invite_code, owner_id, created_at')
    .in('id', crewIds)
    .order('created_at', { ascending: true })

  if (crewsErr) {
    console.error('[crews:GET] crews error:', JSON.stringify(crewsErr))
    return res.status(500).json({ error: 'Failed to fetch crews' })
  }

  // Fetch members for all crews with profile names
  const { data: allMembers, error: membersErr } = await supabaseAdmin
    .from('crew_members')
    .select('crew_id, user_id, role')
    .in('crew_id', crewIds)

  let memberProfiles = []
  if (!membersErr && allMembers && allMembers.length > 0) {
    const memberUserIds = [...new Set(allMembers.map(m => m.user_id))]
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', memberUserIds)
    memberProfiles = profiles || []
  }

  // Fetch recent activity for all crews (last 20 entries)
  const { data: activity } = await supabaseAdmin
    .from('crew_activity')
    .select('id, crew_id, user_id, text, created_at')
    .in('crew_id', crewIds)
    .order('created_at', { ascending: false })
    .limit(20)

  // Assemble response
  const assembled = (crews || []).map(crew => {
    const members = (allMembers || [])
      .filter(m => m.crew_id === crew.id)
      .map(m => ({
        ...m,
        full_name: memberProfiles.find(p => p.id === m.user_id)?.full_name || null,
      }))
    const crewActivity = (activity || [])
      .filter(a => a.crew_id === crew.id)
      .slice(0, 10)
    return { ...crew, members, activity: crewActivity }
  })

  return res.status(200).json({ crews: assembled })
}

export default withAuth(handler)
