import React, { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { supabase } from '../../lib/supabase'
import { saveTaskOrder } from '../../lib/taskOrder'
import { getChoresByPreset } from '../../lib/chores'
import { showToast as libShowToast } from '../../lib/toast.js'
import { Microphone } from '@phosphor-icons/react'
import {
  sortByPriority,
  sortBySchedule,
  formatDueTime,
  getCountdownDisplay,
  getTaskDateLabel,
  localDateStr,
  todayStr,
  tomorrowStr,
  computePriorityScore,
  EmptyState,
  SkeletonCard,
  RECURRENCE_OPTIONS,
  generateGreetingLine,
  CINIS_MARK_SVG,
  taskBaseDate,
  useCountdown,
} from './shared'

// ── Local helpers ──────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────────

export default function TabTasks({ user, profile, tasks, setTasks, showToast, loggedFetch, switchTab }) {
  // ── Task-related state ───────────────────────────────────────────────────────

  const [loading, setLoading] = useState(false)
  const [tasksError, setTasksError] = useState(false)

  // Add task form
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newDueTime, setNewDueTime] = useState('')
  const [newConsequence, setNewConsequence] = useState('self')
  const [newNotes, setNewNotes] = useState('')
  const [newRecurrence, setNewRecurrence] = useState('none')
  const [adding, setAdding] = useState(false)
  const [titleInputError, setTitleInputError] = useState(false)

  // Task completion
  const [completing, setCompleting] = useState(null)

  // Task detail modal
  const [detailTask, setDetailTask] = useState(null)
  const [detailNoteEdit, setDetailNoteEdit] = useState('')
  const [detailNoteEditing, setDetailNoteEditing] = useState(false)

  // Detail editing
  const [detailEditing, setDetailEditing] = useState(false)
  const [detailEditTitle, setDetailEditTitle] = useState('')
  const [detailEditDueDate, setDetailEditDueDate] = useState('')
  const [detailEditDueTime, setDetailEditDueTime] = useState('')
  const [detailEditConsequence, setDetailEditConsequence] = useState('self')
  const [detailEditRecurrence, setDetailEditRecurrence] = useState('none')
  const [detailEditNotes, setDetailEditNotes] = useState('')
  const [detailSaving, setDetailSaving] = useState(false)

  // Voice
  const [listening, setListening] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [parsing, setParsing] = useState(false)
  const recognitionRef = useRef(null)
  const titleInputRef = useRef(null)
  const dragSrcRef = useRef(null)

  // Bulk import
  const [addMode, setAddMode] = useState('single')
  const [bulkText, setBulkText] = useState('')
  const [bulkParsing, setBulkParsing] = useState(false)
  const [bulkPreview, setBulkPreview] = useState([])
  const [bulkListening, setBulkListening] = useState(false)
  const bulkRecognitionRef = useRef(null)

  // S17 Tasks tab state
  const [greeting, setGreeting] = useState('')
  const [greetingDismissed, setGreetingDismissed] = useState(false)
  const greetCardHasAnimated = useRef(false)
  const [greetCardAnimate, setGreetCardAnimate] = useState(false)
  const [sectionCollapsed, setSectionCollapsed] = useState({ overdue: false, today: false, tomorrow: false, thisWeek: false, later: false, completedToday: true })

  // Streak celebration
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [streakCelebMilestone, setStreakCelebMilestone] = useState(0)
  const [xpFloat, setXpFloat] = useState(null)
  const [taskDragOver, setTaskDragOver] = useState(null)
  const [newTaskType, setNewTaskType] = useState('task')
  const [newTaskDates, setNewTaskDates] = useState([])
  const [calPickerMonth, setCalPickerMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [taskTimeHour, setTaskTimeHour] = useState(9)
  const [taskTimeMinute, setTaskTimeMinute] = useState(0)
  const [taskTimeEnabled, setTaskTimeEnabled] = useState(false)
  const [taskEstimated, setTaskEstimated] = useState('')
  const [addingTaskOverlay, setAddingTaskOverlay] = useState(false)

  // Live tick for countdown displays
  const [tickNow, setTickNow] = useState(() => new Date())

  // Tutorial
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(0)

  // Drag hint
  const [dragHintDismissed, setDragHintDismissed] = useState(false)

  // Elected task (for focus tab integration)
  const [electedTaskId, setElectedTaskId] = useState(null)

  // Voice FAB
  const [voiceFabState, setVoiceFabState] = useState('idle')
  const voiceFabRecognitionRef = useRef(null)

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Greeting
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Tick every 30s so getCountdownDisplay stays fresh
  useEffect(() => {
    const interval = setInterval(() => setTickNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  // Load greeting dismissed + section collapse state from localStorage
  useEffect(() => {
    if (typeof localStorage === 'undefined') return
    if (localStorage.getItem(`greeting_dismissed_${todayStr()}`)) setGreetingDismissed(true)
    const collapsed = {}
    ;['overdue','today','tomorrow','thisWeek','later','completedToday'].forEach(s => {
      const v = localStorage.getItem(`task_section_collapsed_${s}`)
      if (v !== null) collapsed[s] = v === 'true'
    })
    if (Object.keys(collapsed).length > 0) setSectionCollapsed(prev => ({ ...prev, ...collapsed }))
  }, [])

  // Greeting card animation
  useEffect(() => {
    if (!greetingDismissed && !greetCardHasAnimated.current) {
      greetCardHasAnimated.current = true
      setGreetCardAnimate(true)
    }
  }, [greetingDismissed])

  // Load drag hint dismissed state from localStorage
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('fb_drag_hint_dismissed')) {
      setDragHintDismissed(true)
    }
  }, [])

  // Tutorial for new users
  useEffect(() => {
    if (profile && profile.tutorial_completed === false) {
      setShowTutorial(true)
    }
  }, [profile])

  // ── Derived values ─────────────────────────────────────────────────────────

  const choreTitleSet = (() => {
    if (!profile?.chore_preset) return new Set()
    const preset = getChoresByPreset(profile.chore_preset)
    return preset ? new Set(preset.chores.map(c => c.title)) : new Set()
  })()
  const isChoreTask = (t) => choreTitleSet.size > 0 && choreTitleSet.has(t.title)

  const s17Today = new Date(); s17Today.setHours(0,0,0,0)
  const s17Tomorrow = new Date(s17Today); s17Tomorrow.setDate(s17Today.getDate()+1)
  const s17WeekEnd = new Date(s17Today); s17WeekEnd.setDate(s17Today.getDate()+7)
  const s17TodayStr = localDateStr(s17Today)
  const s17TomStr = localDateStr(s17Tomorrow)
  const s17Pending = tasks.filter(t => !t.completed && !t.archived)
  const s17Overdue = sortByPriority(s17Pending.filter(t => {
    if (!t.scheduled_for) return false
    const sf = new Date(t.scheduled_for); sf.setHours(0,0,0,0)
    return sf < s17Today
  }))
  const s17TodayTasks = sortBySchedule(s17Pending.filter(t => {
    const base = taskBaseDate(t)
    return base && localDateStr(base) === s17TodayStr
  }))
  const s17TomorrowTasks = sortBySchedule(s17Pending.filter(t => {
    const base = taskBaseDate(t)
    return base && localDateStr(base) === s17TomStr
  }))
  const s17WeekTasks = sortBySchedule(s17Pending.filter(t => {
    const base = taskBaseDate(t)
    if (!base) return false
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    return d > s17Tomorrow && d <= s17WeekEnd
  }))
  const s17LaterTasks = sortBySchedule(s17Pending.filter(t => {
    const base = taskBaseDate(t)
    if (!base) return true
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    return d > s17WeekEnd
  }))
  const s17CompletedToday = tasks.filter(t => t.completed && t.completed_at && localDateStr(new Date(t.completed_at)) === s17TodayStr)
  const s17StarredTask = (() => {
    const starred = tasks.filter(t => t.starred && !t.completed && !t.archived)
    if (!starred.length) return null
    return starred.reduce((best, t) => {
      if (!best.due_time && t.due_time) return t
      if (best.due_time && t.due_time && new Date(t.due_time) < new Date(best.due_time)) return t
      return best
    })
  })()
  const s17CompletedCount = s17CompletedToday.length
  const s17TotalToday = s17CompletedCount + s17TodayTasks.length
  const rawName = profile?.full_name || ''
  const firstName = rawName.includes('@') ? 'there' : (rawName.split(' ')[0] || 'there')
  const s17StarredCountdown = useCountdown(s17StarredTask?.due_time)

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setNewTitle(''); setNewDueDate(''); setNewDueTime('')
    setNewConsequence('self'); setNewNotes(''); setNewRecurrence('none')
    setVoiceTranscript('')
  }

  const fetchTasks = async (userId) => {
    setTasksError(false)
    try {
      const { data, error } = await supabase
        .from('tasks').select('*').eq('user_id', userId).eq('archived', false)
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } catch {
      setTasksError(true)
    } finally {
      setLoading(false)
    }
  }

  const addTask = async (e) => {
    e.preventDefault()
    if (!user) return
    if (!newTitle.trim()) {
      showToast('Please enter a task name')
      setTitleInputError(true)
      setTimeout(() => setTitleInputError(false), 1200)
      return
    }
    setAdding(true)
    let due_time = null
    if (newDueDate) {
      const dateStr = newDueTime ? `${newDueDate}T${newDueTime}` : `${newDueDate}T23:59`
      due_time = new Date(dateStr).toISOString()
    }
    const task = {
      user_id: user.id, title: newTitle.trim(), completed: false, archived: false,
      due_time, consequence_level: newConsequence, notes: newNotes.trim() || null,
      recurrence: newRecurrence, rollover_count: 0, priority_score: 0,
      created_at: new Date().toISOString(), scheduled_for: new Date().toISOString(),
      starred: false, task_type: 'regular', estimated_minutes: null
    }
    const { data } = await supabase.from('tasks').insert(task).select().single()
    if (data) setTasks(prev => [data, ...prev])
    resetForm(); setAdding(false); setShowAddModal(false)
  }

  const addTaskQuick = async (title) => {
    if (!title || !user) return
    const task = {
      user_id: user.id, title, completed: false, archived: false, due_time: null,
      consequence_level: 'self', notes: null, recurrence: 'none', rollover_count: 0,
      priority_score: 0, created_at: new Date().toISOString(), scheduled_for: new Date().toISOString(),
      starred: false, task_type: 'regular', estimated_minutes: null
    }
    const { data } = await supabase.from('tasks').insert(task).select().single()
    if (data) setTasks(prev => [data, ...prev])
    showToast('Task added ✓')
  }

  const completeTask = async (task) => {
    setCompleting(task.id)
    await new Promise(r => setTimeout(r, 400))
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
    tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(9, 0, 0, 0)
    const updated = {
      ...task, scheduled_for: tomorrow.toISOString(),
      due_time: task.due_time ? tomorrow.toISOString() : null,
      rollover_count: (task.rollover_count || 0) + 1
    }
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    await supabase.from('tasks').update({
      scheduled_for: updated.scheduled_for, due_time: updated.due_time, rollover_count: updated.rollover_count
    }).eq('id', task.id)
  }

  const archiveTask = async (task) => {
    await supabase.from('tasks').update({ archived: true }).eq('id', task.id)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  const completeTaskWithXP = async (task) => {
    setCompleting(task.id)
    setXpFloat({ taskId: task.id, amount: 10 })
    let xpFloatTimer = setTimeout(() => setXpFloat(null), 2200)
    try {
      await new Promise(r => setTimeout(r, 320))
      const completedAt = new Date().toISOString()
      await supabase.from('tasks').update({ completed: true, completed_at: completedAt }).eq('id', task.id)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: true, completed_at: completedAt } : t))
    } finally {
      setCompleting(null)
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }
      const xpRes = await loggedFetch('/api/tasks/xp', { method: 'POST', headers, body: JSON.stringify({ taskId: task.id }) })
      const xpData = await xpRes.json()
      if (xpData.xpAwarded) {
        clearTimeout(xpFloatTimer)
        setXpFloat({ taskId: task.id, amount: xpData.xpAwarded })
        setTimeout(() => setXpFloat(null), 2200)
      }
      if (xpData.totalXp != null && typeof setProfile === 'function') {
        // Profile updates handled via parent if needed
      }
      const sRes = await loggedFetch('/api/tasks/streak', { headers: { Authorization: `Bearer ${session.access_token}` } })
      const sData = await sRes.json()
      // Streak updates handled via parent if needed
    } catch (err) { console.error('[completeTaskWithXP]', err) }
  }

  const toggleStarDB = async (task) => {
    const newStarred = !task.starred
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, starred: newStarred } : t))
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      await loggedFetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ starred: newStarred })
      })
    } catch { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, starred: task.starred } : t)) }
  }

  const toggleSection = (section) => {
    setSectionCollapsed(prev => {
      const newVal = !prev[section]
      try { localStorage.setItem(`task_section_collapsed_${section}`, String(newVal)) } catch {}
      return { ...prev, [section]: newVal }
    })
  }

  const handleTaskDragStart = (e, task, sectionTasks, sectionId) => {
    dragSrcRef.current = { id: task.id, sectionId, index: sectionTasks.findIndex(t => t.id === task.id) }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(task.id))
  }

  const handleTaskDragOver = (e, taskId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setTaskDragOver(taskId)
  }

  const handleTaskDrop = async (e, targetTask, sectionTasks) => {
    e.preventDefault()
    setTaskDragOver(null)
    const src = dragSrcRef.current
    if (!src || src.id === targetTask.id) return
    const updated = [...sectionTasks]
    const srcIdx = updated.findIndex(t => t.id === src.id)
    const dstIdx = updated.findIndex(t => t.id === targetTask.id)
    if (srcIdx === -1 || dstIdx === -1) return
    const [moved] = updated.splice(srcIdx, 1)
    updated.splice(dstIdx, 0, moved)
    const sectionIds = new Set(sectionTasks.map(t => t.id))
    setTasks(prev => {
      const nonSection = prev.filter(t => !sectionIds.has(t.id))
      return [...updated, ...nonSection]
    })
    dragSrcRef.current = null
    await saveTaskOrder(supabase, updated)
  }

  const addTaskFromOverlay = async (e) => {
    e?.preventDefault()
    if (!user || !newTitle.trim()) {
      showToast('Enter a task name')
      setTitleInputError(true)
      setTimeout(() => setTitleInputError(false), 1200)
      return
    }
    setAddingTaskOverlay(true)
    const datesToCreate = newTaskDates.length > 0 ? newTaskDates : [todayStr()]
    const makeTime = (dateStr) => {
      if (taskTimeEnabled) {
        const h = String(taskTimeHour).padStart(2, '0')
        const m = String(taskTimeMinute).padStart(2, '0')
        return new Date(`${dateStr}T${h}:${m}`).toISOString()
      }
      return new Date(`${dateStr}T23:59`).toISOString()
    }
    const taskBase = {
      user_id: user.id, title: newTitle.trim(), completed: false, archived: false,
      consequence_level: newConsequence, notes: newNotes.trim() || null,
      recurrence: newRecurrence, rollover_count: 0, priority_score: 0,
      starred: false, task_type: newTaskType,
      estimated_minutes: taskEstimated ? parseInt(taskEstimated) : null,
    }
    if (datesToCreate.length > 1) {
      const inserts = datesToCreate.map(d => ({
        ...taskBase, due_time: makeTime(d),
        scheduled_for: new Date(`${d}T09:00`).toISOString(),
        created_at: new Date().toISOString(),
      }))
      const { data } = await supabase.from('tasks').insert(inserts).select()
      if (data) setTasks(prev => [...data, ...prev])
      showToast(`${inserts.length} tasks added`)
    } else {
      const d = datesToCreate[0]
      const task = {
        ...taskBase,
        due_time: newTaskDates.length > 0 ? makeTime(d) : null,
        scheduled_for: new Date(`${d}T09:00`).toISOString(),
        created_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('tasks').insert(task).select().single()
      if (data) setTasks(prev => [data, ...prev])
    }
    resetForm()
    setNewTaskType('task'); setNewTaskDates([]); setTaskTimeEnabled(false)
    setTaskTimeHour(9); setTaskTimeMinute(0); setTaskEstimated('')
    setAddingTaskOverlay(false); setShowAddModal(false)
  }

  const toggleCalDate = (dateStr) => {
    setNewTaskDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr])
  }

  const saveDetailNote = async () => {
    const notes = detailNoteEdit.trim() || null
    const updated = { ...detailTask, notes }
    setTasks(prev => prev.map(t => t.id === detailTask.id ? updated : t))
    setDetailTask(updated)
    await supabase.from('tasks').update({ notes }).eq('id', detailTask.id)
  }

  const dismissDragHint = () => {
    setDragHintDismissed(true)
    if (typeof localStorage !== 'undefined') localStorage.setItem('fb_drag_hint_dismissed', '1')
  }

  const openDetailEdit = () => {
    const t = detailTask
    setDetailEditTitle(t.title)
    const due = t.due_time ? new Date(t.due_time) : null
    const existingDate = due ? due.toISOString().split('T')[0] : (t.scheduled_for ? new Date(t.scheduled_for).toISOString().split('T')[0] : '')
    setDetailEditDueDate(existingDate)
    setDetailEditDueTime(due ? `${String(due.getHours()).padStart(2,'0')}:${String(due.getMinutes()).padStart(2,'0')}` : '')
    setDetailEditConsequence(t.consequence_level || 'self')
    setDetailEditRecurrence(t.recurrence || 'none')
    setDetailEditNotes(t.notes || '')
    setDetailEditing(true)
  }

  const saveDetailEdit = async () => {
    if (!detailEditTitle.trim()) return
    setDetailSaving(true)
    let due_time = null
    if (detailEditDueDate) {
      const dateStr = detailEditDueTime ? `${detailEditDueDate}T${detailEditDueTime}` : `${detailEditDueDate}T23:59`
      due_time = new Date(dateStr).toISOString()
    }
    const updates = {
      title: detailEditTitle.trim(),
      due_time,
      consequence_level: detailEditConsequence,
      recurrence: detailEditRecurrence,
      notes: detailEditNotes.trim() || null,
    }
    await supabase.from('tasks').update(updates).eq('id', detailTask.id)
    const updated = { ...detailTask, ...updates }
    setTasks(prev => prev.map(t => t.id === detailTask.id ? updated : t))
    setDetailTask(updated)
    setDetailEditing(false)
    setDetailSaving(false)
    showToast('Task updated')
  }

  const parseBulkTasks = async () => {
    if (!bulkText.trim()) { showToast('Paste or speak your tasks first'); return }
    setBulkParsing(true)
    try {
      const res = await loggedFetch('/api/parse-bulk-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: bulkText })
      })
      const data = await res.json()
      setBulkPreview((data.tasks || []).map((t, i) => ({ ...t, _id: i })))
    } catch { showToast('Parse failed — try again') }
    setBulkParsing(false)
  }

  const addAllBulkTasks = async () => {
    if (!bulkPreview.length || !user) return
    const inserts = bulkPreview.map(t => {
      let due_time = null
      if (t.due_date) {
        const dateStr = t.due_time ? `${t.due_date}T${t.due_time}` : `${t.due_date}T23:59`
        due_time = new Date(dateStr).toISOString()
      }
      return {
        user_id: user.id, title: t.title, completed: false, archived: false,
        due_time, consequence_level: t.consequence_level || 'self',
        notes: t.notes || null, recurrence: t.recurrence || 'none',
        rollover_count: 0, priority_score: 0,
        created_at: new Date().toISOString(), scheduled_for: t.due_date ? new Date(`${t.due_date}T09:00`).toISOString() : new Date().toISOString(),
        starred: false, task_type: 'regular', estimated_minutes: null
      }
    })
    const { data } = await supabase.from('tasks').insert(inserts).select()
    if (data) setTasks(prev => [...data, ...prev])
    setBulkPreview([]); setBulkText(''); setAddMode('single'); setShowAddModal(false)
    showToast(`${inserts.length} task${inserts.length !== 1 ? 's' : ''} added`)
  }

  const startBulkListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input not supported. Try Chrome or Safari.'); return }
    const recognition = new SR()
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false
    recognition.onstart = () => setBulkListening(true)
    recognition.onend = () => setBulkListening(false)
    recognition.onresult = (e) => {
      const t = e.results[0][0].transcript
      setBulkText(prev => prev ? prev + '\n' + t : t)
    }
    recognition.onerror = () => setBulkListening(false)
    bulkRecognitionRef.current = recognition; recognition.start()
  }

  // Voice input
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Voice input not supported. Try Chrome or Safari.'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = false
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceTranscript(transcript); setParsing(true)
      try {
        const res = await loggedFetch('/api/parse-task', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        })
        const parsed = await res.json()
        if (parsed.title) setNewTitle(parsed.title)
        if (parsed.due_date) setNewDueDate(parsed.due_date)
        if (parsed.due_time) setNewDueTime(parsed.due_time)
        if (parsed.consequence_level) setNewConsequence(parsed.consequence_level)
        if (parsed.notes) setNewNotes(parsed.notes)
        if (parsed.recurrence) setNewRecurrence(parsed.recurrence)
      } catch (err) { console.error('[voice] Parse error:', err) }
      setParsing(false)
    }
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition; recognition.start()
  }

  const stopListening = () => { recognitionRef.current?.stop(); setListening(false) }

  // Voice FAB
  const startVoiceFab = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      libShowToast('Voice input not supported in this browser.', { type: 'error' })
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setVoiceFabState('recording')
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setVoiceFabState('processing')
      handleVoiceInput(transcript)
    }
    recognition.onerror = () => {
      setVoiceFabState('idle')
      libShowToast('Could not hear you. Try again.', { type: 'error' })
    }
    recognition.onend = () => {
      setVoiceFabState(prev => prev === 'recording' ? 'idle' : prev)
    }
    voiceFabRecognitionRef.current = recognition
    recognition.start()
  }

  const stopVoiceFab = () => {
    voiceFabRecognitionRef.current?.stop()
  }

  const handleVoiceFabClick = () => {
    if (voiceFabState === 'idle') startVoiceFab()
    else if (voiceFabState === 'recording') stopVoiceFab()
  }

  const handleVoiceInput = async (transcript) => {
    try {
      const res = await loggedFetch('/api/voice/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed')
      setVoiceFabState('idle')
      if (user) fetchTasks(user.id)
      libShowToast(`Created: ${data.message}`, {
        type: 'undo',
        duration: 5000,
        undoCallback: () => handleUndoVoiceTask(data.record.id, data.type)
      })
    } catch {
      setVoiceFabState('idle')
      libShowToast('Could not create task. Try again.', { type: 'error' })
    }
  }

  const handleUndoVoiceTask = async (id, type) => {
    try {
      if (type === 'bill') {
        await loggedFetch(`/api/bills/${id}`, { method: 'DELETE' })
      } else {
        await loggedFetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ archived: true })
        })
      }
      if (user) fetchTasks(user.id)
      libShowToast('Undone.', { type: 'success', duration: 2000 })
    } catch {
      libShowToast('Could not undo. Try again.', { type: 'error' })
    }
  }

  const dismissTutorial = async (complete) => {
    setShowTutorial(false)
    if (complete && user) {
      await supabase.from('profiles').update({ tutorial_completed: true }).eq('id', user.id)
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────

  const HP = '#FF6644'
  const EMBER = '#E8321A'
  const ASH = '#F5F0E3'
  const CHAR = '#3E3228'
  const greetLine = generateGreetingLine(tasks)

  const renderSection = (sectionId, label, sectionTasks, opts = {}) => {
    if (sectionTasks.length === 0) return null
    const collapsed = sectionCollapsed[sectionId]
    const isOverdue = opts.isOverdue
    const isDone = opts.isDone
    return (
      <div key={sectionId} style={{ marginBottom: 4 }}>
        <button
          className={styles.s17SectionHeader}
          onClick={() => toggleSection(sectionId)}
          style={{ color: isOverdue ? EMBER : undefined }}
        >
          <span className={styles.s17SectionLabel}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={styles.s17SectionBadge}
              style={{ background: isOverdue ? `${EMBER}22` : `${HP}18`, color: isOverdue ? EMBER : HP }}>
              {sectionTasks.length}
            </span>
            <span style={{ color: 'rgba(245,240,227,0.3)', fontSize: 16, transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)', display: 'inline-block', transition: 'transform 0.2s' }}>›</span>
          </div>
        </button>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {sectionTasks.map(task => {
              const isCompleting = completing === task.id
              const isDragOver = taskDragOver === task.id
              const hasXP = xpFloat?.taskId === task.id
              const countdown = getCountdownDisplay(task.due_time, tickNow)
              const typeBadge = task.task_type && task.task_type !== 'task' && task.task_type !== 'regular' ? task.task_type : null
              return (
                <div
                  key={task.id}
                  className={styles.s17TaskCard}
                  style={{
                    opacity: isCompleting ? 0 : 1,
                    transform: isCompleting ? 'translateX(80px)' : 'none',
                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                    pointerEvents: isCompleting ? 'none' : undefined,
                    borderTop: isDragOver ? `2px solid ${HP}` : undefined,
                    background: isDone ? 'transparent' : undefined,
                  }}
                  draggable={!isDone}
                  onDragStart={e => !isDone && handleTaskDragStart(e, task, sectionTasks, sectionId)}
                  onDragOver={e => !isDone && handleTaskDragOver(e, task.id)}
                  onDrop={e => !isDone && handleTaskDrop(e, task, sectionTasks)}
                  onDragLeave={() => setTaskDragOver(null)}
                  onDragEnd={() => { setTaskDragOver(null); dragSrcRef.current = null }}
                >
                  {hasXP && (
                    <div className={styles.xpFloat}>+{xpFloat.amount} XP</div>
                  )}
                  {isDone ? (
                    <button
                      className={styles.s17CheckCircleDone}
                      onClick={() => uncompleteTask(task)}
                      aria-label="Undo complete"
                    >✓</button>
                  ) : (
                    <button
                      className={`${styles.s17CheckCircle} ${isCompleting ? styles.s17CheckCircleFilling : ''}`}
                      onClick={() => completeTaskWithXP(task)}
                      aria-label="Complete task"
                    />
                  )}
                  <div
                    style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3, cursor: 'pointer' }}
                    onClick={() => setDetailTask(task)}
                  >
                    <span className={isDone ? styles.s17TaskTitleDone : styles.s17TaskTitle}>{task.title}</span>
                    {!isDone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {typeBadge && (
                          <span className={styles.s17TypeBadge}
                            style={{ background: typeBadge === 'appointment' ? '#1a3a4a' : typeBadge === 'bill' ? '#2a1a0a' : `${CHAR}cc`, color: typeBadge === 'appointment' ? '#66d4f0' : typeBadge === 'bill' ? '#FFB800' : ASH }}>
                            {typeBadge}
                          </span>
                        )}
                        {countdown ? (
                          <span style={{ fontSize: 11, color: HP, fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>{countdown}</span>
                        ) : task.due_time && (
                          <span style={{ fontSize: 11, color: 'rgba(245,240,227,0.4)', fontFamily: "'Sora', sans-serif" }}>
                            {new Date(task.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        {task.rollover_count > 0 && (
                          <span style={{ fontSize: 10, color: 'rgba(245,240,227,0.28)', fontFamily: "'Sora', sans-serif" }}>↷ {task.rollover_count}×</span>
                        )}
                      </div>
                    )}
                  </div>
                  {!isDone && (
                    <button
                      className={`${styles.s17StarBtn} ${task.starred ? styles.s17StarBtnActive : ''}`}
                      onClick={e => { e.stopPropagation(); toggleStarDB(task) }}
                      aria-label={task.starred ? 'Unstar' : 'Star'}
                      style={{ color: task.starred ? HP : 'rgba(245,240,227,0.2)' }}
                    >{task.starred ? '★' : '☆'}</button>
                  )}
                  {isDone && (
                    <button onClick={e => { e.stopPropagation(); if (!window.confirm('Delete?')) return; archiveTask(task) }} className={styles.taskActionDelete} title="Remove">×</button>
                  )}
                  {!isDone && (
                    <span className={styles.s17DragGrip} title="Drag to reorder">⠿</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', overflowY: 'auto', minHeight: '100%' }}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
    </div>
  )

  if (tasksError) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60%' }}>
      <ErrorState message="Couldn't load your data." onRetry={() => { setTasksError(false); setLoading(true); fetchTasks(user.id) }} />
    </div>
  )

  return (
    <>
      <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', overflowY: 'auto', minHeight: '100%' }}>

        {/* 1 — Morning Greeting Card */}
        {!greetingDismissed && (
          <div className={`${styles.s17GreetCard} ${greetCardAnimate ? styles.s17GreetCardAnimate : ''}`}>
            <button
              className={styles.s17GreetDismiss}
              onClick={() => {
                setGreetingDismissed(true)
                try { localStorage.setItem(`greeting_dismissed_${todayStr()}`, '1') } catch {}
              }}
              aria-label="Dismiss"
            >×</button>
            <div className={styles.s17GreetHeadline}>{greeting}, {firstName}</div>
            <div className={styles.s17GreetLine}>{greetLine}</div>
          </div>
        )}

        {/* 2 — Overdue Card */}
        {s17Overdue.length > 0 && (() => {
          const worst = s17Overdue[0]
          const daysOver = Math.floor((s17Today - new Date(worst.scheduled_for).setHours(0,0,0,0)) / 86400000)
          return (
            <div className={styles.s17OverdueCard}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: EMBER, marginBottom: 4, fontFamily: "'Figtree', sans-serif" }}>Overdue</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ASH, fontFamily: "'Figtree', sans-serif", lineHeight: 1.3, marginBottom: 4 }}>{worst.title}</div>
                  <div style={{ fontSize: 12, color: EMBER, fontFamily: "'Sora', sans-serif", fontWeight: 600 }}>{daysOver} day{daysOver !== 1 ? 's' : ''} overdue</div>
                  {s17Overdue.length > 1 && (
                    <div style={{ fontSize: 12, color: 'rgba(245,240,227,0.45)', marginTop: 4, fontFamily: "'Sora', sans-serif" }}>+{s17Overdue.length - 1} more overdue</div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className={styles.s17OverdueDoNow} onClick={() => completeTaskWithXP(worst)}>Do now</button>
                <button className={styles.s17OverdueReschedule} onClick={() => rescheduleTask(worst)}>Reschedule →</button>
              </div>
            </div>
          )
        })()}

        {/* 3 — Priority Card */}
        {s17StarredTask && (
          <div className={styles.s17PriorityCard}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: HP, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: HP, display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  Your #1 priority
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: ASH, fontFamily: "'Figtree', sans-serif", lineHeight: 1.3 }}>{s17StarredTask.title}</div>
                {s17StarredCountdown && (
                  <div style={{ fontSize: 13, color: HP, fontFamily: "'Sora', sans-serif", fontWeight: 600, marginTop: 4 }}>{s17StarredCountdown}</div>
                )}
              </div>
            </div>
            <button
              className={styles.s17StartTimerBtn}
              onClick={() => { setElectedTaskId(s17StarredTask.id); switchTab('focus') }}
            >Start timer →</button>
          </div>
        )}

        {/* 4 — Momentum Bar */}
        <div className={styles.s17MomentumWrap}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontFamily: "'Figtree', sans-serif", color: 'rgba(245,240,227,0.5)', fontWeight: 600 }}>
              🔥 {profile?.current_streak || 0} streak
            </span>
            <span style={{ fontSize: 11, fontFamily: "'Figtree', sans-serif", color: 'rgba(245,240,227,0.4)', fontWeight: 600 }}>
              {profile?.total_xp || 0} XP
            </span>
          </div>
          <div className={styles.s17MomentumTrack}>
            <div
              className={styles.s17MomentumFill}
              style={{ width: s17TotalToday > 0 ? `${Math.min(100, (s17CompletedCount / s17TotalToday) * 100)}%` : '0%' }}
            />
          </div>
        </div>

        {/* 5 — Collapsible task sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {renderSection('overdue', 'Overdue', s17Overdue, { isOverdue: true })}
          {renderSection('today', 'Today', s17TodayTasks)}
          {renderSection('tomorrow', 'Tomorrow', s17TomorrowTasks)}
          {renderSection('thisWeek', 'This Week', s17WeekTasks)}
          {renderSection('later', 'Later', s17LaterTasks)}
          {renderSection('completedToday', 'Completed Today', s17CompletedToday, { isDone: true })}
        </div>

        {/* Empty state */}
        {s17Pending.length === 0 && s17CompletedToday.length === 0 && (
          <EmptyState
            useMarkIcon
            headline="Your day is a blank slate."
            subtext="Add your first task and let's get moving."
            ctaLabel="Add a task"
            onCtaClick={() => setShowAddModal(true)}
          />
        )}

        {/* 8 — Add task button */}
        <button className={styles.s17AddFab} onClick={() => setShowAddModal(true)}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>+</span> Add task
        </button>

      </div>

      {/* ADD TASK MODAL — S17 */}
      {showAddModal && (
        <div className={styles.s17OverlayBg} onClick={e => e.target === e.currentTarget && (setShowAddModal(false), resetForm(), setAddMode('single'), setBulkPreview([]), setBulkText(''), setNewTaskDates([]), setNewTaskType('task'), setTaskTimeEnabled(false))}>
          <div className={styles.s17OverlaySheet}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New task</h2>
              <button onClick={() => { setShowAddModal(false); resetForm(); setAddMode('single'); setBulkPreview([]); setBulkText(''); setNewTaskDates([]); setNewTaskType('task'); setTaskTimeEnabled(false) }} className={styles.modalClose}>×</button>
            </div>

            {/* Mode tabs: Single | Bulk | Voice */}
            <div className={styles.s17ModeTabs}>
              {[['single','Single'],['bulk','Bulk'],['voice','Voice']].map(([mode, label]) => (
                <button key={mode} type="button"
                  className={`${styles.s17ModeTab} ${addMode === mode ? styles.s17ModeTabActive : ''}`}
                  onClick={() => setAddMode(mode)}>
                  {label}
                </button>
              ))}
            </div>

            {/* ─ Single mode ─ */}
            {addMode === 'single' && (
              <form onSubmit={addTaskFromOverlay} className={styles.modalForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>What needs to get done?</label>
                  <input ref={titleInputRef} type="text" placeholder="e.g. Call the insurance company"
                    value={newTitle} onChange={e => { setNewTitle(e.target.value); if (titleInputError) setTitleInputError(false) }}
                    className={`${styles.fieldInput} ${titleInputError ? styles.titleInputError : ''}`} />
                </div>

                {/* Task type selector */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Type</label>
                  <div className={styles.toggleRow}>
                    {[['task','Task'],['bill','Bill'],['appointment','Appt'],['chore','Chore']].map(([val,lbl]) => (
                      <button key={val} type="button"
                        onClick={() => setNewTaskType(val)}
                        className={`${styles.toggleBtn} ${newTaskType === val ? styles.toggleBtnActive : ''}`}>{lbl}</button>
                    ))}
                  </div>
                  {(newTaskType === 'bill') && <p className={styles.fieldHint}>Will also appear in Finance.</p>}
                  {(newTaskType === 'appointment') && <p className={styles.fieldHint}>Gets calendar icon treatment.</p>}
                </div>

                {/* Multi-day calendar */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Date{newTaskDates.length > 1 ? `s — ${newTaskDates.length} selected` : ''}
                    {newTaskDates.length > 0 && <button type="button" onClick={() => setNewTaskDates([])} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'rgba(245,240,227,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: "'Figtree', sans-serif" }}>clear</button>}
                  </label>
                  <div className={styles.quickRow}>
                    <button type="button" onClick={() => toggleCalDate(todayStr())}
                      className={`${styles.quickBtn} ${newTaskDates.includes(todayStr()) ? styles.quickBtnActive : ''}`}>Today</button>
                    <button type="button" onClick={() => toggleCalDate(tomorrowStr())}
                      className={`${styles.quickBtn} ${newTaskDates.includes(tomorrowStr()) ? styles.quickBtnActive : ''}`}>Tomorrow</button>
                  </div>
                  {/* Mini calendar */}
                  <div className={styles.s17CalendarWrap}>
                    <div className={styles.s17CalHeader}>
                      <button type="button" onClick={() => setCalPickerMonth(d => new Date(d.getFullYear(), d.getMonth()-1, 1))} className={styles.s17CalNav}>‹</button>
                      <span style={{ fontSize: 13, color: 'rgba(245,240,227,0.7)', fontFamily: "'Figtree', sans-serif", fontWeight: 600 }}>
                        {calPickerMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button type="button" onClick={() => setCalPickerMonth(d => new Date(d.getFullYear(), d.getMonth()+1, 1))} className={styles.s17CalNav}>›</button>
                    </div>
                    <div className={styles.s17CalGrid}>
                      {['S','M','T','W','T','F','S'].map((d,i) => (
                        <div key={i} style={{ textAlign:'center', fontSize: 10, color: 'rgba(245,240,227,0.3)', fontFamily: "'Sora', sans-serif", padding: '2px 0' }}>{d}</div>
                      ))}
                      {(() => {
                        const year = calPickerMonth.getFullYear()
                        const month = calPickerMonth.getMonth()
                        const firstDay = new Date(year, month, 1).getDay()
                        const daysInMonth = new Date(year, month+1, 0).getDate()
                        const cells = []
                        for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
                        for (let d = 1; d <= daysInMonth; d++) {
                          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                          const sel = newTaskDates.includes(ds)
                          const isToday = ds === todayStr()
                          cells.push(
                            <button key={ds} type="button"
                              onClick={() => toggleCalDate(ds)}
                              className={`${styles.s17CalDay} ${sel ? styles.s17CalDaySelected : ''} ${isToday ? styles.s17CalDayToday : ''}`}>
                              {d}
                            </button>
                          )
                        }
                        return cells
                      })()}
                    </div>
                  </div>
                </div>

                {/* Custom time picker */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>
                    Time
                    <button type="button"
                      onClick={() => setTaskTimeEnabled(v => !v)}
                      style={{ marginLeft: 10, background: 'none', border: 'none', color: taskTimeEnabled ? '#FF6644' : 'rgba(245,240,227,0.35)', fontSize: 12, cursor: 'pointer', fontFamily: "'Figtree', sans-serif" }}>
                      {taskTimeEnabled ? '✓ set' : '+ set time'}
                    </button>
                  </label>
                  {taskTimeEnabled && (
                    <div className={styles.s17TimePicker}>
                      <div className={styles.s17TimeCol}>
                        {Array.from({length: 12}, (_,i) => i+1).concat([0]).map(h => (
                          <button key={h} type="button"
                            className={`${styles.s17TimeCell} ${taskTimeHour === h ? styles.s17TimeCellActive : ''}`}
                            onClick={() => setTaskTimeHour(h)}>
                            {h === 0 ? '12' : String(h).padStart(2,'0')}
                          </button>
                        ))}
                      </div>
                      <span style={{ color: 'rgba(245,240,227,0.3)', fontSize: 18, padding: '0 4px', alignSelf: 'center' }}>:</span>
                      <div className={styles.s17TimeCol}>
                        {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                          <button key={m} type="button"
                            className={`${styles.s17TimeCell} ${taskTimeMinute === m ? styles.s17TimeCellActive : ''}`}
                            onClick={() => setTaskTimeMinute(m)}>
                            {String(m).padStart(2,'0')}
                          </button>
                        ))}
                      </div>
                      <div className={styles.s17TimeCol}>
                        {[['AM', taskTimeHour < 12], ['PM', taskTimeHour >= 12]].map(([label, active]) => (
                          <button key={label} type="button"
                            className={`${styles.s17TimeCell} ${active ? styles.s17TimeCellActive : ''}`}
                            onClick={() => {
                              if (label === 'AM' && taskTimeHour >= 12) setTaskTimeHour(h => h - 12)
                              if (label === 'PM' && taskTimeHour < 12) setTaskTimeHour(h => h + 12)
                            }}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estimated time */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Estimated time <span className={styles.fieldLabelOptional}>(minutes, optional)</span></label>
                  <div className={styles.quickRow}>
                    {[15,30,60,90].map(m => (
                      <button key={m} type="button"
                        onClick={() => setTaskEstimated(taskEstimated === String(m) ? '' : String(m))}
                        className={`${styles.quickBtn} ${taskEstimated === String(m) ? styles.quickBtnActive : ''}`}>{m}m</button>
                    ))}
                    <input type="number" placeholder="custom" min="1" max="480"
                      value={taskEstimated}
                      onChange={e => setTaskEstimated(e.target.value)}
                      className={styles.fieldInputCompact}
                      style={{ width: 72 }} />
                  </div>
                </div>

                {/* Notes */}
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Notes <span className={styles.fieldLabelOptional}>(optional)</span></label>
                  <input type="text" placeholder="Context that makes this easier to start"
                    value={newNotes} onChange={e => setNewNotes(e.target.value)} className={styles.fieldInput} />
                </div>

                <button type="submit" disabled={addingTaskOverlay || !newTitle.trim()} className={styles.s17SubmitBtn}>
                  {addingTaskOverlay ? 'Adding…' : newTaskDates.length > 1 ? `Add ${newTaskDates.length} tasks` : 'Add task'}
                </button>
              </form>
            )}

            {/* ─ Bulk mode ─ */}
            {addMode === 'bulk' && (
              <div className={styles.modalForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>One task per line</label>
                  <textarea
                    className={styles.bulkTextarea}
                    placeholder={"Call the insurance company\nPay electric bill by Friday\nSchedule dentist appointment"}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                  />
                </div>
                <div className={styles.bulkActionRow}>
                  <button type="button" onClick={() => navigator.clipboard.readText().then(t => setBulkText(prev => prev ? prev + '\n' + t : t)).catch(() => {})} className={styles.bulkActionBtn}>
                    Paste
                  </button>
                  <button type="button" onClick={parseBulkTasks} disabled={bulkParsing || !bulkText.trim()} className={styles.bulkParseBtn}>
                    {bulkParsing ? 'Parsing...' : 'Parse →'}
                  </button>
                </div>
                {bulkPreview.length > 0 && (
                  <>
                    <div className={styles.fieldGroup} style={{ marginTop: 16 }}>
                      <label className={styles.fieldLabel}>Preview — {bulkPreview.length} tasks</label>
                      <div className={styles.bulkPreviewList}>
                        {bulkPreview.map((t, i) => (
                          <div key={t._id} className={styles.bulkPreviewItem}>
                            <input className={styles.bulkPreviewInput} value={t.title}
                              onChange={e => setBulkPreview(prev => prev.map((x, xi) => xi === i ? { ...x, title: e.target.value } : x))} />
                            <button type="button" onClick={() => setBulkPreview(prev => prev.filter((_, xi) => xi !== i))} className={styles.bulkPreviewRemove}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={addAllBulkTasks} className={styles.s17SubmitBtn}>
                      Add {bulkPreview.length} tasks
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ─ Voice mode ─ */}
            {addMode === 'voice' && (
              <div className={styles.modalForm}>
                {(listening || parsing || voiceTranscript) && (
                  <div className={styles.voiceState}>
                    {listening && (
                      <div className={styles.voiceListening}>
                        <span className={styles.voiceDot} /><span className={styles.voiceDot} /><span className={styles.voiceDot} />
                        <span className={styles.voiceListeningText}>Listening...</span>
                      </div>
                    )}
                    {parsing && <div className={styles.voiceParsing}>Parsing your task...</div>}
                    {voiceTranscript && !listening && !parsing && <div className={styles.voiceTranscript}>"{voiceTranscript}"</div>}
                  </div>
                )}
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <button type="button"
                    onClick={listening ? stopListening : startListening}
                    className={`${styles.s17VoiceFab} ${listening ? styles.micBtnActive : ''}`}>
                    {listening ? (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                    ) : (
                      <Microphone size={28} />
                    )}
                  </button>
                  <p style={{ fontSize: 13, color: 'rgba(245,240,227,0.4)', marginTop: 12, fontFamily: "'Figtree', sans-serif" }}>
                    {listening ? 'Tap to stop' : 'Tap to speak your task'}
                  </p>
                </div>
                {newTitle && (
                  <form onSubmit={addTaskFromOverlay} className={styles.modalForm}>
                    <div className={styles.fieldGroup}>
                      <label className={styles.fieldLabel}>Parsed task</label>
                      <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className={styles.fieldInput} />
                    </div>
                    <button type="submit" disabled={addingTaskOverlay} className={styles.s17SubmitBtn}>
                      {addingTaskOverlay ? 'Adding…' : 'Add task'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {detailTask && (
        <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && (setDetailTask(null), setDetailEditing(false))}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              {detailEditing ? (
                <input className={styles.detailEditTitleInput} value={detailEditTitle}
                  onChange={e => setDetailEditTitle(e.target.value)} autoFocus />
              ) : (
                <h2 className={styles.detailTitle}>{detailTask.title}</h2>
              )}
              <div className={styles.modalHeaderRight}>
                {!detailEditing && (
                  <button onClick={openDetailEdit} className={styles.detailEditBtn}>Edit</button>
                )}
                <button onClick={() => { setDetailTask(null); setDetailEditing(false) }} className={styles.modalClose}>×</button>
              </div>
            </div>

            {detailEditing ? (
              <div className={styles.detailEditForm}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Due date</label>
                  <div className={styles.quickRow}>
                    <button type="button" onClick={() => setDetailEditDueDate(todayStr())}
                      className={`${styles.quickBtn} ${detailEditDueDate === todayStr() ? styles.quickBtnActive : ''}`}>Today</button>
                    <button type="button" onClick={() => setDetailEditDueDate(tomorrowStr())}
                      className={`${styles.quickBtn} ${detailEditDueDate === tomorrowStr() ? styles.quickBtnActive : ''}`}>Tomorrow</button>
                    <input type="date" value={detailEditDueDate} onChange={e => setDetailEditDueDate(e.target.value)} className={styles.fieldInputCompact} />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Due time</label>
                  <div className={styles.quickRow}>
                    {[['Morning', '09:00'], ['Afternoon', '14:00'], ['Evening', '18:00']].map(([label, val]) => (
                      <button key={val} type="button"
                        onClick={() => { setDetailEditDueTime(val); if (!detailEditDueDate) setDetailEditDueDate(todayStr()) }}
                        className={`${styles.quickBtn} ${detailEditDueTime === val ? styles.quickBtnActive : ''}`}>{label}</button>
                    ))}
                    <span className={styles.orLabel}>or</span>
                    <input type="time" value={detailEditDueTime} onChange={e => { setDetailEditDueTime(e.target.value); if (!detailEditDueDate) setDetailEditDueDate(todayStr()) }}
                      className={styles.fieldInputCompact} />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Type</label>
                  <div className={styles.toggleRow}>
                    <button type="button" onClick={() => setDetailEditConsequence('self')}
                      className={`${styles.toggleBtn} ${detailEditConsequence === 'self' ? styles.toggleBtnActive : ''}`}>Personal</button>
                    <button type="button" onClick={() => setDetailEditConsequence('external')}
                      className={`${styles.toggleBtn} ${detailEditConsequence === 'external' ? styles.toggleBtnActive : ''}`}>External commitment</button>
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Repeat</label>
                  <div className={styles.toggleRow}>
                    {RECURRENCE_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setDetailEditRecurrence(opt.value)}
                        className={`${styles.toggleBtn} ${detailEditRecurrence === opt.value ? styles.toggleBtnActive : ''}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Notes</label>
                  <input type="text" placeholder="Context or notes..." value={detailEditNotes}
                    onChange={e => setDetailEditNotes(e.target.value)} className={styles.fieldInput} />
                </div>
              </div>
            ) : (
              <div className={styles.detailBody}>
                {(detailTask.due_time || detailTask.due_date) && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Due</span>
                    <span className={styles.detailValue}>
                      {detailTask.due_time
                        ? `${new Date(detailTask.due_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${new Date(detailTask.due_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                        : detailTask.due_date}
                    </span>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={`${styles.detailValue} ${detailTask.consequence_level === 'external' ? styles.detailValueExt : ''}`}>
                    {detailTask.consequence_level === 'external' ? 'External commitment' : 'Personal'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Repeats</span>
                  <span className={styles.detailValue}>
                    {detailTask.recurrence === 'daily' ? 'Daily' : detailTask.recurrence === 'weekly' ? 'Weekly' : 'Once'}
                  </span>
                </div>
                {detailTask.rollover_count > 0 && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Rolled over</span>
                    <span className={styles.detailValue}>{detailTask.rollover_count}×</span>
                  </div>
                )}
                <div className={styles.detailNotesBlock}>
                  <span className={styles.detailLabel}>Notes</span>
                  {(detailNoteEditing || !detailTask.notes) ? (
                    <div className={styles.detailNoteEditRow}>
                      <input type="text" className={styles.detailNoteInput} placeholder="Add a note..."
                        value={detailNoteEdit} onChange={e => setDetailNoteEdit(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && saveDetailNote()} autoFocus={detailNoteEditing} />
                      <button className={styles.detailNoteSaveBtn} onClick={saveDetailNote}>Save</button>
                    </div>
                  ) : (
                    <p className={styles.detailNotesText} onClick={() => setDetailNoteEditing(true)} style={{ cursor: 'pointer' }} title="Click to edit">
                      {detailTask.notes}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className={styles.detailActions}>
              {detailEditing ? (
                <>
                  <button className={styles.detailBtnPrimary} onClick={saveDetailEdit} disabled={detailSaving || !detailEditTitle.trim()}>
                    {detailSaving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button className={styles.detailBtnSecondary} onClick={() => setDetailEditing(false)}>Cancel</button>
                </>
              ) : (
                <>
                  {detailTask.completed ? (
                    <button className={styles.detailBtnSecondary} onClick={() => { uncompleteTask(detailTask); setDetailTask(null) }}>Mark incomplete</button>
                  ) : (
                    <button className={styles.detailBtnPrimary} onClick={() => { completeTask(detailTask); setDetailTask(null) }}>Mark complete</button>
                  )}
                  <button className={styles.detailBtnSecondary} onClick={() => { rescheduleTask(detailTask); setDetailTask(null) }}>Push to tomorrow</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TUTORIAL OVERLAY */}
      {showTutorial && (() => {
        const TUTORIAL_STEPS = [
          { icon: '☑️', title: 'Your Task Deck', body: 'Add tasks by typing or tapping the mic. Star a task to set it as your priority focus. Drag to reorder. Tap any task to edit details, set a due time, or add notes.' },
          { icon: '💬', title: 'Your AI Coach Checks In', body: 'Three times a day — morning, midday, and evening — Cinis reaches out. It knows your task list and coaches you in your style. The more you engage, the smarter it gets.' },
          { icon: '🎯', title: 'Lock In With Focus Mode', body: 'Pick a task, pick a duration (5 to 60 minutes), and go. When time\'s up, tell Cinis how it went. Nailed it, made progress, or got stuck — each response shapes what happens next.' },
          { icon: '📓', title: 'Think Out Loud', body: 'The journal is your private space. Cinis listens, reflects back what it notices, and asks one good question. If you mention something that sounds like a task, it offers to add it. Entries are saved automatically.' },
        ]
        const step = TUTORIAL_STEPS[tutorialStep]
        const isLast = tutorialStep === TUTORIAL_STEPS.length - 1
        return (
          <div className={styles.tutorialOverlay}>
            <div className={styles.tutorialCard}>
              <div className={styles.tutorialIcon}>{step.icon}</div>
              <div className={styles.tutorialTitle}>{step.title}</div>
              <div className={styles.tutorialBody}>{step.body}</div>
              <div className={styles.tutorialFooter}>
                <div className={styles.tutorialDots}>
                  {TUTORIAL_STEPS.map((_, i) => (
                    <div key={i} className={`${styles.tutorialDot} ${i === tutorialStep ? styles.tutorialDotActive : ''}`} />
                  ))}
                </div>
                <div className={styles.tutorialActions}>
                  <button className={styles.tutorialSkip} onClick={() => dismissTutorial(true)}>Skip</button>
                  <button className={styles.tutorialNext} onClick={() => {
                    if (isLast) { dismissTutorial(true) }
                    else setTutorialStep(s => s + 1)
                  }}>
                    {isLast ? "Let's go →" : 'Next →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* STREAK CELEBRATION OVERLAY */}
      {showStreakCelebration && (() => {
        const MILESTONE_TEXT = { 7: 'One week strong.', 14: 'Two weeks.', 30: 'A whole month.', 60: 'Two months.', 90: 'Ninety days.', 365: 'A full year.' }
        const subtext = MILESTONE_TEXT[streakCelebMilestone] || ''
        return (
          <div className={styles.streakOverlay} onClick={() => setShowStreakCelebration(false)}>
            <div className={styles.streakContent}>
              {Array.from({ length: 20 }, (_, i) => {
                const angle = (i / 20) * 360
                const dist = 80 + (i % 3) * 30
                const px = Math.round(Math.cos(angle * Math.PI / 180) * dist)
                const py = Math.round(Math.sin(angle * Math.PI / 180) * dist)
                return (
                  <div
                    key={i}
                    className={styles.streakParticle}
                    style={{ '--px': `${px}px`, '--py': `${py}px`, animationDelay: `${(i % 5) * 50}ms`, opacity: 0.4 + (i % 3) * 0.2 }}
                  />
                )
              })}
              <div className={styles.streakNum}>{streakCelebMilestone}</div>
              <div className={styles.streakLabel}>Day Streak</div>
              <div className={styles.streakSubtext}>{subtext}</div>
              <div className={styles.streakDismiss}>Tap anywhere to continue</div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
