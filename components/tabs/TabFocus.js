import React, { useState, useEffect, useRef, useCallback } from 'react'
import { COLORS, FONTS } from '../../lib/constants'
import { formatTimer, localDateStr } from './shared'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/TabFocus.module.css'

const PURPLE = '#A47BDB'
const COAL = COLORS.coal
const CHAR = COLORS.char
const ASH = COLORS.ash
const HOT = COLORS.hot
const GREEN = COLORS.green

// ── Avatar initials helper ────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function TabFocus({
  user, profile, tasks = [], setTasks, showToast, loggedFetch, switchTab,
  topTask, completeTask, archiveTask, initialSessionId,
}) {
  // ── Solo timer state ─────────────────────────────────────────────────────
  const [dur, setDur] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState('idle') // 'idle' | 'active'
  const [showEndModal, setShowEndModal] = useState(false)
  const [showStuckModal, setShowStuckModal] = useState(false)
  const [showXp, setShowXp] = useState(false)
  const intervalRef = useRef(null)

  // ── Co-session state ──────────────────────────────────────────────────────
  const [coPhase, setCoPhase] = useState(null) // null | 'invite' | 'waiting' | 'active' | 'complete'
  const [coSession, setCoSession] = useState(null)
  const [coSessionId, setCoSessionId] = useState(null)

  // Invite sheet — search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [hostTask, setHostTask] = useState('')

  // Share link
  const [shareCode, setShareCode] = useState('')
  const [shareSessionId, setShareSessionId] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCreating, setLinkCreating] = useState(false)

  // Waiting state
  const [waitingFor, setWaitingFor] = useState(null) // { full_name, id }

  // Active session
  const [coRemaining, setCoRemaining] = useState(0)
  const [nudgeConfirm, setNudgeConfirm] = useState('')
  const coIntervalRef = useRef(null)
  const pollRef = useRef(null)
  const realtimeRef = useRef(null)

  // Recent co-sessions
  const [recentCoSessions, setRecentCoSessions] = useState([])

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearInterval(intervalRef.current)
    clearInterval(coIntervalRef.current)
    clearInterval(pollRef.current)
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
  }, [])

  // ── Load initialSessionId (from /join redirect) ───────────────────────────
  useEffect(() => {
    if (initialSessionId && user) {
      loadSessionById(initialSessionId)
    }
  }, [initialSessionId, user])

  // ── Load recent co-sessions ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    supabase
      .from('co_sessions')
      .select('id, duration_minutes, started_at, host_user_id, guest_user_id, status')
      .or(`host_user_id.eq.${user.id},guest_user_id.eq.${user.id}`)
      .eq('status', 'complete')
      .order('ended_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setRecentCoSessions(data) })
  }, [user])

  // ── Load session by ID ────────────────────────────────────────────────────
  const loadSessionById = async (id) => {
    try {
      const fetchFn = loggedFetch || fetch
      const res = await fetchFn(`/api/co-session/status?session_id=${id}`)
      const data = await res.json()
      if (!res.ok || !data.id) return
      setCoSession(data)
      setCoSessionId(data.id)
      if (data.status === 'active') {
        startCoTimer(data)
        setCoPhase('active')
        subscribeToSession(data.id)
      } else if (data.status === 'complete') {
        setCoPhase('complete')
      }
    } catch {}
  }

  // ── Supabase Realtime subscription ───────────────────────────────────────
  const subscribeToSession = (id) => {
    try {
      const channel = supabase
        .channel(`co-session-${id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'co_sessions',
          filter: `id=eq.${id}`,
        }, (payload) => {
          const updated = payload.new
          setCoSession(prev => ({ ...prev, ...updated }))
          if (updated.status === 'complete') {
            clearInterval(coIntervalRef.current)
            clearInterval(pollRef.current)
            setCoPhase('complete')
          } else if (updated.status === 'active' && updated.started_at) {
            startCoTimer(updated)
            setCoPhase('active')
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') return
          // Fallback polling if Realtime unavailable
          startPolling(id)
        })
      realtimeRef.current = channel
    } catch {
      startPolling(id)
    }
  }

  // ── Polling fallback ──────────────────────────────────────────────────────
  const startPolling = (id) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const fetchFn = loggedFetch || fetch
        const res = await fetchFn(`/api/co-session/status?session_id=${id}`)
        if (!res.ok) return
        const data = await res.json()
        setCoSession(prev => ({ ...prev, ...data }))
        if (data.status === 'active' && coPhase === 'waiting') {
          startCoTimer(data)
          setCoPhase('active')
          clearInterval(pollRef.current)
          subscribeToSession(id)
        } else if (data.status === 'complete') {
          clearInterval(pollRef.current)
          clearInterval(coIntervalRef.current)
          setCoPhase('complete')
        }
      } catch {}
    }, 3000)
  }

  // ── Co-session synced timer ───────────────────────────────────────────────
  const startCoTimer = (session) => {
    clearInterval(coIntervalRef.current)
    const totalSecs = (session.duration_minutes || 25) * 60
    const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now()
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000)
      const rem = Math.max(totalSecs - elapsed, 0)
      setCoRemaining(rem)
      if (rem <= 0) {
        clearInterval(coIntervalRef.current)
      }
    }
    tick()
    coIntervalRef.current = setInterval(tick, 1000)
  }

  // ── Solo timer logic (preserved) ─────────────────────────────────────────
  const startSession = () => {
    const secs = dur * 60
    setRemaining(secs)
    setPhase('active')
    setRunning(true)
    setPaused(false)
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); setShowEndModal(true); return 0 }
        return r - 1
      })
    }, 1000)
  }

  const togglePause = () => {
    if (paused) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) { clearInterval(intervalRef.current); setRunning(false); setShowEndModal(true); return 0 }
          return r - 1
        })
      }, 1000)
      setPaused(false); setRunning(true)
    } else {
      clearInterval(intervalRef.current); setPaused(true); setRunning(false)
    }
  }

  const handleGotStuck = () => { clearInterval(intervalRef.current); setRunning(false); setShowStuckModal(true) }

  const returnToIdle = () => {
    setPhase('idle'); setShowEndModal(false); setShowStuckModal(false)
    setRemaining(dur * 60); setPaused(false)
  }

  const handleNailed = async () => {
    setShowXp(true)
    if (topTask && completeTask) completeTask(topTask)
    setTimeout(() => {
      setShowXp(false); returnToIdle()
      const fetchFn = loggedFetch || fetch
      fetchFn('/api/focus/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, duration: dur, outcome: 'nailed', taskId: topTask?.id }),
      }).catch(() => {})
    }, 1300)
  }

  const handleProgress = () => returnToIdle()
  const handleEndStuck = () => { setShowEndModal(false); setShowStuckModal(true) }

  const handleReschedule = async () => {
    if (topTask) {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
      // Client-side: localDateStr reads the device's local wall clock, which
      // IS the user's local day. Avoid UTC-based .split('T')[0] — it shifts
      // the date for anyone west of UTC in the evening.
      const dateStr = localDateStr(tomorrow)
      await supabase.from('tasks').update({ scheduled_for: dateStr }).eq('id', topTask.id)
      if (setTasks) setTasks(prev => prev.map(t => t.id === topTask.id ? { ...t, scheduled_for: dateStr } : t))
    }
    returnToIdle()
  }

  const handleRemove = async () => {
    if (topTask) {
      await supabase.from('tasks').update({ archived: true }).eq('id', topTask.id)
      if (setTasks) setTasks(prev => prev.map(t => t.id === topTask.id ? { ...t, archived: true } : t))
    }
    returnToIdle()
  }

  const handleKeep = () => returnToIdle()

  // ── Invite sheet actions ──────────────────────────────────────────────────
  const searchDebounceRef = useRef(null)
  const handleSearchChange = (val) => {
    setSearchQuery(val)
    setSearchResults([])
    clearTimeout(searchDebounceRef.current)
    if (val.trim().length < 2) return
    setSearchLoading(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const fetchFn = loggedFetch || fetch
        const res = await fetchFn(`/api/co-session/search-users?q=${encodeURIComponent(val.trim())}`)
        const data = await res.json()
        setSearchResults(Array.isArray(data) ? data : [])
      } catch {} finally {
        setSearchLoading(false)
      }
    }, 350)
  }

  const handleSendInvite = async () => {
    if (!selectedUser) return
    const fetchFn = loggedFetch || fetch

    // Create session first
    const createRes = await fetchFn('/api/co-session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: dur, host_task: hostTask }),
    })
    const createData = await createRes.json()
    if (!createRes.ok) { showToast && showToast('Could not create session'); return }

    setCoSessionId(createData.session_id)

    // Send invite
    await fetchFn('/api/co-session/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: createData.session_id, invited_user_id: selectedUser.id }),
    })

    setWaitingFor(selectedUser)
    setCoPhase('waiting')
    startPolling(createData.session_id)
  }

  const handleCreateShareLink = async () => {
    if (shareCode || linkCreating) return
    setLinkCreating(true)
    try {
      const fetchFn = loggedFetch || fetch
      const res = await fetchFn('/api/co-session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: dur, host_task: hostTask }),
      })
      const data = await res.json()
      if (res.ok) {
        setShareCode(data.session_code)
        setShareSessionId(data.session_id)
        setCoSessionId(data.session_id)
        startPolling(data.session_id)
      }
    } catch {} finally {
      setLinkCreating(false)
    }
  }

  const handleCopyLink = () => {
    const url = `https://cinis.app/join/${shareCode}`
    navigator.clipboard.writeText(url).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    })
  }

  // ── Nudge ─────────────────────────────────────────────────────────────────
  const handleNudge = async (message) => {
    if (!coSessionId) return
    try {
      const fetchFn = loggedFetch || fetch
      await fetchFn('/api/co-session/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: coSessionId, message }),
      })
      const partnerName = user?.id === coSession?.host_user_id
        ? coSession?.guest_name
        : coSession?.host_name
      setNudgeConfirm(`Sent to ${partnerName || 'partner'} ✓`)
      setTimeout(() => setNudgeConfirm(''), 2500)
    } catch {}
  }

  // ── End co-session ────────────────────────────────────────────────────────
  const handleEndCoSession = async () => {
    if (!coSessionId) return
    try {
      const fetchFn = loggedFetch || fetch
      await fetchFn('/api/co-session/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: coSessionId }),
      })
    } catch {}
    clearInterval(coIntervalRef.current)
    clearInterval(pollRef.current)
    if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null }
    // Award co-session XP
    setCoPhase('complete')
  }

  const handleStartAnother = () => {
    setCoPhase('invite')
    setShareCode('')
    setShareSessionId(null)
    setSearchQuery('')
    setSearchResults([])
    setHostTask('')
    setWaitingFor(null)
    setNudgeConfirm('')
  }

  const handleCoDone = () => {
    setCoPhase(null)
    setCoSession(null)
    setCoSessionId(null)
    setShareCode('')
    setShareSessionId(null)
    setWaitingFor(null)
    clearInterval(coIntervalRef.current)
    clearInterval(pollRef.current)
    if (realtimeRef.current) { supabase.removeChannel(realtimeRef.current); realtimeRef.current = null }
    // Refresh recent sessions
    if (user) {
      supabase
        .from('co_sessions')
        .select('id, duration_minutes, started_at, host_user_id, guest_user_id, status')
        .or(`host_user_id.eq.${user.id},guest_user_id.eq.${user.id}`)
        .eq('status', 'complete')
        .order('ended_at', { ascending: false })
        .limit(3)
        .then(({ data }) => { if (data) setRecentCoSessions(data) })
    }
  }

  // ── Computed (solo) ───────────────────────────────────────────────────────
  const totalSecs = dur * 60
  const progressPct = totalSecs > 0 ? ((totalSecs - remaining) / totalSecs) * 100 : 0
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const mStr = String(mins).padStart(2, '0')
  const sStr = String(secs).padStart(2, '0')
  const remainLabel = `${mins}:${String(secs).padStart(2, '0')} remaining`

  const todayStr = localDateStr(new Date())
  const todayFocusMinutes = tasks.reduce((sum, t) => {
    if (t.completed && t.completed_at && t.completed_at.slice(0, 10) === todayStr)
      return sum + (t.estimated_minutes || 0)
    return sum
  }, 0)

  const focusStreak = (() => {
    const today = new Date(); let streak = 0
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 86400000)
      const checkStr = localDateStr(checkDate)
      const has = tasks.some(t => t.completed && t.completed_at && t.completed_at.slice(0, 10) === checkStr)
      if (has) streak++; else if (i > 0) break
    }
    return streak
  })()

  const sessionsTotal = profile?.focus_sessions || tasks.filter(t => t.completed).length
  const hasFocusSessions = sessionsTotal > 0
  const workingTask = topTask || tasks.find(t => t.starred && !t.completed && !t.archived) || tasks.find(t => !t.completed && !t.archived)

  // Co-session computed
  const coTotalSecs = (coSession?.duration_minutes || 25) * 60
  const coProgressPct = coTotalSecs > 0 ? ((coTotalSecs - coRemaining) / coTotalSecs) * 100 : 0
  const coMins = Math.floor(coRemaining / 60)
  const coSecs = coRemaining % 60
  const coMStr = String(coMins).padStart(2, '0')
  const coSStr = String(coSecs).padStart(2, '0')
  const isHost = user?.id === coSession?.host_user_id
  const myTask = isHost ? coSession?.host_task : coSession?.guest_task
  const partnerTask = isHost ? coSession?.guest_task : coSession?.host_task
  const myName = profile?.full_name || 'You'
  const partnerName = isHost ? coSession?.guest_name : coSession?.host_name

  // ── CO-SESSION PHASE: INVITE ──────────────────────────────────────────────
  if (coPhase === 'invite') {
    return (
      <div className={styles.wrap}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setCoPhase(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ASH} strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 15, color: ASH }}>Partner up</span>
        </div>

        {/* Duration picker */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Figtree', sans-serif", fontWeight: 600, marginBottom: 8 }}>Duration</div>
          <div className={styles.durRow} style={{ justifyContent: 'flex-start' }}>
            {[5, 15, 25, 45, 60].map(d => (
              <button key={d} onClick={() => setDur(d)} className={`${styles.durPill} ${dur === d ? styles.durPillActive : ''}`}>{d}</button>
            ))}
          </div>
        </div>

        {/* What are you working on */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.28)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Figtree', sans-serif", fontWeight: 600, marginBottom: 6 }}>What you&apos;re working on (optional)</div>
          <input
            value={hostTask}
            onChange={e => setHostTask(e.target.value)}
            placeholder="e.g. Finishing Q2 report"
            style={{ width: '100%', background: CHAR, border: '1px solid rgba(240,234,214,0.10)', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: ASH, fontFamily: "'Figtree', sans-serif", boxSizing: 'border-box', outline: 'none' }}
          />
        </div>

        {/* Section A — Search */}
        <div style={{ background: CHAR, borderRadius: 12, padding: '14px', marginBottom: 12, border: '1px solid rgba(164,123,219,0.12)' }}>
          <div style={{ fontSize: 11, color: PURPLE, fontFamily: "'Figtree', sans-serif", fontWeight: 600, marginBottom: 10 }}>Invite someone</div>
          <input
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by name or email"
            style={{ width: '100%', background: '#2A2218', border: '1px solid rgba(240,234,214,0.08)', borderRadius: 8, padding: '9px 11px', fontSize: 12, color: ASH, fontFamily: "'Figtree', sans-serif", boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
          />
          {searchLoading && (
            <div style={{ fontSize: 11, color: 'rgba(240,234,214,0.30)', padding: '4px 0' }}>Searching…</div>
          )}
          {searchResults.map(u => (
            <div
              key={u.id}
              onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: selectedUser?.id === u.id ? 'rgba(164,123,219,0.12)' : 'transparent', border: selectedUser?.id === u.id ? '1px solid rgba(164,123,219,0.25)' : '1px solid transparent', marginBottom: 4 }}
            >
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(164,123,219,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: PURPLE, fontFamily: "'Sora', sans-serif", flexShrink: 0 }}>
                {initials(u.full_name || u.email)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: ASH, fontFamily: "'Figtree', sans-serif" }}>{u.full_name || '—'}</div>
                <div style={{ fontSize: 10, color: 'rgba(240,234,214,0.35)', fontFamily: "'Figtree', sans-serif" }}>{u.email}</div>
              </div>
              {selectedUser?.id === u.id && (
                <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          ))}
          {selectedUser && (
            <button
              onClick={handleSendInvite}
              style={{ width: '100%', marginTop: 8, background: PURPLE, border: 'none', borderRadius: 9, padding: '11px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              Send invite to {selectedUser.full_name || selectedUser.email}
            </button>
          )}
        </div>

        {/* Section B — Share link */}
        <div style={{ background: CHAR, borderRadius: 12, padding: '14px', border: '1px solid rgba(164,123,219,0.12)' }}>
          <div style={{ fontSize: 11, color: PURPLE, fontFamily: "'Figtree', sans-serif", fontWeight: 600, marginBottom: 10 }}>Or share a link</div>
          {!shareCode && !linkCreating && (
            <button
              onClick={handleCreateShareLink}
              style={{ width: '100%', background: 'rgba(164,123,219,0.12)', border: '1px solid rgba(164,123,219,0.20)', borderRadius: 9, padding: '11px', fontSize: 12, fontWeight: 600, color: PURPLE, cursor: 'pointer' }}
            >
              Generate link
            </button>
          )}
          {linkCreating && (
            <div style={{ fontSize: 11, color: 'rgba(240,234,214,0.35)', textAlign: 'center', padding: '8px 0' }}>Creating session…</div>
          )}
          {shareCode && (
            <>
              <div style={{ background: '#2A2218', border: '1px solid rgba(164,123,219,0.15)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontFamily: "'Sora', sans-serif", fontSize: 18, fontWeight: 700, color: PURPLE, letterSpacing: '0.12em', textAlign: 'center' }}>
                {shareCode}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(240,234,214,0.30)', textAlign: 'center', marginBottom: 8 }}>cinis.app/join/{shareCode}</div>
              <button
                onClick={handleCopyLink}
                style={{ width: '100%', background: codeCopied ? 'rgba(76,175,80,0.15)' : 'rgba(164,123,219,0.12)', border: `1px solid ${codeCopied ? 'rgba(76,175,80,0.25)' : 'rgba(164,123,219,0.20)'}`, borderRadius: 9, padding: '10px', fontSize: 12, fontWeight: 600, color: codeCopied ? GREEN : PURPLE, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                {codeCopied ? 'Copied!' : 'Copy link'}
              </button>
              <div style={{ fontSize: 10, color: 'rgba(240,234,214,0.22)', textAlign: 'center', marginTop: 8 }}>Waiting for partner to join…</div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── CO-SESSION PHASE: WAITING ─────────────────────────────────────────────
  if (coPhase === 'waiting') {
    return (
      <div className={styles.wrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(164,123,219,0.10)', border: '1px solid rgba(164,123,219,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 20 }}>
          ⏳
        </div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 17, color: ASH, marginBottom: 6 }}>
          Waiting for {waitingFor?.full_name || 'your partner'}…
        </div>
        <div style={{ fontSize: 12, color: 'rgba(240,234,214,0.35)', marginBottom: 28, lineHeight: 1.6, maxWidth: 240 }}>
          They&apos;ll get a notification. Session starts when they join.
        </div>
        <button
          onClick={() => { setCoPhase('invite'); clearInterval(pollRef.current) }}
          style={{ background: 'rgba(240,234,214,0.06)', border: '1px solid rgba(240,234,214,0.10)', borderRadius: 9, padding: '10px 20px', fontSize: 12, color: 'rgba(240,234,214,0.40)', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    )
  }

  // ── CO-SESSION PHASE: ACTIVE ──────────────────────────────────────────────
  if (coPhase === 'active') {
    return (
      <div className={styles.activeOverlay}>
        {/* Header */}
        <div className={styles.activeHeader}>
          <span className={styles.headerLabel}>Co-Session</span>
          <span style={{ fontSize: 9, color: PURPLE, background: 'rgba(164,123,219,0.12)', padding: '3px 10px', borderRadius: 10, fontFamily: "'Figtree', sans-serif" }}>● Synced</span>
        </div>

        {/* Timer */}
        <div className={styles.activeTimer}>
          <span className={styles.activeTimerDigits} style={{ color: coRemaining <= 60 ? HOT : ASH }}>
            <span>{coMStr}</span>
            <span className={styles.colonBlink}>:</span>
            <span>{coSStr}</span>
          </span>
          <div className={styles.statusSub}>{coSession?.duration_minutes} min co-session</div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${coProgressPct}%`, background: PURPLE }} />
          </div>
          <div className={styles.progressLabel}>{coMins}:{String(coSecs).padStart(2,'0')} remaining</div>
        </div>

        {/* Both users */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {/* Me */}
          <div style={{ flex: 1, background: CHAR, borderRadius: 10, padding: '12px', border: '1px solid rgba(164,123,219,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: myTask ? 8 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(164,123,219,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: PURPLE, fontFamily: "'Sora', sans-serif", flexShrink: 0 }}>
                {initials(myName)}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: ASH, fontFamily: "'Figtree', sans-serif" }}>{myName}</div>
                <div style={{ fontSize: 9, color: GREEN, fontFamily: "'Figtree', sans-serif" }}>● Focused</div>
              </div>
            </div>
            {myTask && <div style={{ fontSize: 10, color: 'rgba(240,234,214,0.40)', fontFamily: "'Figtree', sans-serif", lineHeight: 1.4 }}>{myTask}</div>}
          </div>

          {/* Synced icon */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3" />
            </svg>
          </div>

          {/* Partner */}
          <div style={{ flex: 1, background: CHAR, borderRadius: 10, padding: '12px', border: '1px solid rgba(164,123,219,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: partnerTask ? 8 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(164,123,219,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: PURPLE, fontFamily: "'Sora', sans-serif", flexShrink: 0 }}>
                {initials(partnerName || '?')}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: ASH, fontFamily: "'Figtree', sans-serif" }}>{partnerName || 'Partner'}</div>
                <div style={{ fontSize: 9, color: GREEN, fontFamily: "'Figtree', sans-serif" }}>● Focused</div>
              </div>
            </div>
            {partnerTask && <div style={{ fontSize: 10, color: 'rgba(240,234,214,0.40)', fontFamily: "'Figtree', sans-serif", lineHeight: 1.4 }}>{partnerTask}</div>}
          </div>
        </div>

        {/* Nudge chips */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.22)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Figtree', sans-serif", fontWeight: 600, marginBottom: 8 }}>Send a nudge</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['Lock in 🔒', 'Almost there 💪', 'Break? ☕', 'Nice 🔥'].map(msg => (
              <button
                key={msg}
                onClick={() => handleNudge(msg)}
                style={{ background: CHAR, border: '1px solid rgba(164,123,219,0.18)', borderRadius: 20, padding: '7px 13px', fontSize: 11, color: ASH, fontFamily: "'Figtree', sans-serif", cursor: 'pointer', transition: 'background 0.15s' }}
              >
                {msg}
              </button>
            ))}
          </div>
          {nudgeConfirm && (
            <div style={{ fontSize: 10, color: GREEN, marginTop: 6, fontFamily: "'Figtree', sans-serif" }}>{nudgeConfirm}</div>
          )}
        </div>

        {/* Controls */}
        <div className={styles.controlsRow}>
          <button className={`${styles.controlBtn} ${styles.pauseBtn}`} style={{ background: 'rgba(164,123,219,0.12)', borderColor: 'rgba(164,123,219,0.25)', color: PURPLE }} onClick={() => {}}>
            Pause
          </button>
          <button className={`${styles.controlBtn} ${styles.stuckBtn}`} onClick={handleEndCoSession}>
            End session
          </button>
        </div>
      </div>
    )
  }

  // ── CO-SESSION PHASE: COMPLETE ────────────────────────────────────────────
  if (coPhase === 'complete') {
    const totalCoMin = coSession?.duration_minutes || 25
    const totalCoSessions = recentCoSessions.length + 1

    return (
      <div className={styles.wrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 20, color: ASH, marginBottom: 6 }}>Session complete</div>
        <div style={{ fontSize: 12, color: 'rgba(240,234,214,0.40)', marginBottom: 28 }}>You and {partnerName || 'your partner'} crushed it.</div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, width: '100%' }}>
          <div style={{ flex: 1, background: CHAR, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: PURPLE }}>{totalCoMin}m</div>
            <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.22)', fontFamily: "'Figtree', sans-serif", marginTop: 2 }}>focused</div>
          </div>
          <div style={{ flex: 1, background: CHAR, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: GREEN }}>+35</div>
            <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.22)', fontFamily: "'Figtree', sans-serif", marginTop: 2 }}>XP earned</div>
          </div>
          <div style={{ flex: 1, background: CHAR, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 20, color: HOT }}>{totalCoSessions}</div>
            <div style={{ fontSize: 9, color: 'rgba(240,234,214,0.22)', fontFamily: "'Figtree', sans-serif", marginTop: 2 }}>co-sessions</div>
          </div>
        </div>

        <button
          onClick={handleStartAnother}
          style={{ width: '100%', background: PURPLE, border: 'none', borderRadius: 11, padding: '14px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: 10 }}
        >
          Start another
        </button>
        <button
          onClick={handleCoDone}
          style={{ width: '100%', background: 'rgba(240,234,214,0.06)', border: '1px solid rgba(240,234,214,0.10)', borderRadius: 11, padding: '13px', fontSize: 13, color: 'rgba(240,234,214,0.40)', cursor: 'pointer' }}
        >
          Done
        </button>
      </div>
    )
  }

  // ── SOLO: EMPTY STATE ─────────────────────────────────────────────────────
  if (phase === 'idle' && !hasFocusSessions) {
    return (
      <div className={styles.wrap} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '100vh' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(59,139,212,0.08)', border: '1px solid rgba(59,139,212,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLORS.blue} strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
          </svg>
        </div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: ASH, marginBottom: 6 }}>No sessions yet.</div>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(240,234,214,0.35)', lineHeight: 1.65, maxWidth: 220, marginBottom: 6 }}>Run your first focus session. Pick a duration and go.</div>
        <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: 'rgba(240,234,214,0.22)', marginBottom: 20 }}>5 minutes counts. Starting is the hardest part.</div>
        <button onClick={() => setDur(5)} style={{ background: 'rgba(59,139,212,0.12)', border: '1px solid rgba(59,139,212,0.25)', borderRadius: 9, padding: '10px 20px', fontSize: 12, fontWeight: 600, color: COLORS.blue, cursor: 'pointer', marginBottom: 30 }}>
          Start a session
        </button>
        <div style={{ fontSize: 11, color: 'rgba(240,234,214,0.22)', marginBottom: 12 }}>Or choose a duration:</div>
        <div className={styles.durRow}>
          {[5, 15, 25, 45, 60].map(d => (
            <button key={d} onClick={() => setDur(d)} className={`${styles.durPill} ${dur === d ? styles.durPillActive : ''}`}>{d}</button>
          ))}
        </div>
      </div>
    )
  }

  // ── SOLO: IDLE STATE ──────────────────────────────────────────────────────
  if (phase === 'idle') {
    return (
      <div className={styles.wrap}>
        <div className={styles.headerLabel}>Focus</div>

        <div className={styles.timerDisplay}>
          <div className={styles.timerValue}>{dur}:00</div>
          <div className={styles.timerSub}>Ready to start</div>
        </div>

        <div className={styles.durRow}>
          {[5, 15, 25, 45, 60].map(d => (
            <button key={d} onClick={() => setDur(d)} className={`${styles.durPill} ${dur === d ? styles.durPillActive : ''}`}>{d}</button>
          ))}
        </div>

        {workingTask && (
          <div className={styles.workingCard}>
            <div style={{ flex: 1 }}>
              <div className={styles.workingLabel}>WORKING ON</div>
              <div className={styles.workingTask}>{workingTask.title}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
        )}

        <button className={styles.startBtn} onClick={startSession}>Start solo focus</button>

        {/* Partner up card */}
        <div className={styles.partnerCard} onClick={() => { setCoPhase('invite'); handleCreateShareLink() }}>
          <div className={styles.partnerIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div className={styles.partnerTitle}>Partner up</div>
            <div className={styles.partnerSub}>Body double with a teammate</div>
          </div>
          <span className={styles.partnerBadge}>Co-session</span>
        </div>

        {/* Recent co-sessions */}
        {recentCoSessions.length > 0 && (
          <>
            <div className={styles.historyLabel} style={{ marginTop: 8 }}>RECENT CO-SESSIONS</div>
            {recentCoSessions.map(s => (
              <div key={s.id} style={{ background: CHAR, borderRadius: 8, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(164,123,219,0.10)' }}>
                <div style={{ fontSize: 12, color: ASH, fontFamily: "'Figtree', sans-serif" }}>
                  {s.duration_minutes} min session
                </div>
                <div style={{ fontSize: 10, color: 'rgba(240,234,214,0.30)', fontFamily: "'Figtree', sans-serif" }}>
                  {s.started_at ? new Date(s.started_at).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Focus history */}
        <div className={styles.historyLabel}>YOUR FOCUS HISTORY</div>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: HOT }}>{todayFocusMinutes > 0 ? `${todayFocusMinutes}m` : '0m'}</div>
            <div className={styles.statLabel}>today</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: GREEN }}>{focusStreak}d</div>
            <div className={styles.statLabel}>streak</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue} style={{ color: COLORS.blue }}>{sessionsTotal}</div>
            <div className={styles.statLabel}>sessions</div>
          </div>
        </div>
      </div>
    )
  }

  // ── SOLO: ACTIVE STATE ────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      {phase === 'active' && (
        <div className={styles.activeOverlay}>
          <div className={styles.activeHeader}>
            <span className={styles.headerLabel}>Focus</span>
            <span className={styles.sessionBadge}>{dur} min session</span>
          </div>

          <div className={styles.activeTimer}>
            <span className={styles.activeTimerDigits}>
              <span>{mStr}</span>
              <span className={`${styles.colonBlink} ${paused ? styles.colonPaused : ''}`}>:</span>
              <span>{sStr}</span>
            </span>
            <div className={styles.statusSub}>{paused ? 'Paused' : 'In session'}</div>
          </div>

          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <div className={styles.progressLabel}>{remainLabel}</div>
          </div>

          {workingTask && (
            <div className={styles.activeWorkingCard}>
              <div className={styles.workingLabel}>WORKING ON</div>
              <div className={styles.workingTask}>{workingTask.title}</div>
            </div>
          )}

          <div className={styles.controlsRow}>
            <button className={`${styles.controlBtn} ${paused ? styles.resumeBtn : styles.pauseBtn}`} onClick={togglePause}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className={`${styles.controlBtn} ${styles.stuckBtn}`} onClick={handleGotStuck}>
              Got stuck
            </button>
          </div>
        </div>
      )}

      {showEndModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle}>Session complete.</div>
            <div className={styles.sheetSub}>{dur} minutes. How did it go?</div>
            <button className={styles.btnNailed} onClick={handleNailed}>
              Nailed it{showXp && <span className={styles.xpPop}>+50 XP</span>}
            </button>
            <button className={styles.btnProgress} onClick={handleProgress}>Made progress</button>
            <button className={styles.btnStuck} onClick={handleEndStuck}>Got stuck</button>
          </div>
        </div>
      )}

      {showStuckModal && (
        <div className={styles.stuckOverlay}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle} style={{ fontSize: 17 }}>What do you want to do?</div>
            <div className={styles.sheetSub}>No judgment — let&rsquo;s figure out next.</div>
            <div className={styles.stuckOptionHot} onClick={handleReschedule}>
              <div className={styles.stuckOptionTitle} style={{ color: HOT }}>Reschedule it</div>
              <div className={styles.stuckOptionSub}>Move to tomorrow</div>
            </div>
            <div className={styles.stuckOptionDefault} onClick={handleRemove}>
              <div className={styles.stuckOptionTitle} style={{ color: 'rgba(240,234,214,0.65)' }}>Remove it</div>
              <div className={styles.stuckOptionSub}>Off the list for now</div>
            </div>
            <div className={styles.stuckOptionDefault} onClick={handleKeep}>
              <div className={styles.stuckOptionTitle} style={{ color: 'rgba(240,234,214,0.4)' }}>Keep it on the list</div>
              <div className={styles.stuckOptionSub}>Stay the course</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
