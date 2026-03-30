import React, { useState, useEffect, useRef } from 'react'
import { formatTimer, localDateStr } from './shared'
import { supabase } from '../../lib/supabase'
import styles from '../../styles/TabFocus.module.css'

export default function TabFocus({
  user, profile, tasks = [], setTasks, showToast, loggedFetch, switchTab,
  topTask, completeTask, archiveTask,
}) {
  // ── State ────────────────────────────────────────────────────────────────
  const [dur, setDur] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState('idle') // 'idle' | 'active'
  const [showEndModal, setShowEndModal] = useState(false)
  const [showStuckModal, setShowStuckModal] = useState(false)
  const [showXp, setShowXp] = useState(false)
  const intervalRef = useRef(null)

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => clearInterval(intervalRef.current), [])

  // ── Timer logic ──────────────────────────────────────────────────────────
  const startSession = () => {
    const secs = dur * 60
    setRemaining(secs)
    setPhase('active')
    setRunning(true)
    setPaused(false)
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          setShowEndModal(true)
          return 0
        }
        return r - 1
      })
    }, 1000)
  }

  const togglePause = () => {
    if (paused) {
      // Resume
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            setShowEndModal(true)
            return 0
          }
          return r - 1
        })
      }, 1000)
      setPaused(false)
      setRunning(true)
    } else {
      // Pause
      clearInterval(intervalRef.current)
      setPaused(true)
      setRunning(false)
    }
  }

  const handleGotStuck = () => {
    clearInterval(intervalRef.current)
    setRunning(false)
    setShowStuckModal(true)
  }

  const returnToIdle = () => {
    setPhase('idle')
    setShowEndModal(false)
    setShowStuckModal(false)
    setRemaining(dur * 60)
    setPaused(false)
  }

  // ── End modal handlers ───────────────────────────────────────────────────
  const handleNailed = async () => {
    setShowXp(true)
    if (topTask && completeTask) completeTask(topTask)
    setTimeout(() => {
      setShowXp(false)
      returnToIdle()
      // POST session
      const fetchFn = loggedFetch || fetch
      fetchFn('/api/focus/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, duration: dur, outcome: 'nailed', taskId: topTask?.id }),
      }).catch(() => {})
    }, 1300)
  }

  const handleProgress = () => returnToIdle()

  const handleEndStuck = () => {
    setShowEndModal(false)
    setShowStuckModal(true)
  }

  // ── Stuck modal handlers ─────────────────────────────────────────────────
  const handleReschedule = async () => {
    if (topTask) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
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

  // ── Computed ─────────────────────────────────────────────────────────────
  const totalSecs = dur * 60
  const progressPct = totalSecs > 0 ? ((totalSecs - remaining) / totalSecs) * 100 : 0
  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const mStr = String(mins).padStart(2, '0')
  const sStr = String(secs).padStart(2, '0')
  const remainLabel = `${mins}:${sStr} remaining`

  const todayStr = localDateStr(new Date())
  const todayFocusMinutes = tasks.reduce((sum, t) => {
    if (t.completed && t.completed_at && t.completed_at.slice(0, 10) === todayStr) {
      return sum + (t.estimated_minutes || 0)
    }
    return sum
  }, 0)

  const focusStreak = (() => {
    const today = new Date()
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today.getTime() - i * 86400000)
      const checkStr = localDateStr(checkDate)
      const has = tasks.some(t => t.completed && t.completed_at && t.completed_at.slice(0, 10) === checkStr)
      if (has) streak++
      else if (i > 0) break
    }
    return streak
  })()

  const sessionsTotal = profile?.focus_sessions || tasks.filter(t => t.completed).length

  // Working on task
  const workingTask = topTask || tasks.find(t => t.starred && !t.completed && !t.archived) || tasks.find(t => !t.completed && !t.archived)

  // Check if there are any focus sessions (empty state trigger)
  const hasFocusSessions = sessionsTotal > 0

  return (
    <div className={styles.wrap}>
      {/* ── EMPTY STATE ──────────────────────────────────────────────── */}
      {phase === 'idle' && !hasFocusSessions && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center', minHeight: '100vh' }}>
          {/* Icon circle */}
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(59,139,212,0.08)', border: '1px solid rgba(59,139,212,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B8BD4" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          {/* Heading */}
          <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: 16, color: '#F0EAD6', marginBottom: 6 }}>
            No sessions yet.
          </div>
          {/* Body */}
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 12, color: 'rgba(240,234,214,0.35)', lineHeight: 1.65, maxWidth: 220, marginBottom: 6 }}>
            Run your first focus session. Pick a duration and go.
          </div>
          {/* Sub-line */}
          <div style={{ fontFamily: "'Figtree', sans-serif", fontSize: 11, color: 'rgba(240,234,214,0.22)', marginBottom: 20 }}>
            5 minutes counts. Starting is the hardest part.
          </div>
          {/* CTA button */}
          <button onClick={() => setDur(5)} style={{ background: 'rgba(59,139,212,0.12)', border: '1px solid rgba(59,139,212,0.25)', borderRadius: 9, padding: '10px 20px', fontSize: 12, fontWeight: 600, color: '#3B8BD4', cursor: 'pointer', marginBottom: 30 }}>
            Start a session
          </button>

          {/* Show duration pills as secondary action */}
          <div style={{ fontSize: 11, color: 'rgba(240,234,214,0.22)', marginBottom: 12 }}>Or choose a duration:</div>
          <div className={styles.durRow}>
            {[5, 15, 25, 45, 60].map(d => (
              <button key={d} onClick={() => setDur(d)}
                className={`${styles.durPill} ${dur === d ? styles.durPillActive : ''}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── IDLE STATE ─────────────────────────────────────────────── */}
      {phase === 'idle' && hasFocusSessions && (
        <>
          <div className={styles.headerLabel}>Focus</div>

          <div className={styles.timerDisplay}>
            <div className={styles.timerValue}>{dur}:00</div>
            <div className={styles.timerSub}>Ready to start</div>
          </div>

          <div className={styles.durRow}>
            {[5, 15, 25, 45, 60].map(d => (
              <button key={d} onClick={() => setDur(d)}
                className={`${styles.durPill} ${dur === d ? styles.durPillActive : ''}`}>
                {d}
              </button>
            ))}
          </div>

          {/* Working on card */}
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

          <button className={styles.startBtn} onClick={startSession}>Start focus</button>

          {/* Partner up card */}
          <div className={styles.partnerCard}>
            <div className={styles.partnerIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A47BDB" strokeWidth="2" strokeLinecap="round">
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
            <span className={styles.partnerBadge}>2 online</span>
          </div>

          {/* Focus history */}
          <div className={styles.historyLabel}>YOUR FOCUS HISTORY</div>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: '#FF6644' }}>{todayFocusMinutes > 0 ? `${todayFocusMinutes}m` : '0m'}</div>
              <div className={styles.statLabel}>today</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: '#4CAF50' }}>{focusStreak}d</div>
              <div className={styles.statLabel}>streak</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: '#3B8BD4' }}>{sessionsTotal}</div>
              <div className={styles.statLabel}>sessions</div>
            </div>
          </div>
        </>
      )}

      {/* ── ACTIVE STATE ───────────────────────────────────────────── */}
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

          {/* Progress bar */}
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <div className={styles.progressLabel}>{remainLabel}</div>
          </div>

          {/* Working on */}
          {workingTask && (
            <div className={styles.activeWorkingCard}>
              <div className={styles.workingLabel}>WORKING ON</div>
              <div className={styles.workingTask}>{workingTask.title}</div>
            </div>
          )}

          {/* Controls */}
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

      {/* ── SESSION END MODAL ──────────────────────────────────────── */}
      {showEndModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle}>Session complete.</div>
            <div className={styles.sheetSub}>{dur} minutes. How did it go?</div>

            <button className={styles.btnNailed} onClick={handleNailed}>
              Nailed it
              {showXp && <span className={styles.xpPop}>+50 XP</span>}
            </button>
            <button className={styles.btnProgress} onClick={handleProgress}>Made progress</button>
            <button className={styles.btnStuck} onClick={handleEndStuck}>Got stuck</button>
          </div>
        </div>
      )}

      {/* ── GOT STUCK MODAL ────────────────────────────────────────── */}
      {showStuckModal && (
        <div className={styles.stuckOverlay}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetTitle} style={{ fontSize: 17 }}>What do you want to do?</div>
            <div className={styles.sheetSub}>No judgment — let&rsquo;s figure out next.</div>

            <div className={styles.stuckOptionHot} onClick={handleReschedule}>
              <div className={styles.stuckOptionTitle} style={{ color: '#FF6644' }}>Reschedule it</div>
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
