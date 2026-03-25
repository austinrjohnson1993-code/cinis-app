import React, { useState, useEffect } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { supabase } from '../../lib/supabase'
import { EmptyState, SkeletonCard, localDateStr, todayStr } from './shared'
import { Fire } from '@phosphor-icons/react'

// ── Error State (local) ────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorState}>
      <span style={{ fontSize: 24 }}>&#9888;&#65039;</span>
      <p className={styles.errorMessage}>{message}</p>
      {onRetry && (
        <button className={styles.errorRetryBtn} onClick={onRetry}>Try again</button>
      )}
    </div>
  )
}

export default function TabHabits({ user, profile, showToast, loggedFetch }) {
  // ── Habits state ───────────────────────────────────────────────────────────
  const [habits, setHabits] = useState([])
  const [habitCompletions, setHabitCompletions] = useState([])
  const [habitsLoaded, setHabitsLoaded] = useState(false)
  const [habitsLoading, setHabitsLoading] = useState(false)
  const [habitsError, setHabitsError] = useState(false)

  // Add habit overlay
  const [showAddHabitOverlay, setShowAddHabitOverlay] = useState(false)
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitType, setNewHabitType] = useState('build')
  const [addingHabit, setAddingHabit] = useState(false)

  // Journal (inside habits tab)
  const [habitJournalExpanded, setHabitJournalExpanded] = useState(false)
  const [habitJournalMood, setHabitJournalMood] = useState(null)
  const [habitJournalText, setHabitJournalText] = useState('')
  const [habitJournalSending, setHabitJournalSending] = useState(false)
  const [habitJournalAiReply, setHabitJournalAiReply] = useState(null)

  // Journal entries
  const [journalEntries, setJournalEntries] = useState([])

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchHabits = async (userId) => {
    setHabitsLoaded(true)
    setHabitsLoading(true)
    setHabitsError(false)
    try {
      const res = await loggedFetch(`/api/habits?userId=${userId}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setHabits(data.habits || [])
      setHabitCompletions(data.completions || [])
    } catch {
      setHabitsError(true)
    } finally {
      setHabitsLoading(false)
    }
  }

  const fetchJournalEntries = async (userId) => {
    const { data } = await supabase
      .from('journal_entries').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5)
    setJournalEntries(data || [])
  }

  useEffect(() => {
    if (user && !habitsLoaded) {
      fetchHabits(user.id)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchJournalEntries(user.id)
    }
  }, [user])

  // ── Computed values ────────────────────────────────────────────────────────
  const todayDateStr = todayStr()

  const completedTodayIds = new Set(
    habitCompletions
      .filter(c => c.completed_at && c.completed_at.slice(0, 10) === todayDateStr)
      .map(c => c.habit_id)
  )

  const journaledToday = journalEntries.some(
    e => e.created_at && e.created_at.slice(0, 10) === todayDateStr
  )

  const progressNumer = completedTodayIds.size + (journaledToday ? 1 : 0)
  const progressDenom = habits.length + 1
  const progressPct = progressDenom > 0 ? Math.round((progressNumer / progressDenom) * 100) : 0

  // 7-day heat strip helpers
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return localDateStr(d)
  })

  function getHabitHeat(habitId) {
    return last7.map(dateStr =>
      habitCompletions.some(c => c.habit_id === habitId && c.completed_at && c.completed_at.slice(0, 10) === dateStr)
    )
  }

  function getHabitStreak(habitId) {
    let streak = 0
    for (let i = 0; i < 60; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = localDateStr(d)
      const done = habitCompletions.some(c => c.habit_id === habitId && c.completed_at && c.completed_at.slice(0, 10) === dateStr)
      if (done) { streak++ }
      else if (i > 0) break
    }
    return streak
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  const toggleHabit = async (habitId) => {
    const isCompleted = completedTodayIds.has(habitId)
    // Optimistic update
    if (isCompleted) {
      setHabitCompletions(prev => prev.filter(c =>
        !(c.habit_id === habitId && c.completed_at && c.completed_at.slice(0, 10) === todayDateStr)
      ))
    } else {
      setHabitCompletions(prev => [...prev, { habit_id: habitId, user_id: user.id, completed_at: new Date().toISOString() }])
    }
    try {
      await loggedFetch('/api/habits/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, habitId, date: todayDateStr })
      })
    } catch {
      // Revert on error
      if (isCompleted) {
        setHabitCompletions(prev => [...prev, { habit_id: habitId, user_id: user.id, completed_at: new Date().toISOString() }])
      } else {
        setHabitCompletions(prev => prev.filter(c =>
          !(c.habit_id === habitId && c.completed_at && c.completed_at.slice(0, 10) === todayDateStr)
        ))
      }
    }
  }

  const deleteHabit = async (habitId) => {
    setHabits(prev => prev.filter(h => h.id !== habitId))
    await loggedFetch(`/api/habits?userId=${user.id}&habitId=${habitId}`, { method: 'DELETE' })
  }

  const sendHabitJournal = async () => {
    if (!habitJournalText.trim()) return
    setHabitJournalSending(true)
    try {
      const moodPrefix = habitJournalMood ? `Mood: ${habitJournalMood}\n\n` : ''
      const res = await loggedFetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: moodPrefix + habitJournalText.trim(),
          conversationHistory: [],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
      })
      const data = await res.json()
      if (data.message) {
        setHabitJournalAiReply(data.message)
        setHabitJournalText('')
        fetchJournalEntries(user.id)
      }
    } catch {}
    setHabitJournalSending(false)
  }

  const addHabit = async () => {
    if (!newHabitName.trim() || addingHabit) return
    setAddingHabit(true)
    try {
      const res = await loggedFetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, name: newHabitName.trim(), habit_type: newHabitType })
      })
      const data = await res.json()
      if (data.habit) {
        setHabits(prev => [...prev, data.habit])
        setNewHabitName('')
        setNewHabitType('build')
        setShowAddHabitOverlay(false)
      }
    } catch {}
    setAddingHabit(false)
  }

  // ── Constants ──────────────────────────────────────────────────────────────
  const MOOD_EMOJIS = ['😤', '😔', '😐', '🙂', '😄']
  const PROMPT_CHIPS = ["What's on my mind", 'What went well', 'What was hard', 'What I need tomorrow']

  // ── Render ─────────────────────────────────────────────────────────────────
  if (habitsLoading) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', overflowY: 'auto', minHeight: '100%' }}>
      <SkeletonCard lines={2} showAvatar />
      <SkeletonCard lines={2} showAvatar />
    </div>
  )
  if (habitsError) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60%' }}>
      <ErrorState message="Couldn't load your data." onRetry={() => { setHabitsError(false); fetchHabits(user.id) }} />
    </div>
  )

  return (
    <>
      <div className={styles.view}>
        {/* Header */}
        <div className={styles.habitsViewHeader}>
          <h1 className={styles.greetingText} style={{ marginBottom: 0 }}>Habits</h1>
          <button className={styles.habitsAddBtn} onClick={() => setShowAddHabitOverlay(true)}>+ Add</button>
        </div>

        {/* Progress bar */}
        <div className={styles.habitsProgressWrap}>
          <div className={styles.habitsProgressMeta}>
            <span className={styles.habitsProgressLabel}>Today&apos;s progress</span>
            <span className={styles.habitsProgressPct}>{progressPct}%</span>
          </div>
          <div className={styles.habitsProgressTrack}>
            <div className={styles.habitsProgressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Journal card */}
        <div className={styles.habitsJournalCard}>
          <button
            className={styles.habitsJournalToggle}
            onClick={() => setHabitJournalExpanded(e => !e)}
          >
            <div className={styles.habitsJournalLeft}>
              <span className={styles.habitsJournalIcon}>📔</span>
              <div>
                <div className={styles.habitsJournalTitle}>Daily Journal</div>
                <div className={styles.habitsJournalSub}>
                  {journaledToday ? 'Entry saved today ✓' : 'Write today\'s entry'}
                </div>
              </div>
            </div>
            <span className={styles.habitsJournalChevron} style={{ transform: habitJournalExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>

          {habitJournalExpanded && (
            <div className={styles.habitsJournalBody}>
              {/* Mood picker */}
              <div className={styles.habitsMoodRow}>
                {MOOD_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    className={`${styles.habitsMoodBtn} ${habitJournalMood === emoji ? styles.habitsMoodBtnActive : ''}`}
                    onClick={() => setHabitJournalMood(m => m === emoji ? null : emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Prompt chips — show only when textarea is empty */}
              {!habitJournalText && (
                <div className={styles.habitsPromptChips}>
                  {PROMPT_CHIPS.map(p => (
                    <button key={p} className={styles.habitsPromptChip} onClick={() => setHabitJournalText(p + ': ')}>
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea
                className={styles.habitsJournalTextarea}
                placeholder="What's on your mind today?"
                value={habitJournalText}
                onChange={e => setHabitJournalText(e.target.value)}
                rows={3}
              />

              {/* AI reply */}
              {habitJournalAiReply && (
                <div className={styles.habitsJournalAiReply}>
                  <span className={styles.habitsJournalAiLabel}>YOUR COACH</span>
                  <p>{habitJournalAiReply}</p>
                </div>
              )}

              <button
                className={styles.habitsJournalSendBtn}
                onClick={sendHabitJournal}
                disabled={habitJournalSending || !habitJournalText.trim()}
              >
                {habitJournalSending ? 'Thinking…' : 'Save entry'}
              </button>

              {/* Recent entries */}
              {journalEntries.length > 0 && (
                <div className={styles.habitsRecentEntries}>
                  <div className={styles.habitsRecentLabel}>Recent entries</div>
                  {journalEntries.slice(0, 3).map(entry => (
                    <div key={entry.id} className={styles.habitsRecentEntry}>
                      <span className={styles.habitsRecentDate}>
                        {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {entry.mood && <span className={styles.habitsRecentMood}>{entry.mood}</span>}
                      <span className={styles.habitsRecentSnippet}>
                        {(entry.content || '').slice(0, 80)}{(entry.content || '').length > 80 ? '…' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Habits list */}
        {habitsLoaded && habits.length === 0 ? (
          <EmptyState
            customIcon={<Fire size={32} weight="fill" color="#FF6644" />}
            headline="Build your first habit"
            subtext="Small streaks compound. Start with one."
            ctaLabel="+ Add habit"
            onCtaClick={() => setShowAddHabitOverlay(true)}
          />
        ) : (
          <div className={styles.habitsList}>
            {habits.map(habit => {
              const done = completedTodayIds.has(habit.id)
              const heat = getHabitHeat(habit.id)
              const streak = getHabitStreak(habit.id)
              const isBreak = habit.habit_type === 'break'
              return (
                <div key={habit.id} className={`${styles.habitCard} ${done ? styles.habitCardDone : ''}`}>
                  <button
                    className={`${styles.habitCheck} ${done ? styles.habitCheckDone : ''}`}
                    onClick={() => toggleHabit(habit.id)}
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {done && '✓'}
                  </button>
                  <div className={styles.habitInfo}>
                    <div className={styles.habitNameRow}>
                      <span className={styles.habitColorDot} style={{ background: isBreak ? '#FF5252' : '#4CAF50' }} />
                      <span className={styles.habitName}>{habit.name}</span>
                      <span className={`${styles.habitTypeBadge} ${isBreak ? styles.habitTypeBadgeBreak : styles.habitTypeBadgeBuild}`}>
                        {isBreak ? 'break' : 'build'}
                      </span>
                    </div>
                    <div className={styles.habitHeatRow}>
                      {heat.map((filled, i) => (
                        <div key={i} className={`${styles.habitHeatDot} ${filled ? styles.habitHeatDotFilled : ''}`} />
                      ))}
                      {streak > 0 && (
                        <span className={styles.habitStreak}>🔥 {streak}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className={styles.habitDeleteBtn}
                    onClick={() => deleteHabit(habit.id)}
                    aria-label="Remove habit"
                  >×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ADD HABIT OVERLAY */}
      {showAddHabitOverlay && (
        <div className={styles.habitsOverlayBg} onClick={e => e.target === e.currentTarget && setShowAddHabitOverlay(false)}>
          <div className={styles.habitsOverlaySheet}>
            <div className={styles.habitsOverlayHeader}>
              <span className={styles.habitsOverlayTitle}>New Habit</span>
              <button className={styles.habitsOverlayClose} onClick={() => setShowAddHabitOverlay(false)}>×</button>
            </div>
            <div className={styles.habitsOverlayBody}>
              <div className={styles.habitsField}>
                <label className={styles.habitsFieldLabel}>Habit name</label>
                <input
                  className={styles.habitsFieldInput}
                  placeholder="e.g. Drink 8 glasses of water"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && newHabitName.trim() && !addingHabit) {
                      await addHabit()
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className={styles.habitsField}>
                <label className={styles.habitsFieldLabel}>Type</label>
                <div className={styles.habitsTypeRow}>
                  <button
                    className={`${styles.habitsTypeBtn} ${newHabitType === 'build' ? styles.habitsTypeBtnBuildActive : ''}`}
                    onClick={() => setNewHabitType('build')}
                  >🌱 Build</button>
                  <button
                    className={`${styles.habitsTypeBtn} ${newHabitType === 'break' ? styles.habitsTypeBtnBreakActive : ''}`}
                    onClick={() => setNewHabitType('break')}
                  >⛔ Break</button>
                </div>
              </div>
              <button
                className={styles.habitsOverlaySubmit}
                disabled={addingHabit || !newHabitName.trim()}
                onClick={addHabit}
              >
                {addingHabit ? 'Adding…' : 'Add habit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
