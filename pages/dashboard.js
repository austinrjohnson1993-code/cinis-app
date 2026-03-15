import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Dashboard.module.css'

const NAV_ITEMS = [
  { id: 'tasks', label: 'Tasks', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  )},
  { id: 'checkin', label: 'Check-in', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )},
  { id: 'calendar', label: 'Calendar', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: 'journal', label: 'Journal', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  )},
]

// ── Priority Engine ──────────────────────────────────────────
function computePriorityScore(task) {
  if (task.completed) return 0
  let score = 50

  if (task.due_time) {
    const hoursUntilDue = (new Date(task.due_time) - new Date()) / (1000 * 60 * 60)
    if (hoursUntilDue < 0)       score += 100  // overdue
    else if (hoursUntilDue < 1)  score += 90
    else if (hoursUntilDue < 2)  score += 75
    else if (hoursUntilDue < 6)  score += 55
    else if (hoursUntilDue < 12) score += 35
    else if (hoursUntilDue < 24) score += 20
  }

  if (task.consequence_level === 'external') score += 40
  score += (task.rollover_count || 0) * 15

  return score
}

function sortByPriority(tasks) {
  return [...tasks]
    .map(t => ({ ...t, priority_score: computePriorityScore(t) }))
    .sort((a, b) => b.priority_score - a.priority_score)
}

function formatDueTime(due_time) {
  if (!due_time) return null
  const due = new Date(due_time)
  const now = new Date()
  const hoursUntil = (due - now) / (1000 * 60 * 60)
  const timeStr = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (hoursUntil < 0) return { label: `Overdue · ${timeStr}`, urgent: true }
  if (hoursUntil < 1) return { label: `Due in ${Math.round(hoursUntil * 60)}m`, urgent: true }
  if (hoursUntil < 3) return { label: `Due at ${timeStr}`, urgent: true }
  return { label: `Due at ${timeStr}`, urgent: false }
}

