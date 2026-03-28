import React, { useState, useEffect, useRef, useCallback } from 'react'
import { getCheckinType, loadChatHistory, saveChatHistory } from './shared'
import CinisMark from '../../lib/CinisMark'
import styles from '../../styles/TabCheckin.module.css'

/* ── Persona display map ────────────────────────────────────────────────── */
const PERSONA_MAP = {
  strategist: 'Coach \u00B7 Strategist',
  drill_sergeant: 'Coach \u00B7 Drill Sergeant',
  drill: 'Coach \u00B7 Drill Sergeant',
  hype_person: 'Coach \u00B7 Hype',
  hype: 'Coach \u00B7 Hype',
  empath: 'Coach \u00B7 Empath',
  thinking_partner: 'Coach \u00B7 Thinking Partner',
  coach: 'Coach \u00B7 Thinking Partner',
}

const CHIPS = ["What should I do next?", "Prioritize my list", "I'm stuck"]

const isPast = (dateStr) => {
  if (!dateStr) return false
  const d = new Date(dateStr); const now = new Date()
  now.setHours(0,0,0,0); d.setHours(0,0,0,0)
  return d < now
}

export default function TabCheckin({ user, profile, tasks = [], showToast, loggedFetch }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [addedTasks, setAddedTasks] = useState({}) // taskIdx → 'added' | 'faded'
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load history
  useEffect(() => {
    if (!user) return
    const chatKey = `cinis_checkin_${user.id}`
    const saved = loadChatHistory(chatKey)
    if (saved && saved.length > 0) setMessages(saved)
  }, [user])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ──────────────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    if (!text.trim() || sending) return
    const userMsg = { role: 'user', content: text.trim(), time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setSending(true)
    const chatKey = `cinis_checkin_${user.id}`

    try {
      const fetchFn = loggedFetch || fetch
      const res = await fetchFn('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          checkInType: getCheckinType(),
          messages: updated,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = await res.json()
      if (data.error === 'rate_limit_reached') {
        setMessages(p => [...p, { role: 'assistant', content: "You've hit your daily limit. Upgrade to Pro for more.", time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }])
      } else if (data.message) {
        const aiMsg = { role: 'assistant', content: data.message, tasks: data.tasks, time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) }
        const final = [...updated, aiMsg]
        setMessages(final)
        saveChatHistory(chatKey, final)
      }
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Something went wrong. Try again.', time: '' }])
    }
    setSending(false)
  }, [messages, sending, user, loggedFetch])

  const handleChipClick = (text) => {
    setInput(text)
    inputRef.current?.focus()
  }

  const handleAddTask = async (taskTitle, msgIdx, taskIdx) => {
    const key = `${msgIdx}-${taskIdx}`
    if (addedTasks[key]) return
    try {
      const fetchFn = loggedFetch || fetch
      await fetchFn('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, title: taskTitle }),
      })
      setAddedTasks(prev => ({ ...prev, [key]: 'added' }))
      setTimeout(() => setAddedTasks(prev => ({ ...prev, [key]: 'faded' })), 800)
    } catch {
      showToast?.('Could not add task')
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const personaBlend = profile?.persona_blend || []
  const topPersona = personaBlend[0] || 'coach'
  const personaLabel = PERSONA_MAP[topPersona] || 'Coach \u00B7 Thinking Partner'

  const activeTasks = tasks.filter(t => !t.completed && !t.archived)
  const overdueTasks = tasks.filter(t => !t.completed && !t.archived && isPast(t.scheduled_for))

  const sessionType = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Morning check-in'
    if (h < 17) return 'Afternoon check-in'
    return 'Evening check-in'
  })()

  return (
    <div className={styles.wrap}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <span className={styles.headerTitle}>Check-in</span>
          <div className={styles.personaBadge}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="#FF6644"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" /></svg>
            <span className={styles.personaLabel}>{personaLabel}</span>
          </div>
        </div>

        <div className={styles.contextPills}>
          <span className={styles.pillHot}>{activeTasks.length} tasks</span>
          {overdueTasks.length > 0 && <span className={styles.pillEmber}>{overdueTasks.length} overdue</span>}
          <span className={styles.pillGreen}>{profile?.current_streak || 0}d streak</span>
          <span className={styles.pillGhost}>{profile?.ai_interactions_today || 0}/5 AI</span>
        </div>

        <div className={styles.divider} />
      </div>

      {/* ── Thread ──────────────────────────────────────────────────── */}
      <div className={styles.thread}>
        {messages.length === 0 && (
          <>
            <div className={styles.sessionPillWrap}>
              <div className={styles.sessionPill}>
                <div className={styles.sessionDot} />
                <span className={styles.sessionLabel}>{sessionType} &middot; {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
            </div>
            <div className={styles.emptyState}>Your coach is ready.<br />What&rsquo;s on your mind?</div>
          </>
        )}

        {messages.map((m, i) => m.role === 'assistant' ? (
          <div key={i} className={styles.aiMsg}>
            <div className={styles.aiRow}>
              <div className={styles.avatar}>
                <CinisMark size={14} />
              </div>
              <div className={styles.aiContent}>
                <div className={styles.aiBubble}>{m.content}</div>
                {m.tasks && m.tasks.map((t, ti) => {
                  const key = `${i}-${ti}`
                  const state = addedTasks[key]
                  return (
                    <div key={ti} className={`${styles.taskSuggestion} ${state === 'faded' ? styles.taskFaded : ''}`}>
                      <span className={styles.taskText}>{t}</span>
                      <button
                        className={state ? styles.taskAdded : styles.taskAddBtn}
                        onClick={() => handleAddTask(t, i, ti)}
                        disabled={!!state}
                      >
                        {state ? 'Added \u2713' : 'Add'}
                      </button>
                    </div>
                  )
                })}
                <div className={styles.msgTime}>{m.time}</div>
              </div>
            </div>
          </div>
        ) : (
          <div key={i} className={styles.userMsg}>
            <div className={styles.userInner}>
              <div className={styles.userBubble}>{m.content}</div>
              <div className={styles.userTime}>{m.time}</div>
            </div>
          </div>
        ))}

        {sending && (
          <div className={styles.aiMsg}>
            <div className={styles.aiRow}>
              <div className={styles.avatar}>
                <CinisMark size={14} />
              </div>
              <div className={styles.aiBubble}>
                <div className={styles.typingDots}>
                  <div className={styles.dot} />
                  <div className={`${styles.dot} ${styles.dot2}`} />
                  <div className={`${styles.dot} ${styles.dot3}`} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <div className={styles.footer}>
        <div className={styles.chips}>
          {CHIPS.map((ch, i) => (
            <button key={i} className={styles.chip} onClick={() => handleChipClick(ch)}>{ch}</button>
          ))}
        </div>
        <div className={styles.inputRow}>
          <div className={styles.inputWrap}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Message..."
            />
          </div>
          <button
            className={`${styles.sendBtn} ${input.trim() ? styles.sendActive : styles.sendInactive}`}
            onClick={() => send(input)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F0EAD6" strokeWidth="2" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
