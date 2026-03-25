import React, { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { formatTimer, localDateStr, useCountdown, sortBySchedule, TabErrorBoundary } from './shared'
import { supabase } from '../../lib/supabase'
import { CaretDown } from '@phosphor-icons/react'

export default function TabFocus({
  user,
  profile,
  tasks,
  setTasks,
  showToast,
  loggedFetch,
  switchTab,
  topTask,
  focusLabel,
  topTaskCountdown,
  completeTask,
  archiveTask,
  setShowAddModal,
  setDetailTask,
  openDetailEdit,
}) {
  // ── Focus state ──────────────────────────────────────────────────────────
  const [focusPhase, setFocusPhase] = useState('setup') // setup | active | complete | stuck
  const [focusDuration, setFocusDuration] = useState(25)
  const [focusCustom, setFocusCustom] = useState('')
  const [focusTimeLeft, setFocusTimeLeft] = useState(0)
  const [focusRunning, setFocusRunning] = useState(false)
  const [focusAiResponse, setFocusAiResponse] = useState('')
  const [focusAiLoading, setFocusAiLoading] = useState(false)
  const focusIntervalRef = useRef(null)

  // Session end + stuck modals
  const [showSessionEndModal, setShowSessionEndModal] = useState(false)
  const [sessionEndType, setSessionEndType] = useState('complete') // 'complete' | 'abandoned'
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false)
  const [showStuckModal, setShowStuckModal] = useState(false)
  const [stuckConfirmRemove, setStuckConfirmRemove] = useState(false)
  const [stuckTask, setStuckTask] = useState(null)

  // Focus accordion section
  const [focusSection, setFocusSection] = useState('session')

  // ── Cleanup timer on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(focusIntervalRef.current)
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const startFocus = () => {
    const dur = focusCustom ? parseInt(focusCustom) : focusDuration
    if (!dur || dur < 1) return
    const secs = dur * 60
    setFocusTimeLeft(secs); setFocusPhase('active'); setFocusRunning(true)
    focusIntervalRef.current = setInterval(() => {
      setFocusTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(focusIntervalRef.current)
          setFocusRunning(false); setFocusPhase('setup')
          setSessionEndType('complete'); setShowSessionEndModal(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const toggleFocusPause = () => {
    if (focusRunning) {
      clearInterval(focusIntervalRef.current); setFocusRunning(false)
    } else {
      focusIntervalRef.current = setInterval(() => {
        setFocusTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(focusIntervalRef.current)
            setFocusRunning(false); setFocusPhase('setup')
            setSessionEndType('complete'); setShowSessionEndModal(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setFocusRunning(true)
    }
  }

  const handleFocusResult = async (result) => {
    const dur = focusCustom ? parseInt(focusCustom) : focusDuration
    setShowSessionEndModal(false)
    if (result === 'complete') {
      if (topTask) completeTask(topTask)
      setFocusPhase('setup'); setFocusCustom('')
      showToast('Task complete ✓')
    } else if (result === 'progress') {
      if (topTask) {
        await supabase.from('tasks').update({ notes: 'In progress' }).eq('id', topTask.id)
        setTasks(prev => prev.map(t => t.id === topTask.id ? { ...t, notes: 'In progress' } : t))
      }
      setFocusPhase('setup'); setFocusCustom('')
    } else if (result === 'stuck') {
      setFocusPhase('stuck'); setFocusAiLoading(true)
      switchTab('checkin')
      try {
        const res = await loggedFetch('/api/focus', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, outcome: 'stuck', taskTitle: topTask?.title, focusDuration: dur })
        })
        const data = await res.json()
        setFocusAiResponse(data.message || "What felt hardest about starting that?")
      } catch {
        setFocusAiResponse("What felt hardest about starting that?")
      }
      setFocusAiLoading(false)
    }
  }

  const handleAbandonSession = () => {
    setShowAbandonConfirm(true)
  }

  const confirmAbandon = () => {
    setShowAbandonConfirm(false)
    clearInterval(focusIntervalRef.current)
    setFocusRunning(false)
    setFocusPhase('setup')
    setSessionEndType('abandoned')
    setShowSessionEndModal(true)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <TabErrorBoundary tabName="Focus">
      <div className={styles.focusView}>
        <div className={styles.focusAccordion}>

          {/* ── ⏱ SESSION — always expanded ── */}
          <div className={`${styles.focusAccordionCard} ${styles.focusAccordionCardOpen}`}>
            <div className={styles.focusAccordionHeader}>
              <span className={styles.focusAccordionEmoji}>⏱</span>
              <span className={styles.focusAccordionTitle}>Session</span>
            </div>
            {(
              <div className={styles.focusAccordionContent}>
                {focusPhase === 'setup' && (
                  <div className={styles.focusSetup}>
                    {!topTask ? (
                      <div className={styles.focusIdleEmpty}>
                        <p className={styles.focusIdleHeadline}>Ready to lock in?</p>
                        <p className={styles.focusIdleSub}>Pick a task, set your timer, and get into flow.</p>
                        <button onClick={() => switchTab('tasks')} className={styles.focusStartBtn}>Pick a Task →</button>
                        <button onClick={() => setShowAddModal(true)} className={styles.focusIdleAddLink}>or add a new task</button>
                      </div>
                    ) : (
                      <>
                        <p className={styles.focusSetupLabel}>{focusLabel}</p>
                        <h2 className={styles.focusSetupTask}>{topTask.title}</h2>
                        {topTaskCountdown && (
                          <p style={{ fontSize: '13px', color: 'var(--accent)', opacity: 0.8, margin: '-8px 0 16px', fontWeight: 600 }}>{topTaskCountdown}</p>
                        )}
                        <p className={styles.focusDurationLabel}>Session length</p>
                        <div className={styles.focusDurationRow}>
                          {[5, 15, 25, 45, 60].map(d => (
                            <button key={d}
                              onClick={() => { setFocusDuration(d); setFocusCustom('') }}
                              className={`${styles.focusDurationBtn} ${focusDuration === d && !focusCustom ? styles.focusDurationBtnActive : ''}`}>
                              {d}m
                            </button>
                          ))}
                          <button
                            onClick={() => { setFocusDuration(0); setFocusCustom('') }}
                            className={`${styles.focusDurationBtn} ${focusDuration === 0 ? styles.focusDurationBtnActive : ''}`}>
                            Custom
                          </button>
                        </div>
                        {focusDuration === 0 && (
                          <input type="number" placeholder="Minutes" value={focusCustom}
                            onChange={e => setFocusCustom(e.target.value)}
                            className={styles.focusCustomInput} min="1" max="180"
                            autoFocus />
                        )}
                        <button onClick={startFocus} className={styles.focusStartBtn}>Start session →</button>
                      </>
                    )}
                    <div className={styles.focusMusicStub}>
                      🎵 Music — connect Spotify, Apple Music, or YouTube in Settings
                    </div>
                  </div>
                )}
                {focusPhase === 'active' && (
                  <div className={styles.focusActive}>
                    <p className={styles.focusActiveTask}>{topTask?.title}</p>
                    <div className={`${styles.focusTimerDisplay} ${styles.timerDisplay}`}>{formatTimer(focusTimeLeft)}</div>
                    <button onClick={toggleFocusPause} className={styles.focusPauseBtn}>{focusRunning ? 'Pause' : 'Resume'}</button>
                    {showAbandonConfirm ? (
                      <div className={styles.abandonConfirmRow}>
                        <span className={styles.abandonConfirmText}>Abandon session?</span>
                        <button onClick={confirmAbandon} className={styles.abandonYesBtn}>Yes, stop</button>
                        <button onClick={() => setShowAbandonConfirm(false)} className={styles.abandonNoBtn}>Keep going</button>
                      </div>
                    ) : (
                      <button onClick={handleAbandonSession} className={styles.focusAbandonBtn}>Abandon session</button>
                    )}
                  </div>
                )}
                {focusPhase === 'complete' && (
                  <div className={styles.focusComplete}>
                    <p className={styles.focusCompleteHeading}>Time's up.</p>
                    <p className={styles.focusCompleteTask}>{topTask?.title}</p>
                    <p className={styles.focusCompletePrompt}>How'd it go?</p>
                    <div className={styles.focusResultBtns}>
                      <button onClick={() => handleFocusResult('complete')} className={styles.focusResultBtn}>Nailed it ✓</button>
                      <button onClick={() => handleFocusResult('progress')} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>Made progress →</button>
                      <button onClick={() => handleFocusResult('stuck')} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>Got stuck, help me</button>
                    </div>
                  </div>
                )}
                {focusPhase === 'stuck' && (
                  <div className={styles.focusStuck}>
                    <p className={styles.focusStuckLabel}>Cinis</p>
                    {focusAiLoading ? <div className={styles.focusStuckBubble}><span className={styles.checkinTyping}>···</span></div>
                      : <div className={styles.focusStuckBubble}>{focusAiResponse}</div>}
                    <div className={styles.focusStuckActions}>
                      <button onClick={() => setFocusPhase('setup')} className={styles.focusStuckBtn}>Try again</button>
                      <button onClick={() => switchTab('tasks')} className={`${styles.focusStuckBtn} ${styles.focusStuckBtnGhost}`}>Back to tasks</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── FOCUS STATS ── */}
          <div className={styles.focusStatsContainer}>
            <div className={styles.focusStatCard}>
              <div className={styles.focusStatLabel}>Day streak</div>
              <div className={styles.focusStatValue}>{(() => {
                const today = new Date()
                const todayStr = localDateStr(today)
                const yesterdayStr = localDateStr(new Date(today.getTime() - 86400000))
                const todayCompleted = tasks.filter(t => t.completed && localDateStr(new Date(t.updated_at || t.created_at)) === todayStr).length
                const yesterdayCompleted = tasks.filter(t => t.completed && localDateStr(new Date(t.updated_at || t.created_at)) === yesterdayStr).length
                if (todayCompleted === 0 && yesterdayCompleted === 0) return '0'
                let streak = todayCompleted > 0 ? 1 : 0
                for (let i = 1; i < 365; i++) {
                  const checkDateObj = new Date(today.getTime() - i * 86400000)
                  const checkDateStr = localDateStr(checkDateObj)
                  const completed = tasks.filter(t => t.completed && localDateStr(new Date(t.updated_at || t.created_at)) === checkDateStr).length
                  if (completed > 0) streak++
                  else break
                }
                return streak
              })()}</div>
            </div>
            <div className={styles.focusStatCard}>
              <div className={styles.focusStatLabel}>Total focus time</div>
              <div className={styles.focusStatValue}>{(() => {
                const totalMinutes = tasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0)
                if (totalMinutes < 60) return `${totalMinutes}m`
                const hours = Math.floor(totalMinutes / 60)
                const mins = totalMinutes % 60
                return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
              })()}</div>
            </div>
            <div className={styles.focusStatCard}>
              <div className={styles.focusStatLabel}>Sessions today</div>
              <div className={styles.focusStatValue}>{(() => {
                const today = new Date()
                const todayStr = localDateStr(today)
                return tasks.filter(t => t.completed && localDateStr(new Date(t.updated_at || t.created_at)) === todayStr).length
              })()}</div>
            </div>
          </div>

          {/* ── 🥗 FUEL ── */}
          <div className={`${styles.focusAccordionCard} ${focusSection === 'fuel' ? styles.focusAccordionCardOpen : ''}`}>
            <div className={styles.focusAccordionHeader} onClick={() => setFocusSection(focusSection === 'fuel' ? null : 'fuel')}>
              <span className={styles.focusAccordionEmoji}>🥗</span>
              <span className={styles.focusAccordionTitle}>Fuel Your Focus</span>
              <span className={styles.focusAccordionChevron}><CaretDown size={16} style={{ transform: focusSection === 'fuel' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} /></span>
            </div>
            {focusSection === 'fuel' && (
              <div className={styles.focusAccordionContent}>
                <div className={styles.focusContentCards}>
                  <h2 className={styles.focusContentTitle}>Fuel your focus</h2>
                  <p className={styles.focusContentSub}>What you eat before a session matters. Keep it simple.</p>
                  {[
                    { icon: '🥚', title: 'Protein first', body: 'Eggs, Greek yogurt, or a handful of nuts before a session. Protein stabilizes blood sugar and prevents the mid-session crash that hits ~90 minutes after a high-carb meal.' },
                    { icon: '🍠', title: 'Complex carbs for sustained energy', body: 'Oats, sweet potato, or whole grain bread 1-2 hours before a long session. They release energy slowly — no spike, no crash. Avoid simple carbs right before starting.' },
                    { icon: '💧', title: 'Hydration is non-negotiable', body: "Even mild dehydration (1-2%) measurably impairs cognitive function. Drink 500ml of water before your session starts. Keep a glass nearby — you'll drink more if it's visible." },
                    { icon: '☕', title: 'Caffeine timing', body: 'Wait 90 minutes after waking before your first coffee. This avoids crashing through your cortisol peak. Caffeine peaks at 30-60 min — time it to start just before your session. Cut off by 2pm to protect sleep.' },
                    { icon: '🚫', title: 'What to avoid', body: 'Heavy meals right before a session send blood flow to your gut. Alcohol the night before fragments sleep and tanks focus the next day. Ultra-processed foods cause inflammation that slows thinking.' },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className={styles.focusContentCard}>
                      <span className={styles.focusContentCardIcon}>{icon}</span>
                      <div>
                        <p className={styles.focusContentCardTitle}>{title}</p>
                        <p className={styles.focusContentCardBody}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 🏃 MOVE ── */}
          <div className={`${styles.focusAccordionCard} ${focusSection === 'move' ? styles.focusAccordionCardOpen : ''}`}>
            <div className={styles.focusAccordionHeader} onClick={() => setFocusSection(focusSection === 'move' ? null : 'move')}>
              <span className={styles.focusAccordionEmoji}>🏃</span>
              <span className={styles.focusAccordionTitle}>Move</span>
              <span className={styles.focusAccordionChevron}><CaretDown size={16} style={{ transform: focusSection === 'move' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} /></span>
            </div>
            {focusSection === 'move' && (
              <div className={styles.focusAccordionContent}>
                <div className={styles.focusContentCards}>
                  <h2 className={styles.focusContentTitle}>Move to think better</h2>
                  <p className={styles.focusContentSub}>Physical activity directly improves executive function. Here's how to use it.</p>
                  {[
                    { icon: '🚶', title: '10-minute walk before a hard task', body: "A brisk 10-minute walk before a focus session increases BDNF (brain-derived neurotrophic factor) and blood flow to the prefrontal cortex. It's the single most evidence-backed pre-work ritual for cognitive performance." },
                    { icon: '🪑', title: 'Desk stretches every 45 minutes', body: 'Neck rolls, shoulder circles, chest opener, hip flexor stretch. Takes 2 minutes. Sitting compresses the spine and restricts blood flow — brief movement resets your posture and attention.' },
                    { icon: '⏱️', title: 'Exercise timing for focus', body: "Morning exercise improves attention for 2-4 hours after. Afternoon exercise (3-5pm) can extend peak focus into the evening. Avoid intense exercise within 3 hours of a critical cognitive task — you'll feel great but your working memory takes a temporary hit." },
                    { icon: '🧘', title: '5-minute breathing reset', body: "Box breathing: 4 counts in, 4 hold, 4 out, 4 hold. 5 rounds. Activates the parasympathetic nervous system and lowers cortisol. Use this before a session you've been dreading or when you hit a wall." },
                    { icon: '🏃', title: 'Exercise and ADHD', body: 'Regular aerobic exercise is one of the most powerful non-pharmacological interventions for attention and impulse control. Even 20 minutes of moderate-intensity cardio produces dopamine and norepinephrine — the same targets as stimulant medications.' },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className={styles.focusContentCard}>
                      <span className={styles.focusContentCardIcon}>{icon}</span>
                      <div>
                        <p className={styles.focusContentCardTitle}>{title}</p>
                        <p className={styles.focusContentCardBody}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 💊 SUPPLEMENTS ── */}
          <div className={`${styles.focusAccordionCard} ${focusSection === 'supplements' ? styles.focusAccordionCardOpen : ''}`}>
            <div className={styles.focusAccordionHeader} onClick={() => setFocusSection(focusSection === 'supplements' ? null : 'supplements')}>
              <span className={styles.focusAccordionEmoji}>💊</span>
              <span className={styles.focusAccordionTitle}>Supplements</span>
              <span className={styles.focusAccordionChevron}><CaretDown size={16} style={{ transform: focusSection === 'supplements' ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} /></span>
            </div>
            {focusSection === 'supplements' && (
              <div className={styles.focusAccordionContent}>
                <div className={styles.focusContentCards}>
                  <h2 className={styles.focusContentTitle}>Evidence-based supplements</h2>
                  <p className={styles.focusContentSub}>Always consult your doctor before starting any supplement, especially if you take medication.</p>
                  {[
                    { icon: '🐟', title: 'Omega-3 (EPA/DHA)', body: 'The most studied supplement for cognitive function. EPA and DHA are structural components of brain cell membranes and support communication between neurons. 1-2g of combined EPA/DHA daily. Effects build over weeks, not days.' },
                    { icon: '🧲', title: 'Magnesium glycinate', body: 'Most people are deficient. Magnesium plays a role in over 300 enzymatic reactions, including those involved in energy production and nerve function. Glycinate form is best absorbed and gentlest on the stomach. 200-400mg before bed also improves sleep quality.' },
                    { icon: '🍵', title: 'L-Theanine + Caffeine', body: 'The gold standard focus stack. L-theanine (100-200mg) taken with caffeine smooths out the jitteriness, extends the focus window, and reduces the crash. Found naturally together in green tea. Widely studied, consistently well-tolerated.' },
                    { icon: '🌿', title: 'Bacopa monnieri', body: 'An adaptogenic herb with some of the strongest evidence for improving memory consolidation and reducing cognitive anxiety. Effects take 8-12 weeks to build. Take with fat. Recommended dose: 300-450mg of a 55% bacosides extract.' },
                    { icon: '⚠️', title: 'A word on stacking', body: "More is not better. Start with one supplement, give it 4-6 weeks, evaluate honestly. Supplements work best on top of fundamentals — sleep, exercise, and nutrition. No supplement compensates for poor sleep. Talk to your doctor, especially if you take any medications." },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className={styles.focusContentCard}>
                      <span className={styles.focusContentCardIcon}>{icon}</span>
                      <div>
                        <p className={styles.focusContentCardTitle}>{title}</p>
                        <p className={styles.focusContentCardBody}>{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── SESSION END MODAL ── */}
      {showSessionEndModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && setShowSessionEndModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.detailTitle}>{sessionEndType === 'complete' ? 'Session complete' : 'Session ended'}</h2>
              <button onClick={() => setShowSessionEndModal(false)} className={styles.modalClose}>×</button>
            </div>
            <div className={styles.sessionEndBody}>
              {topTask && <p className={styles.sessionEndTask}>{topTask.title}</p>}
              <p className={styles.sessionEndPrompt}>How'd it go?</p>
              <div className={styles.focusResultBtns}>
                <button onClick={() => handleFocusResult('complete')} className={styles.focusResultBtn}>✓ Nailed it</button>
                <button onClick={() => handleFocusResult('progress')} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>▶ Made progress</button>
                <button onClick={() => { setShowSessionEndModal(false); setStuckTask(topTask); setStuckConfirmRemove(false); setShowStuckModal(true) }} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>🧱 Got stuck</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STUCK RESOLUTION MODAL ── */}
      {showStuckModal && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && (setShowStuckModal(false), setStuckConfirmRemove(false))}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.detailTitle}>What do you want to do with this?</h2>
              <button onClick={() => { setShowStuckModal(false); setStuckConfirmRemove(false) }} className={styles.modalClose}>×</button>
            </div>
            {stuckTask && <p className={styles.sessionEndTask}>{stuckTask.title}</p>}
            <p className={styles.sessionEndPrompt} style={{ marginBottom: '20px' }}>No judgment — let's figure out the next step.</p>
            {stuckConfirmRemove ? (
              <div>
                <p style={{ fontSize: '0.92rem', color: 'rgba(245,240,227,0.6)', marginBottom: '18px', lineHeight: 1.5 }}>
                  Are you sure? This will remove <strong style={{ color: 'var(--text-color, #f0ead6)' }}>{stuckTask?.title}</strong> from your list.
                </p>
                <div className={styles.focusResultBtns}>
                  <button onClick={async () => { if (stuckTask) { await archiveTask(stuckTask) } setShowStuckModal(false); setStuckConfirmRemove(false) }} className={styles.focusResultBtn}>Yes, remove it</button>
                  <button onClick={() => setStuckConfirmRemove(false)} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className={styles.focusResultBtns} style={{ flexDirection: 'column' }}>
                <button onClick={() => { if (stuckTask) { setDetailTask(stuckTask); openDetailEdit() } setShowStuckModal(false) }} className={styles.focusResultBtn}>
                  📅 Reschedule it
                </button>
                <button onClick={() => setStuckConfirmRemove(true)} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>
                  🗑 Remove it
                </button>
                <button onClick={() => { setShowStuckModal(false); setStuckConfirmRemove(false) }} className={`${styles.focusResultBtn} ${styles.focusResultBtnSecondary}`}>
                  ✓ Keep it on my list
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </TabErrorBoundary>
  )
}
