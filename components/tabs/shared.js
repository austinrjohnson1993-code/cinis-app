import React, { useState, useEffect } from 'react'
import styles from '../../styles/Dashboard.module.css'
import CinisMark from '../../lib/CinisMark'
import { COLORS } from '../../lib/constants'

// ── THEMES ──────────────────────────────────────────────────────────────────
export const THEMES = [
  { id: 'orange-bronze', name: 'Classic', accent: COLORS.hot, gradient: 'radial-gradient(ellipse at top left, rgba(101,60,10,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(80,45,8,0.35) 0%, transparent 60%)', logo: COLORS.hot, dataTheme: 'classic', bg: COLORS.coal, cardBg: COLORS.char },
  { id: 'teal-ocean', name: 'Ocean', accent: '#2dd4bf', gradient: 'radial-gradient(ellipse at top left, rgba(15,80,90,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(10,60,70,0.35) 0%, transparent 60%)', logo: '#2dd4bf', bg: '#0A1A1C', cardBg: '#0F2A2E' },
  { id: 'purple-cosmos', name: 'Cosmos', accent: '#8b5cf6', gradient: 'radial-gradient(ellipse at top left, rgba(60,20,120,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(40,10,90,0.35) 0%, transparent 60%)', logo: '#8b5cf6', bg: '#0D0A1A', cardBg: '#1A1230' },
  { id: 'blue-arctic', name: 'Arctic', accent: '#3b82f6', gradient: 'radial-gradient(ellipse at top left, rgba(15,40,100,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(10,30,80,0.35) 0%, transparent 60%)', logo: '#3b82f6', bg: '#090F1E', cardBg: '#111C36' },
  { id: 'green-forest', name: 'Forest', accent: '#22c55e', gradient: 'radial-gradient(ellipse at top left, rgba(10,70,30,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(8,50,20,0.35) 0%, transparent 60%)', logo: '#22c55e', bg: '#081410', cardBg: '#0F2018' },
  { id: 'rose-sunset', name: 'Sunset', accent: '#f43f5e', gradient: 'radial-gradient(ellipse at top left, rgba(120,20,40,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(90,15,30,0.35) 0%, transparent 60%)', logo: '#f43f5e', bg: '#1A080C', cardBg: '#2E0F16' },
  { id: 'amber-desert', name: 'Desert', accent: '#f59e0b', gradient: 'radial-gradient(ellipse at top left, rgba(120,70,5,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(90,50,5,0.35) 0%, transparent 60%)', logo: '#f59e0b', bg: '#1A1208', cardBg: '#2E200A' },
  { id: 'cyan-electric', name: 'Electric', accent: '#06b6d4', gradient: 'radial-gradient(ellipse at top left, rgba(5,70,100,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(5,50,80,0.35) 0%, transparent 60%)', logo: '#06b6d4', bg: '#071218', cardBg: '#0C2030' },
  { id: 'indigo-night', name: 'Night', accent: '#6366f1', gradient: 'radial-gradient(ellipse at top left, rgba(30,20,100,0.4) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(20,15,80,0.35) 0%, transparent 60%)', logo: '#6366f1', bg: '#0A0A1A', cardBg: '#14142E' },
  { id: 'drill-sergeant', name: 'Command', accent: '#ef4444', gradient: 'radial-gradient(ellipse at top left, rgba(100,10,10,0.5) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(80,5,5,0.4) 0%, transparent 60%)', logo: '#ef4444', bg: '#1A0808', cardBg: '#2E1010' },
  { id: 'midnight', name: 'Midnight', accent: '#ffffff', gradient: 'radial-gradient(ellipse at top left, rgba(20,20,50,0.6) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(10,10,40,0.5) 0%, transparent 60%)', logo: '#ffffff', dataTheme: 'midnight', bg: '#0D0D1A', cardBg: '#1A1A2E' },
  { id: 'warm', name: 'Warm', accent: '#FF8C42', gradient: 'radial-gradient(ellipse at top left, rgba(100,50,10,0.5) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(80,30,5,0.4) 0%, transparent 60%)', logo: '#FF8C42', dataTheme: 'warm', bg: '#1A0F0A', cardBg: '#3D2B1F' },
]

