import React, { useState, useEffect } from 'react'
import { UsersThree } from '@phosphor-icons/react'
import styles from '../../styles/Dashboard.module.css'
import { supabase } from '../../lib/supabase'
import { SkeletonCard, TabErrorBoundary } from './shared'

export default function TabTagTeam({ user, profile, showToast, loggedFetch }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [crews, setCrews] = useState([])
  const [crewsLoaded, setCrewsLoaded] = useState(false)
  const [crewsLoading, setCrewsLoading] = useState(false)
  const [showCreateCrewOverlay, setShowCreateCrewOverlay] = useState(false)
  const [showJoinCrewOverlay, setShowJoinCrewOverlay] = useState(false)
  const [newCrewName, setNewCrewName] = useState('')
  const [newCrewType, setNewCrewType] = useState('crew')
  const [creatingCrew, setCreatingCrew] = useState(false)
  const [crewInviteCode, setCrewInviteCode] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [joiningCrew, setJoiningCrew] = useState(false)
  const [nudgeSending, setNudgeSending] = useState(false)
  const [nudgeSent, setNudgeSent] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchCrews = async (userId) => {
    setCrewsLoaded(true)
    setCrewsLoading(true)
    try {
      const res = await loggedFetch(`/api/crews?userId=${userId}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setCrews(data.crews || [])
    } catch {
      // silently fail — non-critical tab
    } finally {
      setCrewsLoading(false)
    }
  }

  useEffect(() => {
    if (user && !crewsLoaded) {
      fetchCrews(user.id)
    }
  }, [user])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const createCrew = async (e) => {
    e.preventDefault()
    if (!newCrewName.trim() || !user) return
    setCreatingCrew(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await loggedFetch('/api/crews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: newCrewName.trim(), crew_type: newCrewType }),
      })
      const data = await res.json()
      if (data.crew) {
        setCrewInviteCode(data.crew.invite_code)
        setCrews(prev => [...prev, { ...data.crew, members: [{ user_id: user.id, role: 'owner', full_name: profile?.full_name || null }], activity: [] }])
        setNewCrewName('')
        setNewCrewType('crew')
      }
    } catch { /* no-op */ }
    setCreatingCrew(false)
  }

  const joinCrew = async (e) => {
    e.preventDefault()
    if (!joinCode.trim() || !user) return
    setJoiningCrew(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await loggedFetch('/api/crews/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ invite_code: joinCode.trim() }),
      })
      const data = await res.json()
      if (data.crew) {
        setJoinCode('')
        setShowJoinCrewOverlay(false)
        fetchCrews(user.id)
      }
    } catch { /* no-op */ }
    setJoiningCrew(false)
  }

  const nudgeCrew = async (crewId) => {
    if (!user || nudgeSending) return
    setNudgeSending(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await loggedFetch('/api/crews/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ crew_id: crewId, emoji: '\u{1F44B}' }),
      })
      setNudgeSent(true)
      setTimeout(() => setNudgeSent(false), 2500)
      // Refresh activity
      fetchCrews(user.id)
    } catch { /* no-op */ }
    setNudgeSending(false)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const CREW_TYPE_LABELS = { family: 'Family', crew: 'Crew', work: 'Work', general: 'Crew' }

  return (
    <TabErrorBoundary tabName="Tag Team">
      <div className={styles.ttView}>
        {crewsLoading ? (
          <div style={{ padding: '12px 14px' }}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
          </div>
        ) : crews.length === 0 ? (
          /* ── No crew ── */
          <div className={styles.ttEmpty}>
            <div className={styles.ttEmptyIcon}>
              <UsersThree size={36} weight="fill" color="#FF6644" />
            </div>
            <p className={styles.ttEmptyHeadline}>Your crew starts here</p>
            <p className={styles.ttEmptySub}>Build with family, friends, or your team.</p>
            <div className={styles.ttEmptyBtns}>
              <button className={styles.ttPrimaryBtn} onClick={() => { setCrewInviteCode(null); setShowCreateCrewOverlay(true) }}>Create a crew</button>
              <button className={styles.ttGhostBtn} onClick={() => setShowJoinCrewOverlay(true)}>Join a crew</button>
            </div>
          </div>
        ) : (
          /* ── Active crew view ── */
          (() => {
            const crew = crews[0]
            return (
              <div style={{ padding: '12px 14px 80px' }}>
                {/* Header */}
                <div className={styles.ttCrewHeader}>
                  <div>
                    <div className={styles.ttCrewName}>{crew.name}</div>
                    <span className={styles.ttCrewTypeBadge}>{CREW_TYPE_LABELS[crew.crew_type] || 'Crew'}</span>
                  </div>
                  <button
                    className={styles.ttNudgeBtn}
                    onClick={() => nudgeCrew(crew.id)}
                    disabled={nudgeSending}
                  >
                    {nudgeSent ? '\u2713 Sent!' : nudgeSending ? '\u2026' : '\u{1F44B} Nudge crew'}
                  </button>
                </div>

                {/* Invite code */}
                <div className={styles.ttInviteBlock}>
                  <span className={styles.ttInviteLabel}>Invite code</span>
                  <div className={styles.ttInviteRow}>
                    <span className={styles.ttInviteCode}>{crew.invite_code}</span>
                    <button
                      className={styles.ttCopyBtn}
                      onClick={() => {
                        try { navigator.clipboard.writeText(crew.invite_code) } catch {}
                        setCodeCopied(true)
                        setTimeout(() => setCodeCopied(false), 2000)
                      }}
                    >{codeCopied ? 'Copied!' : 'Copy'}</button>
                  </div>
                </div>

                {/* Member list */}
                <div className={styles.ttSection}>
                  <div className={styles.ttSectionLabel}>Members \u00B7 {crew.members?.length || 0}</div>
                  <div className={styles.ttMemberList}>
                    {(crew.members || []).map(m => (
                      <div key={m.user_id} className={styles.ttMember}>
                        <div className={styles.ttAvatar}>
                          {(m.full_name || '?')[0].toUpperCase()}
                        </div>
                        <span className={styles.ttMemberName}>{m.full_name || 'Member'}</span>
                        {m.role === 'owner' && <span className={styles.ttOwnerBadge}>owner</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity feed */}
                {crew.activity && crew.activity.length > 0 && (
                  <div className={styles.ttSection}>
                    <div className={styles.ttSectionLabel}>Activity</div>
                    <div className={styles.ttActivityFeed}>
                      {crew.activity.map(entry => (
                        <div key={entry.id} className={styles.ttActivityItem}>
                          <span className={styles.ttActivityText}>{entry.text}</span>
                          <span className={styles.ttActivityTime}>
                            {new Date(entry.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Join another crew */}
                <button className={styles.ttGhostBtn} style={{ marginTop: 20 }} onClick={() => setShowJoinCrewOverlay(true)}>Join another crew</button>
              </div>
            )
          })()
        )}
      </div>

      {/* ── Create Crew Overlay ── */}
      {showCreateCrewOverlay && (
        <div className={styles.ttOverlayBackdrop} onClick={() => { if (!crewInviteCode) setShowCreateCrewOverlay(false) }}>
          <div className={styles.ttOverlayCard} onClick={e => e.stopPropagation()}>
            {crewInviteCode ? (
              <>
                <p className={styles.ttOverlayTitle}>Crew created!</p>
                <p className={styles.ttOverlaySub}>Share this code with your crew.</p>
                <div className={styles.ttInviteBlock} style={{ marginTop: 16 }}>
                  <span className={styles.ttInviteLabel}>Invite code</span>
                  <div className={styles.ttInviteRow}>
                    <span className={styles.ttInviteCode}>{crewInviteCode}</span>
                    <button
                      className={styles.ttCopyBtn}
                      onClick={() => {
                        try { navigator.clipboard.writeText(crewInviteCode) } catch {}
                        setCodeCopied(true)
                        setTimeout(() => setCodeCopied(false), 2000)
                      }}
                    >{codeCopied ? 'Copied!' : 'Copy'}</button>
                  </div>
                </div>
                <button className={styles.ttPrimaryBtn} style={{ marginTop: 20, width: '100%' }} onClick={() => { setShowCreateCrewOverlay(false); setCrewInviteCode(null) }}>Done</button>
              </>
            ) : (
              <>
                <p className={styles.ttOverlayTitle}>Create a crew</p>
                <form onSubmit={createCrew} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input
                    className={styles.ttInput}
                    type="text"
                    placeholder="Crew name"
                    value={newCrewName}
                    onChange={e => setNewCrewName(e.target.value)}
                    maxLength={40}
                    autoFocus
                  />
                  <div className={styles.ttTypePills}>
                    {['family', 'crew', 'work'].map(t => (
                      <button
                        key={t}
                        type="button"
                        className={newCrewType === t ? styles.ttTypePillActive : styles.ttTypePill}
                        onClick={() => setNewCrewType(t)}
                      >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className={styles.ttPrimaryBtn}
                    disabled={!newCrewName.trim() || creatingCrew}
                    style={{ width: '100%', opacity: (!newCrewName.trim() || creatingCrew) ? 0.5 : 1 }}
                  >{creatingCrew ? 'Creating\u2026' : 'Create'}</button>
                  <button type="button" className={styles.ttGhostBtn} style={{ width: '100%' }} onClick={() => setShowCreateCrewOverlay(false)}>Cancel</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Join Crew Overlay ── */}
      {showJoinCrewOverlay && (
        <div className={styles.ttOverlayBackdrop} onClick={() => setShowJoinCrewOverlay(false)}>
          <div className={styles.ttOverlayCard} onClick={e => e.stopPropagation()}>
            <p className={styles.ttOverlayTitle}>Join a crew</p>
            <p className={styles.ttOverlaySub}>Enter the invite code from your crew.</p>
            <form onSubmit={joinCrew} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <input
                className={styles.ttInput}
                type="text"
                placeholder="Invite code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={12}
                autoFocus
              />
              <button
                type="submit"
                className={styles.ttPrimaryBtn}
                disabled={!joinCode.trim() || joiningCrew}
                style={{ width: '100%', opacity: (!joinCode.trim() || joiningCrew) ? 0.5 : 1 }}
              >{joiningCrew ? 'Joining\u2026' : 'Join crew'}</button>
              <button type="button" className={styles.ttGhostBtn} style={{ width: '100%' }} onClick={() => setShowJoinCrewOverlay(false)}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </TabErrorBoundary>
  )
}
