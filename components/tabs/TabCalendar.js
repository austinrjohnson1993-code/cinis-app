import React, { useState } from 'react'
import { CaretLeft, CaretRight, Receipt } from '@phosphor-icons/react'
import styles from '../../styles/Dashboard.module.css'
import {
  localDateStr,
  todayStr,
  tomorrowStr,
  getTasksForDate,
  getTaskOccurrencesForMonth,
  fmtMoney,
  EmptyState,
  SkeletonCard,
  ErrorState,
  TabErrorBoundary,
} from './shared'

export default function TabCalendar({ user, profile, tasks, setTasks, showToast, switchTab, bills, loading, tasksError, setTasksError, setLoading, fetchTasks, setDetailTask, setNewDueDate, setShowAddModal }) {
  // Calendar state
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [calDay, setCalDay] = useState(null)
  const [calDayPanelOpen, setCalDayPanelOpen] = useState(false)

  // Calendar helpers
  function calTasksForDay(dStr) {
    const [y, m, d] = dStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return getTasksForDate(tasks, date)
  }

  function calPrevMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function calNextMonth() { setCalMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const todayDStr = todayStr()
  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const monthName = calMonth.toLocaleDateString('en-US', { month: 'long' })
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const monthOccurrences = getTaskOccurrencesForMonth(tasks, year, month)
  const billDueDays = {}
  ;(bills || []).forEach(b => {
    if (b.due_day) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(b.due_day).padStart(2, '0')}`
      if (!billDueDays[dStr]) billDueDays[dStr] = []
      billDueDays[dStr].push(b)
    }
  })

  // Upcoming — next 7 days using scheduled_for
  const upStart = new Date(); upStart.setHours(0,0,0,0)
  const upEnd = new Date(upStart); upEnd.setDate(upStart.getDate() + 7)
  const upcomingTasks = tasks
    .filter(t => !t.completed && !t.archived && t.scheduled_for)
    .filter(t => { const sf = new Date(t.scheduled_for); sf.setHours(0,0,0,0); return sf >= upStart && sf <= upEnd })
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  const upcomingByDate = {}
  upcomingTasks.forEach(t => {
    const d = t.scheduled_for.slice(0, 10)
    if (!upcomingByDate[d]) upcomingByDate[d] = []
    upcomingByDate[d].push(t)
  })
  const todayD = todayStr()
  const tomD = tomorrowStr()
  const fmtUpDate = (dStr) => {
    if (dStr === todayD) return 'Today'
    if (dStr === tomD) return 'Tomorrow'
    const [y, m, day] = dStr.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Day panel data
  const panelDayTasks = calDay ? calTasksForDay(localDateStr(calDay)) : []
  const panelScheduled = panelDayTasks.filter(t => t.due_time).sort((a, b) => new Date(a.due_time) - new Date(b.due_time))
  const panelUnscheduled = panelDayTasks.filter(t => !t.due_time)
  const panelBills = calDay ? (bills || []).filter(b => b.due_day === calDay.getDate()) : []
  const panelDayLabel = calDay ? calDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : ''

  if (loading) return (
    <TabErrorBoundary tabName="Calendar">
      <div className={styles.calView2}>
        <SkeletonCard lines={4} />
      </div>
    </TabErrorBoundary>
  )

  if (tasksError) return (
    <TabErrorBoundary tabName="Calendar">
      <div className={styles.calView2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60%' }}>
        <ErrorState message="Couldn't load your data." onRetry={() => { setTasksError(false); setLoading(true); fetchTasks(user.id) }} />
      </div>
    </TabErrorBoundary>
  )

  const hasAnyMonthTasks = Object.keys(monthOccurrences).length > 0

  return (
    <TabErrorBoundary tabName="Calendar">
      <div className={styles.calView2}>

        {/* Month grid card */}
        <div className={styles.calCard}>
          <div className={styles.calMonthNav}>
            <button className={styles.calNavBtn} onClick={calPrevMonth}><CaretLeft size={18} /></button>
            <h2 className={styles.calMonthLabel}>{monthName} {year}</h2>
            <button className={styles.calNavBtn} onClick={calNextMonth}><CaretRight size={18} /></button>
          </div>
          <div className={styles.calDayHeaders}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className={styles.calDayHeaderCell}>{d}</div>
            ))}
          </div>
          <div className={styles.calGrid}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className={styles.calCellEmpty} />
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayTaskList = monthOccurrences[dStr] || []
              const dayBillList = billDueDays[dStr] || []
              const isToday = dStr === todayDStr
              const isSelected = calDay && localDateStr(calDay) === dStr
              return (
                <div key={idx}
                  className={`${styles.calCell} ${isToday ? styles.calCellToday : ''} ${isSelected ? styles.calCellSelected : ''}`}
                  onClick={() => { setCalDay(new Date(year, month, day)); setCalDayPanelOpen(true) }}>
                  <span className={styles.calCellNum}>{day}</span>
                  <div className={styles.calDots}>
                    {dayTaskList.length > 0 && <span className={styles.calDotTask} />}
                    {dayBillList.length > 0 && <span className={styles.calDotBill} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Upcoming tasks hero */}
        <div className={styles.calUpcoming2}>
          <p className={styles.calUpcoming2Label}>Coming up</p>
          {Object.keys(upcomingByDate).length === 0 ? (
            !hasAnyMonthTasks
              ? <EmptyState useMarkIcon headline="Nothing scheduled." subtext="Tasks you add will show up here by date." />
              : <p className={styles.calUpcoming2Empty}>You're clear for the next 7 days.</p>
          ) : (
            Object.entries(upcomingByDate).map(([dStr, dayList]) => (
              <div key={dStr}>
                <p className={styles.calUpcoming2DateHeader}>{fmtUpDate(dStr)}</p>
                {dayList.map(t => (
                  <div key={t.id} className={styles.calUpcoming2Row} onClick={() => setDetailTask(t)}>
                    <div className={styles.calUpcoming2Left}>
                      <span className={styles.calUpcoming2Title}>{t.title}</span>
                      {t.due_time && (
                        <span className={styles.calUpcoming2Time}>
                          {new Date(t.due_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {t.consequence_level === 'external' && <span className={styles.calUpcoming2ExtBadge}>Ext</span>}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Day Panel slide-up sheet */}
        {calDayPanelOpen && calDay && (
          <>
            <div className={styles.calPanelBg} onClick={() => setCalDayPanelOpen(false)} />
            <div className={styles.calPanel}>
              <div className={styles.calPanelHandle} />
              <div className={styles.calPanelHeader}>
                <h3 className={styles.calPanelTitle}>{panelDayLabel}</h3>
                <button className={styles.calPanelClose} onClick={() => setCalDayPanelOpen(false)}>&#10005;</button>
              </div>
              <div className={styles.calPanelBody}>
                {panelScheduled.length > 0 && (
                  <div className={styles.calPanelSection}>
                    {panelScheduled.map(t => (
                      <div key={t.id} className={styles.calPanelTaskRow} onClick={() => { setDetailTask(t); setCalDayPanelOpen(false) }}>
                        <span className={styles.calPanelTaskTime}>
                          {new Date(t.due_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className={styles.calPanelTaskTitle}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {panelUnscheduled.length > 0 && (
                  <div className={styles.calPanelSection}>
                    <p className={styles.calPanelSectionLabel}>Unscheduled</p>
                    {panelUnscheduled.map(t => (
                      <div key={t.id} className={styles.calPanelTaskRow} onClick={() => { setDetailTask(t); setCalDayPanelOpen(false) }}>
                        <span className={styles.calPanelTaskTitle}>{t.title}</span>
                      </div>
                    ))}
                  </div>
                )}
                {panelBills.length > 0 && (
                  <div className={styles.calPanelSection}>
                    <p className={styles.calPanelSectionLabel}>Bills Due</p>
                    {panelBills.map(b => (
                      <div key={b.id} className={styles.calPanelBillRow}>
                        <Receipt size={14} style={{ color: '#E8321A', flexShrink: 0 }} />
                        <span className={styles.calPanelBillName}>{b.name}</span>
                        <span className={styles.calPanelBillAmt}>{fmtMoney(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {panelDayTasks.length === 0 && panelBills.length === 0 && (
                  <p className={styles.calPanelEmpty}>Nothing scheduled</p>
                )}
                <button className={styles.calPanelAddBtn} onClick={() => {
                  if (calDay) setNewDueDate(`${calDay.getFullYear()}-${String(calDay.getMonth()+1).padStart(2,'0')}-${String(calDay.getDate()).padStart(2,'0')}`)
                  setCalDayPanelOpen(false)
                  setShowAddModal(true)
                }}>+ Add task for this day</button>
              </div>
            </div>
          </>
        )}

      </div>
    </TabErrorBoundary>
  )
}