// ── Main Component ───────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [greeting, setGreeting] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [completing, setCompleting] = useState(null)

  // Add task form state
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newConsequence, setNewConsequence] = useState('self')
  const [adding, setAdding] = useState(false)

  const titleInputRef = useRef(null)

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      fetchProfile(session.user.id)
      fetchTasks(session.user.id)
    })
  }, [])

  useEffect(() => {
    if (showAddModal) setTimeout(() => titleInputRef.current?.focus(), 50)
  }, [showAddModal])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data)
    else router.push('/onboarding')
  }

  const fetchTasks = async (userId) => {
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', userId).eq('archived', false)
      .order('created_at', { ascending: false })
    setTasks(data || [])
    setLoading(false)
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !user) return
    setAdding(true)

    let due_time = null
    if (newDueDate) {
      const dateStr = newDueTime ? `${newDueDate}T${newDueTime}` : `${newDueDate}T23:59`
      due_time = new Date(dateStr).toISOString()
    }

    const task = {
      user_id: user.id,
      title: newTitle.trim(),
      completed: false,
      archived: false,
      due_time,
      consequence_level: newConsequence,
      rollover_count: 0,
      priority_score: 0,
      created_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString()
    }

    const { data } = await supabase.from('tasks').insert(task).select().single()
    if (data) setTasks(prev => [data, ...prev])
    setNewTitle('')
    setNewDueDate('')
    setNewDueTime('')
    setNewConsequence('self')
    setAdding(false)
    setShowAddModal(false)
  }

  const completeTask = async (task) => {
    setCompleting(task.id)
    await new Promise(r => setTimeout(r, 400)) // animation window
    const updated = { ...task, completed: true, completed_at: new Date().toISOString() }
    await supabase.from('tasks').update({ completed: true, completed_at: updated.completed_at }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    setCompleting(null)
  }

  const uncompleteTask = async (task) => {
    const updated = { ...task, completed: false, completed_at: null }
    await supabase.from('tasks').update({ completed: false, completed_at: null }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  const rescheduleTask = async (task) => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    const updated = {
      ...task,
      scheduled_for: tomorrow.toISOString(),
      due_time: task.due_time ? tomorrow.toISOString() : null,
      rollover_count: (task.rollover_count || 0) + 1
    }
    await supabase.from('tasks').update({
      scheduled_for: updated.scheduled_for,
      due_time: updated.due_time,
      rollover_count: updated.rollover_count
    }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
  }

  const archiveTask = async (task) => {
    await supabase.from('tasks').update({ archived: true }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const pendingTasks = sortByPriority(tasks.filter(t => !t.completed))
  const completedTasks = tasks.filter(t => t.completed)
  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const topTask = pendingTasks[0] || null
  const restTasks = pendingTasks.slice(1)

  if (loading) return (
    <div className={styles.loadingPage}>
      <span className="brand"><span className="focus">Focus</span><span className="buddy">Buddy</span></span>
    </div>
  )

  return (
    <>
      <Head><title>Dashboard — FocusBuddy</title></Head>
      <div className={styles.appShell}>

        {/* SIDEBAR — desktop */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarLogo}>
            <span className="brand"><span className="focus">Focus</span><span className="buddy">Buddy</span></span>
          </div>
          <nav className={styles.sidebarNav}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`${styles.sidebarNavItem} ${activeTab === item.id ? styles.sidebarNavItemActive : ''}`}>
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <span className={styles.sidebarEmail}>{user?.email}</span>
            <button onClick={handleSignOut} className={styles.signOutBtn}>Sign out</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className={styles.main}>

          {/* ── TASKS VIEW ── */}
          {activeTab === 'tasks' && (
            <div className={styles.view}>
              <div className={styles.viewHeader}>
                <div>
                  <h1 className={styles.greetingText}>
                    {greeting}, <span className={styles.name}>{firstName}.</span>
                  </h1>
                  <p className={styles.headerSub}>
                    {pendingTasks.length === 0
                      ? "You're all caught up. Seriously — well done."
                      : `${pendingTasks.length} thing${pendingTasks.length !== 1 ? 's' : ''} on your list.`}
                  </p>
                </div>
                <button onClick={() => setShowAddModal(true)} className={styles.addTaskBtn}>
                  <span>+</span> Add task
                </button>
              </div>

              {/* FOCUS CARD — top priority */}
              {topTask && (
                <div className={styles.focusCardWrap}>
                  <div className={styles.focusLabel}>
                    <span className={styles.focusDot} />
                    Priority focus
                  </div>
                  <div className={`${styles.focusCard} ${completing === topTask.id ? styles.focusCardCompleting : ''}`}>
                    {topTask.rollover_count > 0 && (
                      <div className={styles.rolloverBadge}>
                        ↷ Rolled over {topTask.rollover_count}×
                      </div>
                    )}
                    <div className={styles.focusCardBody}>
                      <button
                        onClick={() => completeTask(topTask)}
                        className={styles.focusCheck}
                        aria-label="Complete task"
                      />
                      <div className={styles.focusTaskInfo}>
                        <span className={styles.focusTaskTitle}>{topTask.title}</span>
                        {topTask.due_time && (() => {
                          const fmt = formatDueTime(topTask.due_time)
                          return (
                            <span className={`${styles.focusDueTime} ${fmt.urgent ? styles.focusDueUrgent : ''}`}>
                              {fmt.urgent && <span className={styles.urgentDot} />}
                              {fmt.label}
                            </span>
                          )
                        })()}
                        {topTask.consequence_level === 'external' && (
                          <span className={styles.externalBadge}>External commitment</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.focusCardActions}>
                      <button onClick={() => rescheduleTask(topTask)} className={styles.focusAction} title="Push to tomorrow">
                        Tomorrow
                      </button>
                      <button onClick={() => archiveTask(topTask)} className={styles.focusActionDelete} title="Remove">
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* STACK — visual depth cards */}
                  {restTasks.length > 0 && <div className={styles.stackCard2} />}
                  {restTasks.length > 1 && <div className={styles.stackCard3} />}
                </div>
              )}

              {/* REST OF LIST */}
              {restTasks.length > 0 && (
                <div className={styles.taskGroup}>
                  <div className={styles.taskGroupLabel}>Up next</div>
                  {restTasks.map(task => {
                    const dueFmt = task.due_time ? formatDueTime(task.due_time) : null
                    return (
                      <div key={task.id} className={styles.taskCard}>
                        <button onClick={() => completeTask(task)} className={styles.taskCheck} aria-label="Complete" />
                        <div className={styles.taskInfo}>
                          <span className={styles.taskTitle}>{task.title}</span>
                          <div className={styles.taskMeta}>
                            {dueFmt && (
                              <span className={`${styles.taskDueTime} ${dueFmt.urgent ? styles.taskDueUrgent : ''}`}>
                                {dueFmt.label}
                              </span>
                            )}
                            {task.rollover_count > 0 && (
                              <span className={styles.taskRollover}>↷ {task.rollover_count}×</span>
                            )}
                            {task.consequence_level === 'external' && (
                              <span className={styles.taskExternal}>External</span>
                            )}
                          </div>
                        </div>
                        <div className={styles.taskActions}>
                          <button onClick={() => rescheduleTask(task)} className={styles.taskAction} title="Tomorrow">↷</button>
                          <button onClick={() => archiveTask(task)} className={styles.taskActionDelete} title="Remove">×</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* EMPTY STATE */}
              {pendingTasks.length === 0 && completedTasks.length === 0 && (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>✦</div>
                  <p className={styles.emptyText}>Nothing on your list.</p>
                  <p className={styles.emptySubtext}>Add your first task and FocusBuddy will handle the rest.</p>
                  <button onClick={() => setShowAddModal(true)} className={styles.emptyAddBtn}>+ Add your first task</button>
                </div>
              )}

              {/* COMPLETED */}
              {completedTasks.length > 0 && (
                <div className={styles.taskGroup} style={{ marginTop: '32px' }}>
                  <div className={styles.taskGroupLabel}>
                    Done today · {completedTasks.length} {completedTasks.length === 1 ? 'win' : 'wins'} 🔥
                  </div>
                  {completedTasks.map(task => (
                    <div key={task.id} className={`${styles.taskCard} ${styles.taskDone}`}>
                      <button onClick={() => uncompleteTask(task)} className={`${styles.taskCheck} ${styles.taskCheckDone}`}>✓</button>
                      <div className={styles.taskInfo}>
                        <span className={styles.taskTitleDone}>{task.title}</span>
                      </div>
                      <button onClick={() => archiveTask(task)} className={styles.taskActionDelete} title="Remove">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CHECK-IN VIEW ── */}
          {activeTab === 'checkin' && (
            <div className={styles.view}>
              <div className={styles.header}>
                <h1 className={styles.greetingText}>Check-in</h1>
                <p className={styles.headerSub}>Your daily coaching conversation.</p>
              </div>
              <div className={styles.stubCard}>
                <div className={styles.stubIcon}>💬</div>
                <p className={styles.stubText}>Daily check-in coming soon.</p>
                <p className={styles.stubSubtext}>Morning, midday, and evening sessions — brief, personal, and built around your actual list.</p>
              </div>
            </div>
          )}

          {/* ── CALENDAR VIEW ── */}
          {activeTab === 'calendar' && (
            <div className={styles.view}>
              <div className={styles.header}>
                <h1 className={styles.greetingText}>Calendar</h1>
                <p className={styles.headerSub}>Your schedule, your way.</p>
              </div>
              <div className={styles.stubCard}>
                <div className={styles.stubIcon}>📅</div>
                <p className={styles.stubText}>Calendar coming soon.</p>
                <p className={styles.stubSubtext}>Internal calendar — no Google auth required. See your tasks and commitments in time.</p>
              </div>
            </div>
          )}

          {/* ── JOURNAL VIEW ── */}
          {activeTab === 'journal' && (
            <div className={styles.view}>
              <div className={styles.header}>
                <h1 className={styles.greetingText}>Journal</h1>
                <p className={styles.headerSub}>Your private reflection space.</p>
              </div>
              <div className={styles.stubCard}>
                <div className={styles.stubIcon}>📓</div>
                <p className={styles.stubText}>Journal coming soon.</p>
                <p className={styles.stubSubtext}>Brain dump, reflect, think out loud. No structure required.</p>
              </div>
            </div>
          )}

        </main>

        {/* BOTTOM NAV — mobile */}
        <nav className={styles.bottomNav}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`${styles.bottomNavItem} ${activeTab === item.id ? styles.bottomNavItemActive : ''}`}>
              <span className={styles.bottomNavIcon}>{item.icon}</span>
              <span className={styles.bottomNavLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* ADD TASK MODAL */}
        {showAddModal && (
          <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>New task</h2>
                <button onClick={() => setShowAddModal(false)} className={styles.modalClose}>×</button>
              </div>
              <form onSubmit={addTask} className={styles.modalForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>What needs to get done?</label>
                  <input
                    ref={titleInputRef}
                    type="text"
                    placeholder="e.g. Call the insurance company"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className={styles.fieldInput}
                    required
                  />
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Due date</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={e => setNewDueDate(e.target.value)}
                      className={styles.fieldInput}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Due time</label>
                    <input
                      type="time"
                      value={newDueTime}
                      onChange={e => setNewDueTime(e.target.value)}
                      className={styles.fieldInput}
                      disabled={!newDueDate}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Type of commitment</label>
                  <div className={styles.consequenceToggle}>
                    <button
                      type="button"
                      onClick={() => setNewConsequence('self')}
                      className={`${styles.consequenceBtn} ${newConsequence === 'self' ? styles.consequenceBtnActive : ''}`}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewConsequence('external')}
                      className={`${styles.consequenceBtn} ${newConsequence === 'external' ? styles.consequenceBtnActive : ''}`}
                    >
                      External commitment
                    </button>
                  </div>
                  <p className={styles.fieldHint}>
                    {newConsequence === 'external'
                      ? 'Someone else is counting on this — it gets priority.'
                      : 'This is for you — still important, context matters.'}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={adding || !newTitle.trim()}
                  className={styles.modalSubmit}
                >
                  {adding ? 'Adding...' : 'Add to my list'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