export { applyAccentColor, DEFAULT_ACCENTS } from '../../lib/accentColor'

export function applyTheme(theme) {
  if (!theme || typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-gradient', theme.gradient)
  root.style.setProperty('--logo-color', theme.logo)
  if (theme.dataTheme) {
    root.setAttribute('data-theme', theme.dataTheme)
  } else {
    root.removeAttribute('data-theme')
  }
  root.style.setProperty('--bg-color', theme.bg || COLORS.coal)
  root.style.setProperty('--card-bg', theme.cardBg || COLORS.char)
  root.style.setProperty('--night', theme.bg || COLORS.coal)
  root.style.setProperty('--cream', COLORS.ash)
  root.style.setProperty('--text-color', COLORS.ash)
  root.style.setProperty('--text-muted', 'rgba(240,234,214,0.5)')
  root.style.setProperty('--border-color', 'rgba(240,234,214,0.09)')
  const { applyAccentColor } = require('../../lib/accentColor')
  applyAccentColor(theme.accent, theme.id)
}

// ── Date helpers ────────────────────────────────────────────────────────────
export function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export function todayStr() { return localDateStr(new Date()) }
export function tomorrowStr() {
  const t = new Date(); t.setDate(t.getDate() + 1); return localDateStr(t)
}

// ── Task helpers ────────────────────────────────────────────────────────────
export function computePriorityScore(task) {
  if (task.completed) return 0
  let score = 50
  if (task.due_time) {
    const hoursUntilDue = (new Date(task.due_time) - new Date()) / (1000 * 60 * 60)
    if (hoursUntilDue < 0)       score += 100
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

export function sortByPriority(tasks) {
  return [...tasks]
    .map(t => ({ ...t, priority_score: computePriorityScore(t) }))
    .sort((a, b) => b.priority_score - a.priority_score)
}

export function sortBySchedule(tasks) {
  const now = new Date()
  const todayLocal = localDateStr(now)
  return [...tasks].sort((a, b) => {
    const getEffective = (t) => {
      if (t.due_time) return new Date(t.due_time)
      if (t.scheduled_for) return new Date(t.scheduled_for)
      return null
    }
    const aDate = getEffective(a)
    const bDate = getEffective(b)
    const aIsToday = aDate && localDateStr(aDate) === todayLocal
    const bIsToday = bDate && localDateStr(bDate) === todayLocal
    if (aIsToday && !bIsToday) return -1
    if (!aIsToday && bIsToday) return 1
    if (aIsToday && bIsToday) {
      if (a.due_time && b.due_time) return new Date(a.due_time) - new Date(b.due_time)
      if (a.due_time && !b.due_time) return -1
      if (!a.due_time && b.due_time) return 1
      const aOrd = a.sort_order ?? 999999
      const bOrd = b.sort_order ?? 999999
      return aOrd - bOrd
    }
    if (aDate && !bDate) return -1
    if (!aDate && bDate) return 1
    if (aDate && bDate) return aDate - bDate
    const aOrd = a.sort_order ?? 999999
    const bOrd = b.sort_order ?? 999999
    return aOrd - bOrd
  })
}

export function formatDueTime(due_time) {
  if (!due_time) return null
  const due = new Date(due_time)
  const hoursUntil = (due - new Date()) / (1000 * 60 * 60)
  const timeStr = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (hoursUntil < 0)  return { label: `Overdue · ${timeStr}`, urgent: true }
  if (hoursUntil < 1)  return { label: `Due in ${Math.round(hoursUntil * 60)}m`, urgent: true }
  if (hoursUntil < 3)  return { label: `Due at ${timeStr}`, urgent: true }
  return { label: `Due at ${timeStr}`, urgent: false }
}

export function taskBaseDate(task) {
  if (task.due_date) {
    const [y, m, d] = task.due_date.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  if (task.due_time) {
    const dt = new Date(task.due_time)
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  }
  if (task.scheduled_for) {
    const dt = new Date(task.scheduled_for)
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  }
  return null
}

export function getTasksForDate(tasks, date) {
  return tasks.filter(t => {
    if (t.archived) return false
    const base = taskBaseDate(t)
    if (!base) return false
    if (t.recurrence === 'daily') return date >= base
    if (t.recurrence === 'weekly') {
      if (date < base) return false
      const diffDays = Math.round((date - base) / 86400000)
      return diffDays % 7 === 0
    }
    if (t.recurrence === 'monthly') {
      if (date < base) return false
      return date.getDate() === base.getDate()
    }
    return localDateStr(base) === localDateStr(date)
  })
}

export function getTaskOccurrencesForMonth(tasks, year, month) {
  const result = {}
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const matches = getTasksForDate(tasks, date)
    if (matches.length > 0) result[localDateStr(date)] = matches
  }
  return result
}

export function getTaskDateLabel(task) {
  if (!task.scheduled_for && !task.due_time) return null
  const date = new Date(task.scheduled_for || task.due_time)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24))
  if (diffDays <= 7) return days[date.getDay()]
  return `${days[date.getDay()].slice(0,3)} ${months[date.getMonth()]} ${date.getDate()}`
}

// ── Countdown helpers ───────────────────────────────────────────────────────
export function useCountdown(targetTime) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!targetTime) { setTimeLeft(''); return }
    const update = () => {
      const now = new Date()
      const target = new Date(targetTime)
      if (target.toDateString() !== now.toDateString()) { setTimeLeft(''); return }
      const diff = target - now
      if (diff <= 0) { setTimeLeft('Due now'); return }
      const totalSecs = Math.floor(diff / 1000)
      const h = Math.floor(totalSecs / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetTime])
  return timeLeft
}

