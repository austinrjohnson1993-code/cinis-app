import React, { useState, useEffect } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { supabase } from '../../lib/supabase'
import { sanitizeInsight, SkeletonCard, EmptyState, localDateStr, ErrorState, TabErrorBoundary } from './shared'

export default function TabProgress({ user, profile, tasks, showToast, loggedFetch }) {
  // ── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [tasksError, setTasksError] = useState(false)
  const [progressError, setProgressError] = useState(false)

  const [weeklySummary, setWeeklySummary] = useState('')
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false)
  const [weeklySummaryInitialized, setWeeklySummaryInitialized] = useState(false)

  const [monthlySummary, setMonthlySummary] = useState('')
  const [monthlySummaryLoading, setMonthlySummaryLoading] = useState(false)
  const [monthlySummaryInitialized, setMonthlySummaryInitialized] = useState(false)

  const [progressSnapshots, setProgressSnapshots] = useState([])
  const [progressBand, setProgressBand] = useState('week')

  const [progressInsights, setProgressInsights] = useState([])
  const [progressInsightsLoading, setProgressInsightsLoading] = useState(false)
  const [progressInsightsLoaded, setProgressInsightsLoaded] = useState(false)

  const [journalEntries, setJournalEntries] = useState([])

  // ── Fetch functions ──────────────────────────────────────────────────────

  const fetchProgressInsights = async () => {
    if (!user) return
    setProgressInsightsLoaded(true)
    setProgressInsightsLoading(true)
    try {
      const res = await loggedFetch(`/api/progress/insights?userId=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setProgressInsights(data.insights || [])
      } else {
        setProgressError(true)
      }
    } catch {
      setProgressError(true)
    }
    setProgressInsightsLoading(false)
  }

  const fetchWeeklySummary = async () => {
    if (!user) return
    setWeeklySummaryInitialized(true)
    setWeeklySummaryLoading(true)
    try {
      const res = await loggedFetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, checkInType: 'weekly_summary', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      })
      const data = await res.json()
      setWeeklySummary(data.message || '')
    } catch {
      setWeeklySummary('')
    }
    setWeeklySummaryLoading(false)
  }

  const fetchMonthlySummary = async () => {
    if (!user) return
    setMonthlySummaryInitialized(true)
    setMonthlySummaryLoading(true)
    try {
      const res = await loggedFetch(`/api/progress?type=monthly&userId=${user.id}`)
      const data = await res.json()
      setMonthlySummary(data.insight || '')
    } catch {
      setMonthlySummary('')
    }
    setMonthlySummaryLoading(false)
  }

  const fetchProgressSnapshots = async (userId) => {
    try {
      const { data } = await supabase
        .from('progress_snapshots').select('*').eq('user_id', userId)
        .order('snapshot_date', { ascending: false })
      setProgressSnapshots(data || [])
    } catch {
      setProgressSnapshots([])
    }
  }

  const fetchJournalEntries = async (userId) => {
    const { data } = await supabase
      .from('journal_entries').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5)
    setJournalEntries(data || [])
  }

  // ── Effects ──────────────────────────────────────────────────────────────

  // Initial data load
  useEffect(() => {
    if (!user) return
    const init = async () => {
      await Promise.all([
        fetchProgressSnapshots(user.id),
        fetchJournalEntries(user.id),
      ])
      setLoading(false)
    }
    init()
  }, [user])

  // Load insights on mount
  useEffect(() => {
    if (user && !progressInsightsLoaded) {
      fetchProgressInsights()
    }
  }, [user])

  // Load weekly summary on mount
  useEffect(() => {
    if (user && !weeklySummaryInitialized) {
      fetchWeeklySummary()
      fetchJournalEntries(user.id) // refresh so Today journalCount is current
    }
  }, [user])

  // Load monthly summary when band switches to month
  useEffect(() => {
    if (progressBand === 'month' && user && !monthlySummaryInitialized) {
      fetchMonthlySummary()
    }
  }, [progressBand, user])

  // ── Computed values ──────────────────────────────────────────────────────

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pgTodayStr = localDateStr(today)
  const todayLocalStr = localDateStr(new Date())

  const todayTasksForRings = tasks.filter(t => !t.archived && t.scheduled_for && t.scheduled_for.slice(0, 10) === pgTodayStr)
  const completedTodayCount = todayTasksForRings.filter(t => t.completed).length
  const totalTodayCount = todayTasksForRings.length
  const taskRingPct = totalTodayCount > 0 ? completedTodayCount / totalTodayCount : 0

  const todayIso = new Date().toISOString().split('T')[0]
  const todayJournaled = (Array.isArray(journalEntries) ? journalEntries : []).some(j => j.created_at?.startsWith(todayIso))
  const journalRingPct = todayJournaled ? 1 : 0

  const todaySnapshot = progressSnapshots.find(s => s.snapshot_date?.slice(0, 10) === pgTodayStr)
  const todayFocusMinutes = todaySnapshot?.focus_minutes || 0
  const focusRingPct = Math.min(todayFocusMinutes / 60, 1)

  const totalXp = profile?.total_xp || 0
  const XP_MILESTONES = [
    { xp: 1000, label: 'Journal' },
    { xp: 2000, label: 'Stickers' },
    { xp: 5000, label: 'Journal book' },
  ]
  const nextMilestone = XP_MILESTONES.find(m => m.xp > totalXp)
  const xpBarPct = nextMilestone ? Math.min((totalXp / nextMilestone.xp) * 100, 100) : 100
  const xpToNext = nextMilestone ? (nextMilestone.xp - totalXp).toLocaleString() : null

  const barDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
    return d
  })
  const prevBarDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i)); d.setHours(0, 0, 0, 0)
    return d
  })
  const barCounts = barDays.map(d => {
    const dStr = localDateStr(d)
    return tasks.filter(t => t.completed && t.completed_at && localDateStr(new Date(t.completed_at)) === dStr).length
  })
  const prevBarCounts = prevBarDays.map(d => {
    const dStr = localDateStr(d)
    return tasks.filter(t => t.completed && t.completed_at && localDateStr(new Date(t.completed_at)) === dStr).length
  })
  const barMax = Math.max(...barCounts, ...prevBarCounts, 1)
  const thisWeekTotal = barCounts.reduce((s, v) => s + v, 0)

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const monthName = new Date().toLocaleDateString('en-US', { month: 'long' })
  const completedThisMonthList = tasks.filter(t => t.completed && t.completed_at && new Date(t.completed_at) >= monthStart)
  const monthFocusMinutes = progressSnapshots
    .filter(s => s.snapshot_date && new Date(s.snapshot_date) >= monthStart)
    .reduce((sum, s) => sum + (s.focus_minutes || 0), 0)
  const monthFocusHours = (monthFocusMinutes / 60).toFixed(1)
  const monthJournalCount = (Array.isArray(journalEntries) ? journalEntries : [])
    .filter(j => j.created_at && new Date(j.created_at) >= monthStart).length

  // ── Helpers ──────────────────────────────────────────────────────────────

  const renderRing = (pct, color, valueText, subText) => {
    const r = 29
    const circ = 2 * Math.PI * r
    const dashOff = circ * (1 - Math.min(pct, 1))
    return (
      <div className={styles.pgRingSvgWrap}>
        <svg width="68" height="68" viewBox="0 0 68 68">
          <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(245,240,227,0.03)" strokeWidth="5" />
          {pct > 0 && (
            <circle cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"
              style={{ transform: 'rotate(-90deg)', transformOrigin: '34px 34px' }} />
          )}
        </svg>
        <div className={styles.pgRingCenter}>
          <span className={styles.pgRingValue}>{valueText}</span>
          {subText && <span className={styles.pgRingSubValue}>{subText}</span>}
        </div>
      </div>
    )
  }

  const INSIGHT_STATIC = [
    { icon: '\u26A1', label: 'PATTERN', body: 'You complete 2x more tasks on days you journal in the morning.', color: '#FF6644' },
    { icon: '!', label: 'HEADS UP', body: '4 tasks pushed more than twice this week. LLC filing rescheduled 3 times.', color: '#E8321A' },
    { icon: '\u2713', label: 'WIN', body: '12-day streak. Longest since you started. Focus minutes up 30% week-over-week.', color: '#4CAF50' },
  ]
  const insightSource = progressInsights.length > 0
    ? progressInsights.map(ins => ({
        icon: ins.type === 'alert' ? '!' : ins.type === 'win' ? '\u2713' : '\u26a1',
        label: ins.type === 'alert' ? 'HEADS UP' : ins.type === 'win' ? 'WIN' : 'PATTERN',
        body: ins.body || ins.title || '',
        color: ins.type === 'alert' ? '#E8321A' : ins.type === 'win' ? '#4CAF50' : '#FF6644',
      }))
    : INSIGHT_STATIC

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', overflowY: 'auto', minHeight: '100%' }}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
    </div>
  )

  if (tasksError || progressError) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60%' }}>
      <ErrorState message="Couldn't load your data." onRetry={() => { setTasksError(false); setProgressError(false); setLoading(true); fetchProgressSnapshots(user.id) }} />
    </div>
  )

  return (
    <div className={styles.pgView}>

      {/* 1 — Three rings */}
      <div className={styles.pgRingsCard}>
        <div className={styles.pgRingsRow}>
          <div className={styles.pgRingWrap}>
            {renderRing(taskRingPct, '#FF6644', String(completedTodayCount), totalTodayCount > 0 ? 'of ' + String(totalTodayCount) : String(0))}
            <span className={styles.pgRingLabel}>Tasks</span>
          </div>
          <div className={styles.pgRingWrap}>
            {renderRing(focusRingPct, '#3B8BD4', todayFocusMinutes > 0 ? String(todayFocusMinutes) : '0', 'min')}
            <span className={styles.pgRingLabel}>Focus</span>
          </div>
          <div className={styles.pgRingWrap}>
            {renderRing(journalRingPct, '#4CAF50', todayJournaled ? '1' : '0', 'entry')}
            <span className={styles.pgRingLabel}>Journal</span>
          </div>
        </div>
      </div>

      {/* 2 — XP bar */}
      <div className={styles.pgXpCard}>
        <div className={styles.pgXpRow}>
          <div className={styles.pgXpLeft}>
            <span className={styles.pgXpEmoji}>{'\uD83D\uDD25'}</span>
            <span className={styles.pgXpNumber}>{totalXp.toLocaleString()}</span>
            <span className={styles.pgXpUnit}>XP</span>
          </div>
          {nextMilestone && (
            <div className={styles.pgXpRight}>
              <span className={styles.pgXpToGo}>{xpToNext} to go</span>
              <span className={styles.pgXpNextHint}>{nextMilestone.label} at {nextMilestone.xp >= 1000 ? (nextMilestone.xp / 1000) + 'K' : nextMilestone.xp}</span>
            </div>
          )}
        </div>
        <div className={styles.pgXpBarTrack}>
          <div className={styles.pgXpBarFill} style={{ width: xpBarPct + '%' }} />
        </div>
        <div className={styles.pgXpMilestones}>
          <span className={styles.pgXpMstone}>1K {'\u2014'} Journal</span>
          <span className={styles.pgXpMstone}>2K {'\u2014'} Stickers</span>
          <span className={styles.pgXpMstone}>5K {'\u2014'} Journal book</span>
        </div>
      </div>

      {/* 3 — Insight cards */}
      {progressInsightsLoading ? (
        <div className={styles.pgInsightSkeleton} />
      ) : (
        <div className={styles.pgInsightsStack}>
          {insightSource.map((ins, i) => (
            <div key={i} className={styles.pgInsightCard} style={{ borderLeftColor: ins.color }}>
              <div className={styles.pgInsightHeader}>
                <span className={styles.pgInsightIcon} style={{ color: ins.color }}>{ins.icon}</span>
                <span className={styles.pgInsightType} style={{ color: ins.color }}>{ins.label}</span>
              </div>
              <p className={styles.pgInsightBody}>{ins.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* 4 — Weekly bar chart */}
      <div className={styles.pgWeekCard}>
        <div className={styles.pgWeekHeader}>
          <span className={styles.pgWeekTitle}>This week vs last</span>
          <span className={styles.pgWeekCount}>{thisWeekTotal} tasks</span>
        </div>
        <div className={styles.pgBarChart}>
          {barDays.map((d, i) => {
            const isToday = localDateStr(d) === todayLocalStr
            const thisH = barMax > 0 ? Math.round((barCounts[i] / barMax) * 68) : 0
            const prevH = barMax > 0 ? Math.round((prevBarCounts[i] / barMax) * 68) : 0
            return (
              <div key={i} className={styles.pgBarCol}>
                <div className={styles.pgBarPairWrap}>
                  <div className={styles.pgBarPrev} style={{ height: prevBarCounts[i] > 0 ? Math.max(prevH, 4) : 0 }} />
                  <div className={styles.pgBar + (isToday ? ' ' + styles.pgBarToday : '')}
                    style={{ height: Math.max(thisH, 3) }} />
                </div>
                <span className={styles.pgBarLabel + (isToday ? ' ' + styles.pgBarLabelToday : '')}>
                  {d.toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
              </div>
            )
          })}
        </div>
        <div className={styles.pgWeekLegend}>
          <div className={styles.pgWeekLegendItem}>
            <div className={styles.pgWeekDot} style={{ background: '#FF6644' }} />
            <span className={styles.pgWeekLegendLabel}>This week</span>
          </div>
          <div className={styles.pgWeekLegendItem}>
            <div className={styles.pgWeekDot} style={{ background: 'rgba(245,240,227,0.2)' }} />
            <span className={styles.pgWeekLegendLabel}>Last week</span>
          </div>
        </div>
      </div>

      {/* 5 — Monthly summary */}
      <div className={styles.pgMonthCard}>
        <p className={styles.pgMonthName}>{monthName}</p>
        <div className={styles.pgMonthStats}>
          <div className={styles.pgMonthStat}>
            <span className={styles.pgMonthStatNum} style={{ color: '#FF6644' }}>{completedThisMonthList.length}</span>
            <span className={styles.pgMonthStatLabel}>tasks</span>
          </div>
          <div className={styles.pgMonthDivider} />
          <div className={styles.pgMonthStat}>
            <span className={styles.pgMonthStatNum} style={{ color: '#3B8BD4' }}>{monthFocusHours}h</span>
            <span className={styles.pgMonthStatLabel}>focus</span>
          </div>
          <div className={styles.pgMonthDivider} />
          <div className={styles.pgMonthStat}>
            <span className={styles.pgMonthStatNum} style={{ color: '#4CAF50' }}>{monthJournalCount}</span>
            <span className={styles.pgMonthStatLabel}>entries</span>
          </div>
          <div className={styles.pgMonthDivider} />
          <div className={styles.pgMonthStat}>
            <span className={styles.pgMonthStatNum} style={{ color: '#FFB800' }}>{(profile?.current_streak || 0) + 'd'}</span>
            <span className={styles.pgMonthStatLabel}>streak</span>
          </div>
        </div>
      </div>

    </div>
  )
}
