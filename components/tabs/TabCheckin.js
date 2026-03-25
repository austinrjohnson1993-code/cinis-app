import React, { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { getCheckinType, loadChatHistory, saveChatHistory, EmptyState, SkeletonCard, CINIS_MARK_SVG } from './shared'
import { showToast as libShowToast } from '../../lib/toast'

// ── PERSONA NAMES ────────────────────────────────────────────────────────────
const PERSONA_NAMES = {
  drill_sergeant: 'Drill Sergeant',
  coach: 'Coach',
  thinking_partner: 'Thinking Partner',
  hype_person: 'Hype Person',
  strategist: 'Strategist',
  empath: 'Empath',
}

export default function TabCheckin({ user, profile, tasks, showToast, loggedFetch, fetchTasks, fetchBills, fetchAlarms, billsLoaded }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [checkinMessages, setCheckinMessages] = useState([])
  const [checkinInput, setCheckinInput] = useState('')
  const [checkinLoading, setCheckinLoading] = useState(false)
  const [checkinInitialized, setCheckinInitialized] = useState(false)
  const checkinEndRef = useRef(null)
  const [ciAiRateLocal, setCiAiRateLocal] = useState(null)
  const [ciRateLimitMsg, setCiRateLimitMsg] = useState(null)
  const [ciError, setCiError] = useState(null)
  const [dismissedProactiveBadge, setDismissedProactiveBadge] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const key = `cinis_dismissed_badge_${user?.id}_${new Date().toLocaleDateString('en-CA')}`
      return localStorage.getItem(key) === 'true'
    } catch {
      return false
    }
  })

  // Check-in input ref (for CTA focus)
  const checkinInputRef = useRef(null)

  // Check-in voice input
  const [checkinVoiceListening, setCheckinVoiceListening] = useState(false)
  const checkinVoiceRecognitionRef = useRef(null)
  const checkinVoiceSilenceTimerRef = useRef(null)

  // Next move
  const [nextMoveLoading, setNextMoveLoading] = useState(false)
  const [nextMoveResult, setNextMoveResult] = useState(null) // { raw, taskName, taskId }

  // ── Effects ────────────────────────────────────────────────────────────────

  // Initialize check-in on first open
  useEffect(() => {
    if (!checkinInitialized && user) {
      setCheckinInitialized(true)
      const chatKey = `cinis_checkin_${user.id}`
      const saved = loadChatHistory(chatKey)
      if (saved && saved.length > 0) {
        setCheckinMessages(saved)
        return
      }
      setCheckinLoading(true)
      loggedFetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, checkInType: getCheckinType(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      })
        .then(r => r.json())
        .then(data => {
          if (data.error === 'rate_limit_reached') {
            setCiRateLimitMsg("You've used all your check-ins for today. Upgrade to Pro for more.")
            return
          }
          if (data.message) {
            const msgs = [{ role: 'assistant', content: data.message }]
            setCheckinMessages(msgs)
            saveChatHistory(chatKey, msgs)
            setCiAiRateLocal(prev => (prev ?? (profile?.ai_interactions_today || 0)) + 1)
          }
          fetchTasks(user.id)
        })
        .catch(() => setCheckinMessages([{ role: 'assistant', content: "Hey — how are you doing today?" }]))
        .finally(() => setCheckinLoading(false))
    }
  }, [user])

  // Auto-scroll on new messages
  useEffect(() => {
    checkinEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [checkinMessages, checkinLoading])

  // ── Check-in voice input ───────────────────────────────────────────────────

  const startCheckinVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      libShowToast('Voice input not supported in this browser.', { type: 'error' })
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let isFirstResult = true
    let silenceTimeout

    recognition.onstart = () => setCheckinVoiceListening(true)

    recognition.onresult = (event) => {
      let interimTranscript = ''
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      if (finalTranscript) {
        setCheckinInput(prev => (prev + ' ' + finalTranscript).trim())
        isFirstResult = false
        // Reset silence timer when we get final results
        clearTimeout(silenceTimeout)
        silenceTimeout = setTimeout(() => {
          recognition.stop()
        }, 1500)
      }
    }

    recognition.onerror = () => {
      setCheckinVoiceListening(false)
      libShowToast('Could not hear you. Try again.', { type: 'error' })
    }

    recognition.onend = () => {
      setCheckinVoiceListening(false)
      clearTimeout(silenceTimeout)
    }

    checkinVoiceRecognitionRef.current = recognition
    recognition.start()
  }

  const stopCheckinVoice = () => {
    checkinVoiceRecognitionRef.current?.stop()
  }

  const handleCheckinVoiceClick = () => {
    if (checkinVoiceListening) {
      stopCheckinVoice()
    } else {
      startCheckinVoice()
    }
  }

  // ── Check-in send ──────────────────────────────────────────────────────────

  const sendCheckinMsg = async (text) => {
    if (!text.trim() || checkinLoading || !user) return
    const chatKey = `cinis_checkin_${user.id}`
    const userMsg = { role: 'user', content: text.trim() }
    const updated = [...checkinMessages, userMsg]
    setCheckinMessages(updated)
    setCheckinInput('')
    setCheckinLoading(true)
    setCiError(null)
    setCiRateLimitMsg(null)
    try {
      const res = await loggedFetch('/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, checkInType: getCheckinType(), messages: updated, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      })
      const data = await res.json()
      if (data.error === 'rate_limit_reached') {
        setCiRateLimitMsg("You've used all your check-ins for today. Upgrade to Pro for more.")
      } else if (data.message) {
        setCheckinMessages(prev => {
          const next = [...prev, { role: 'assistant', content: data.message }]
          saveChatHistory(chatKey, next)
          return next
        })
        setCiAiRateLocal(prev => (prev ?? (profile?.ai_interactions_today || 0)) + 1)
      } else {
        saveChatHistory(chatKey, updated)
      }
      fetchTasks(user.id)
      if (billsLoaded) fetchBills(user.id)
      fetchAlarms(user.id)
    } catch {
      setCiError("Something went wrong. Try again.")
    }
    setCheckinLoading(false)
  }

  const sendCheckinMessage = async (e) => {
    e.preventDefault()
    await sendCheckinMsg(checkinInput)
  }

  // ── Next Move ──────────────────────────────────────────────────────────────

  const fetchNextMove = async () => {
    if (!user || nextMoveLoading) return
    setNextMoveLoading(true)
    setNextMoveResult(null)
    try {
      const pending = tasks.filter(t => !t.completed && !t.archived)
      const res = await loggedFetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'NEXT_MOVE_REQUEST',
          tasks: pending,
          userId: user.id,
          checkInType: 'next_move',
        })
      })
      const data = await res.json()
      const raw = data.message || ''
      // Extract bolded task name if present (**task name**)
      const boldMatch = raw.match(/\*\*(.+?)\*\*/)
      const taskName = boldMatch ? boldMatch[1] : null
      // Find matching task id
      const matchedTask = taskName
        ? pending.find(t => t.title.toLowerCase().includes(taskName.toLowerCase()))
        : null
      setNextMoveResult({ raw, taskName, taskId: matchedTask?.id || null })
    } catch {
      setNextMoveResult({ raw: 'Something went wrong. Try again.', taskName: null, taskId: null })
    } finally {
      setNextMoveLoading(false)
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const personaBlend = profile?.persona_blend || []
  const personaLabel = personaBlend.length > 0 ? personaBlend.map(p => PERSONA_NAMES[p] || p).join(' · ') : null
  const primaryPersonaName = personaBlend[0] ? (PERSONA_NAMES[personaBlend[0]] || personaBlend[0]) : 'Coach'

  const aiRate = ciAiRateLocal ?? (profile?.ai_interactions_today || 0)
  const tierLimit = (() => {
    const s = profile?.subscription_status || 'free'
    if (s === 'unlimited') return 40
    if (s === 'pro_sms') return 20
    if (s === 'pro') return 15
    return 5
  })()

  const todayLocalStr = new Date().toLocaleDateString('en-CA')
  const todayTasks = tasks.filter(t => !t.archived && !t.completed && t.scheduled_for && t.scheduled_for.slice(0, 10) === todayLocalStr)
  const overdueTasks = tasks.filter(t => !t.archived && !t.completed && t.scheduled_for && t.scheduled_for.slice(0, 10) < todayLocalStr)

  const lastCheckinAt = profile?.last_checkin_at
  const showProactiveBadge = lastCheckinAt && new Date(lastCheckinAt).toLocaleDateString('en-CA') === todayLocalStr
  const checkinTimeStr = lastCheckinAt ? new Date(lastCheckinAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.ciView}>

      {/* 1 — Context ribbon */}
      <div className={styles.ciRibbonWrap}>
        <span className={styles.ciRibbonLabel}>Cinis {personaLabel ? `· ${personaLabel}` : ''}</span>
        <div className={styles.ciRibbon}>
          <span className={`${styles.ciPill} ${styles.ciPillHot}`} style={{ animationDelay: '0ms' }}>
            {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''}
          </span>
          {overdueTasks.length > 0 && (
            <span className={`${styles.ciPill} ${styles.ciPillEmber}`} style={{ animationDelay: '50ms' }}>
              {overdueTasks.length} overdue
            </span>
          )}
          <span className={`${styles.ciPill} ${styles.ciPillGreen}`} style={{ animationDelay: '100ms' }}>
            🔥 {profile?.current_streak || 0} day{(profile?.current_streak || 0) !== 1 ? 's' : ''}
          </span>
          <span className={`${styles.ciPill} ${styles.ciPillGhost}`} style={{ animationDelay: '150ms' }}>
            {aiRate} / {tierLimit} today
          </span>
        </div>
      </div>

      {/* 2 — Persona badge */}
      <div className={styles.ciPersonaBadgeWrap}>
        {personaLabel
          ? <span className={styles.ciPersonaBadge}>✦ Cinis · {personaLabel}</span>
          : <span className={styles.ciPersonaEmpty}>No persona set — configure in Settings</span>
        }
      </div>

      {/* 3 — Rate counter bar */}
      <div className={styles.ciRateBarTrack}>
        <div className={styles.ciRateBarFill} style={{ width: `${Math.min((aiRate / tierLimit) * 100, 100)}%` }} />
      </div>

      {/* 4 — Proactive check-in badge */}
      {showProactiveBadge && !dismissedProactiveBadge && (
        <div className={styles.ciCheckinBadge}>
          <span className={styles.ciCheckinDot} />
          {getCheckinType() === 'morning' ? 'Morning' : getCheckinType() === 'midday' ? 'Midday' : 'Evening'} check-in · {checkinTimeStr}
          <button
            onClick={() => {
              try {
                const key = `cinis_dismissed_badge_${user.id}_${new Date().toLocaleDateString('en-CA')}`
                localStorage.setItem(key, 'true')
              } catch {}
              setDismissedProactiveBadge(true)
            }}
            className={styles.ciCheckinBadgeClose}
            aria-label="Dismiss check-in badge"
          >
            ✕
          </button>
        </div>
      )}

      {/* 5 — Conversation area */}
      <div className={styles.ciMessages}>
        {checkinLoading && checkinMessages.length === 0 && (
          <><SkeletonCard lines={2} /><SkeletonCard lines={2} /></>
        )}
        {checkinMessages.length === 0 && !checkinLoading && (
          <EmptyState
            useMarkIcon
            headline="Your coach is here."
            subtext="Ask anything, share what's on your plate, or just say you're stuck."
            ctaLabel="Start check-in"
            onCtaClick={() => checkinInputRef.current?.focus()}
          />
        )}
        {checkinMessages.map((msg, i) => (
          <div key={i} className={msg.role === 'assistant' ? styles.ciBubbleWrap : styles.ciBubbleUserWrap}>
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '11px', color: '#FF6644', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cinis</span>
                <span style={{ fontSize: '10px', color: 'rgba(245,240,227,0.35)', marginTop: '2px' }}>· {primaryPersonaName}</span>
              </div>
            )}
            <div className={msg.role === 'assistant' ? styles.ciBubbleAI : styles.ciBubbleUser}>
              {msg.content}
            </div>
          </div>
        ))}
        {checkinLoading && (
          <div className={styles.ciBubbleWrap}>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '6px' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '11px', color: '#FF6644', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cinis</span>
              <span style={{ fontSize: '10px', color: 'rgba(245,240,227,0.35)', marginTop: '2px' }}>· {primaryPersonaName}</span>
            </div>
            <div className={styles.ciBubbleAI}><span className={styles.checkinTyping}>···</span></div>
          </div>
        )}
        <div ref={checkinEndRef} />
      </div>

      {/* Rate limit inline message */}
      {ciRateLimitMsg && (
        <div className={styles.ciRateLimitMsg}>
          {ciRateLimitMsg}{' '}
          <a href="/upgrade" className={styles.ciUpgradeLink}>Upgrade</a>
        </div>
      )}

      {/* Error inline message */}
      {ciError && <div className={styles.ciErrorMsg}>{ciError}</div>}

      {/* 6 — Quick chips */}
      <div className={styles.ciChips}>
        {["What's my next move?", "I'm stuck", "What did I miss?", "Hype me up"].map(chip => (
          <button key={chip} className={styles.ciChip} onClick={() => sendCheckinMsg(chip)}>
            {chip}
          </button>
        ))}
      </div>

      {/* 7 — Input bar */}
      <form onSubmit={sendCheckinMessage} className={styles.ciInputBar}>
        <input
          ref={checkinInputRef}
          type="text"
          placeholder="Message your coach..."
          value={checkinInput}
          onChange={e => setCheckinInput(e.target.value)}
          className={styles.ciInput}
          autoFocus
        />
        {(typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)) && (
          <button
            type="button"
            onClick={handleCheckinVoiceClick}
            disabled={checkinLoading}
            className={styles.ciMicBtn}
            style={{
              background: checkinVoiceListening ? '#FF6644' : 'transparent',
              opacity: checkinLoading ? 0.5 : 1,
              cursor: checkinLoading ? 'not-allowed' : 'pointer'
            }}
            aria-label={checkinVoiceListening ? 'Stop listening' : 'Start voice input'}
            title={checkinVoiceListening ? 'Stop listening' : 'Start voice input'}
          >
            <span style={{
              fontSize: 18,
              lineHeight: 1,
              color: checkinVoiceListening ? '#211A14' : '#F5F0E3',
              animation: checkinVoiceListening ? 'pulse 1.5s infinite' : 'none'
            }}>
              🎤
            </span>
          </button>
        )}
        <button type="submit" disabled={checkinLoading || !checkinInput.trim()} className={styles.ciSendBtn}>
          {checkinLoading
            ? <span className={styles.ciSendSpinner} />
            : <span style={{ fontSize: 18, lineHeight: 1 }}>↑</span>
          }
        </button>
      </form>

      {/* Clear history */}
      {checkinMessages.length > 1 && (
        <button className={styles.clearHistoryBtn} onClick={() => {
          try { localStorage.removeItem(`cinis_checkin_${user.id}`) } catch {}
          setCheckinMessages([])
          setCheckinInitialized(false)
          setCiRateLimitMsg(null)
          setCiError(null)
        }}>Clear history</button>
      )}

    </div>
  )
}