export function getCountdownDisplay(due_time, now) {
  if (!due_time) return null
  const target = new Date(due_time)
  if (target.toDateString() !== now.toDateString()) return null
  const diff = target - now
  if (diff <= 0) return 'Due Now'
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `Due in ${hours}h ${mins}m`
  return `Due in ${mins}m`
}

// ── Format helpers ──────────────────────────────────────────────────────────
export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n) || 0)
}

// ── Chat history ────────────────────────────────────────────────────────────
export function loadChatHistory(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}
export function saveChatHistory(key, messages) {
  try { localStorage.setItem(key, JSON.stringify(messages.slice(-50))) } catch {}
}

// ── Check-in helpers ────────────────────────────────────────────────────────
export function getCheckinType() {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'morning'
  if (h >= 11 && h < 16) return 'midday'
  return 'evening'
}

export function sanitizeInsight(raw) {
  if (!raw) return ''
  const lines = raw.split('\n').filter(l => !l.trim().startsWith('#'))
  const text = lines.join(' ').replace(/\*\*?([^*]+)\*\*?/g, '$1').replace(/_([^_]+)_/g, '$1').trim()
  if (!text) return ''
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  if (sentences.length <= 2) return text
  return sentences.slice(0, 2).join(' ') + '...'
}

// ── Greeting ────────────────────────────────────────────────────────────────
export function generateGreetingLine(tasks) {
  const todayD = new Date(); todayD.setHours(0,0,0,0)
  const yStr = (() => { const d = new Date(); d.setDate(d.getDate()-1); return localDateStr(d) })()
  const yesterdayDone = tasks.filter(t => t.completed && t.completed_at && localDateStr(new Date(t.completed_at)) === yStr).length
  const overdue = tasks.filter(t => {
    if (t.completed || t.archived || !t.scheduled_for) return false
    const sf = new Date(t.scheduled_for); sf.setHours(0,0,0,0)
    return sf < todayD
  })
  if (overdue.length > 0) {
    const oldest = overdue.reduce((p,c) => new Date(p.scheduled_for) < new Date(c.scheduled_for) ? p : c)
    const days = Math.floor((todayD - new Date(oldest.scheduled_for).setHours(0,0,0,0)) / 86400000)
    if (days >= 2) return `"${oldest.title}" has been waiting ${days} days. Today's a good time.`
    return `"${oldest.title}" was on yesterday's list. Still there.`
  }
  const starred = tasks.find(t => t.starred && !t.completed && !t.archived)
  if (starred) return `"${starred.title}" is your priority. You've got this.`
  if (yesterdayDone > 0) return `${yesterdayDone} thing${yesterdayDone !== 1 ? 's' : ''} done yesterday. Let's keep going.`
  const pending = tasks.filter(t => !t.completed && !t.archived)
  if (pending.length === 0) return "You're all caught up. Seriously — that's rare."
  return `${pending.length} thing${pending.length !== 1 ? 's' : ''} on your plate today.`
}

// ── Constants ───────────────────────────────────────────────────────────────
export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
]

export const PERSONAS_LIST = [
  { key: 'drill_sergeant', label: 'The Drill Sergeant', desc: 'Blunt, direct, zero fluff. Gets you moving.' },
  { key: 'coach', label: 'The Coach', desc: 'Warm, strategic, keeps you moving forward.' },
  { key: 'thinking_partner', label: 'The Thinking Partner', desc: 'Collaborative, asks questions, helps you decide.' },
  { key: 'hype_person', label: 'The Hype Person', desc: 'Energetic, celebratory, makes wins feel huge.' },
  { key: 'strategist', label: 'The Strategist', desc: 'Logical, pragmatic, systems-focused.' },
  { key: 'empath', label: 'The Empath', desc: 'Emotionally attuned, meets you where you are.' },
]
export const PERSONA_BADGE = ['Primary', 'Supporting', 'Accent']

export const BILL_CATEGORIES = ['Housing', 'Utilities', 'Subscriptions', 'Insurance', 'Transport', 'Food', 'Health', 'Other']

// ── Guide constants ─────────────────────────────────────────────────────────
export const GUIDE_TAG_COLORS = {
  'CINIS': COLORS.hot,
  'QUICK WINS': COLORS.green,
  'SYSTEMS': COLORS.blue,
  'FOCUS': COLORS.blue,
  'FINANCE': COLORS.gold,
  'NUTRITION': COLORS.green,
}

export const GUIDE_STRATEGIES = [
  { id: 'c1', tag: 'CINIS', icon: '\u{1F399}\uFE0F', title: 'Use your voice', preview: 'Tap the mic and just talk. Tasks are created from what you say.', body: 'The Voice FAB (bottom right mic button) turns speech into tasks instantly. Say "remind me to call Sarah tomorrow at 3pm" and it\'s done. No typing required.' },
  { id: 'c2', tag: 'CINIS', icon: '\u{1F9E0}', title: 'Your coaching blend matters', preview: 'Pick up to 3 personas. Your coach changes tone immediately.', body: 'Go to Settings \u2192 Coaching Blend. Different blends unlock different coaching styles. A drill sergeant is great for momentum days. A gentle nudge works better when you\'re low on energy. Swap them anytime.' },
  { id: 'c3', tag: 'CINIS', icon: '\u23F1\uFE0F', title: 'Focus timer + task = magic', preview: 'Star a task, then start focus. The timer locks you in.', body: 'Star your top task, then open the Focus tab. The timer runs alongside your task \u2014 when it ends, you check in. This creates accountability loops that ADHD brains respond to better than open-ended work sessions.' },
  { id: 'c4', tag: 'CINIS', icon: '\u{1F4D3}', title: 'Journal is inside Habits', preview: 'Your daily journal lives in the Habits tab.', body: 'Open the Habits tab and scroll down to find your daily journal. It\'s intentionally tucked here because journaling is a habit, not a task. Short entries \u2014 even one sentence \u2014 build the streak.' },
  { id: 'q1', tag: 'QUICK WINS', icon: '\u26A1', title: 'The 2-minute sweep', preview: 'Do every sub-2-minute task right now, back to back.', body: 'Scan your task list. Do every task that takes under 2 minutes right now, back to back. Don\'t schedule them \u2014 just do them. This clears cognitive load faster than any planning session.' },
  { id: 's1', tag: 'SYSTEMS', icon: '\u{1F4D0}', title: 'Time blocks, not lists', preview: 'A to-do with no time attached is a wish list.', body: 'A to-do list with no time attached is a wish list. Assign every important task a specific block on the calendar. Unscheduled = undone. Cinis calendar is your block planner \u2014 use it.' },
  { id: 'f1', tag: 'FOCUS', icon: '\u{1F465}', title: 'Body doubles work', preview: 'Work alongside someone \u2014 even silently.', body: 'Working alongside someone \u2014 even silently, even virtually \u2014 dramatically increases follow-through for ADHD brains. Open a silent video call, a co-working stream, or just sit in a coffee shop. The presence is what matters.' },
  { id: 's2', tag: 'SYSTEMS', icon: '\u{1F319}', title: 'The evening shutdown', preview: 'A 5-minute ritual closes the day properly.', body: 'At end of day: review what you did, reschedule what you didn\'t, write one thing for tomorrow. This prevents the open-loop anxiety that wrecks sleep. It takes 5 minutes and the effect is immediate.' },
  { id: 'fi1', tag: 'FINANCE', icon: '\u{1F4B0}', title: 'Know your daily number', preview: 'Monthly budget \u00F7 30 = your daily spend limit.', body: 'Monthly budget \u00F7 30 = your daily number. Every spend decision becomes simple: am I over or under today? The Finance tab tracks this in real time. Knowing the number matters more than tracking every category.' },
  { id: 'n1', tag: 'NUTRITION', icon: '\u{1F969}', title: 'Log meals by talking', preview: 'Voice-log food in the Nutrition tab.', body: 'In the Nutrition tab, tap the mic and describe what you ate. Cinis parses it into macros automatically. Logging friction is why people stop \u2014 voice removes it.' },
]

// ── Shared SVG ──────────────────────────────────────────────────────────────
export const CINIS_MARK_SVG = <CinisMark size={48} />

// ── Shared UI Components ────────────────────────────────────────────────────
export function EmptyState({ headline, subtext, ctaLabel, onCtaClick, useMarkIcon, customIcon }) {
  return (
    <div className={styles.emptyState}>
      {customIcon ? <div className={styles.emptyMarkIcon}>{customIcon}</div> : useMarkIcon && <div className={styles.emptyMarkIcon}>{CINIS_MARK_SVG}</div>}
      <p className={styles.emptyHeadline}>{headline}</p>
      {subtext && <p className={styles.emptySubtext}>{subtext}</p>}
      {ctaLabel && onCtaClick && (
        <button className={styles.emptyCtaBtn} onClick={onCtaClick}>{ctaLabel}</button>
      )}
    </div>
  )
}

const SKELETON_LINE_WIDTHS = ['70%', '50%', '85%', '40%']

export function SkeletonCard({ lines = 2, showAvatar = false }) {
  return (
    <div className={styles.skeletonCard}>
      {showAvatar && <div className={styles.skeletonCircle} />}
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={styles.skeletonBar} style={{ width: SKELETON_LINE_WIDTHS[i % 4] }} />
      ))}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
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

export class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[TabErrorBoundary]', this.props.tabName, error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.tabErrorFallback}>
          <p className={styles.tabErrorTitle}>
            Something went wrong loading {this.props.tabName}.
          </p>
          <p className={styles.tabErrorDetail}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            className={styles.tabErrorRetry}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
