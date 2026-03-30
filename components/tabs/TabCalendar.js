import React, { useState } from 'react'
import {
  localDateStr, todayStr, tomorrowStr,
  getTasksForDate, getTaskOccurrencesForMonth, fmtMoney,
} from './shared'
import cs from '../../styles/TabCalendar.module.css'

export default function TabCalendar({ user, profile, tasks = [], setTasks, showToast, switchTab, bills = [], loading, tasksError, setTasksError, setLoading, fetchTasks, setDetailTask, setNewDueDate, setShowAddModal, focusSessions = [] }) {
  const [calMonth, setCalMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1) })
  const [calDay, setCalDay] = useState(null)
  const [calDayPanelOpen, setCalDayPanelOpen] = useState(false)

  // Calendar helpers
  function calTasksForDay(dStr) {
    const [y, m, d] = dStr.split('-').map(Number)
    return getTasksForDate(tasks, new Date(y, m - 1, d))
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

  // Upcoming — next 7 days
  const upStart = new Date(); upStart.setHours(0, 0, 0, 0)
  const upEnd = new Date(upStart); upEnd.setDate(upStart.getDate() + 7)
  const upcomingTasks = tasks
    .filter(t => !t.completed && !t.archived && t.scheduled_for)
    .filter(t => { const sf = new Date(t.scheduled_for); sf.setHours(0, 0, 0, 0); return sf >= upStart && sf <= upEnd })
    .sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  const upcomingByDate = {}
  upcomingTasks.forEach(t => { const d = t.scheduled_for.slice(0, 10); if (!upcomingByDate[d]) upcomingByDate[d] = []; upcomingByDate[d].push(t) })
  const todayD = todayStr()
  const tomD = tomorrowStr()
  const fmtUpDate = (dStr) => {
    if (dStr === todayD) return 'Today'
    if (dStr === tomD) return 'Tomorrow'
    const [y, m, day] = dStr.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Upcoming bills in next 7 days
  const upcomingBills = (bills || []).filter(b => {
    if (!b.due_day) return false
    const billDate = new Date(year, month, b.due_day)
    return billDate >= upStart && billDate <= upEnd
  })

  // Day panel data
  const panelDayTasks = calDay ? calTasksForDay(localDateStr(calDay)) : []
  const panelScheduled = panelDayTasks.filter(t => t.due_time).sort((a, b) => new Date(a.due_time) - new Date(b.due_time))
  const panelUnscheduled = panelDayTasks.filter(t => !t.due_time)
  const panelBills = calDay ? (bills || []).filter(b => b.due_day === calDay.getDate()) : []
  const panelDayLabel = calDay ? calDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : ''
  const panelDayName = calDay ? calDay.toLocaleDateString('en-US', { weekday: 'long' }) : ''
  const panelIsToday = calDay && localDateStr(calDay) === todayDStr

  const ff = "'Figtree',sans-serif"
  const sf = "'Sora',sans-serif"

  if (loading) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, overflowY: 'auto', height: '100%' }}>
      <div style={{ background: '#3E3228', borderRadius: 10, padding: 20, marginBottom: 14 }}>
        <div style={{ height: 14, background: '#F0EAD610', borderRadius: 4, marginBottom: 8, width: '60%' }} />
        <div style={{ height: 100, background: '#F0EAD608', borderRadius: 6 }} />
      </div>
    </div>
  )

  if (tasksError) return (
    <div style={{ padding: '12px 14px', paddingBottom: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60%' }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 24 }}>&#9888;&#65039;</span>
        <div style={{ fontSize: 14, color: '#F0EAD670', fontFamily: ff, marginTop: 8 }}>Couldn&apos;t load your data.</div>
        <div onClick={() => { if (setTasksError) setTasksError(false); if (setLoading) setLoading(true); if (fetchTasks) fetchTasks(user.id) }} style={{ marginTop: 10, padding: '8px 16px', background: '#FF6644', borderRadius: 8, fontSize: 14, color: '#F0EAD6', fontFamily: ff, cursor: 'pointer', display: 'inline-block' }}>Try again</div>
      </div>
    </div>
  )

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', overflowY: 'auto', height: '100%', paddingBottom: 80 }}>

        {/* Month grid card */}
        <div style={{ background: '#3E3228', borderRadius: 10, padding: '10px 10px 8px', marginBottom: 14 }}>
          {/* Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div onClick={calPrevMonth} style={{ padding: 6, cursor: 'pointer', color: '#F0EAD670', fontSize: 16 }}>&#8249;</div>
            <div style={{ fontFamily: ff, fontSize: 15, fontWeight: 600, color: '#F0EAD6' }}>{monthName} {year}</div>
            <div onClick={calNextMonth} style={{ padding: 6, cursor: 'pointer', color: '#F0EAD670', fontSize: 16 }}>&#8250;</div>
          </div>
          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ fontSize: 14, color: '#F0EAD640', fontFamily: ff, textAlign: 'center', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} style={{ height: 44 }} />
              const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayTaskList = monthOccurrences[dStr] || []
              const dayBillList = billDueDays[dStr] || []
              const isToday = dStr === todayDStr
              const isSelected = calDay && localDateStr(calDay) === dStr
              return (
                <div key={idx} onClick={() => { setCalDay(new Date(year, month, day)); setCalDayPanelOpen(true) }} style={{
                  height: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, cursor: 'pointer',
                  background: isToday ? '#FF66441F' : isSelected ? '#F0EAD60A' : 'transparent',
                }}>
                  <span style={{
                    fontSize: 14, fontFamily: ff,
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? '#FF6644' : '#F0EAD6',
                  }}>{day}</span>
                  <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 3 }}>
                    {dayTaskList.length > 0 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#FF6644' }} />}
                    {dayBillList.length > 0 && <div style={{ width: 3, height: 3, borderRadius: '50%', background: '#E8321A' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Coming up section */}
        <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F0EAD650', fontFamily: ff, fontWeight: 500, marginBottom: 8 }}>Coming up</div>

        {Object.keys(upcomingByDate).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: 14, color: '#F0EAD650', fontFamily: ff }}>You&apos;re clear for the next 7 days.</div>
          </div>
        ) : (
          Object.entries(upcomingByDate).map(([dStr, dayList]) => (
            <div key={dStr}>
              <div style={{ fontSize: 14, fontWeight: 500, fontFamily: ff, padding: '6px 0 3px', color: dStr === todayD ? '#FF6644' : '#F0EAD670' }}>{fmtUpDate(dStr)}</div>
              {dayList.map(t => (
                <div key={t.id} onClick={() => setDetailTask && setDetailTask(t)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
                  background: '#3E3228', borderRadius: 8, marginBottom: 4, cursor: 'pointer'
                }}>
                  <div style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><div style={{ width: 17, height: 17, borderRadius: '50%', border: '1.5px solid #F0EAD650' }} /></div>
                  <span style={{ fontSize: 14, color: '#F0EAD6', fontFamily: ff, flex: 1 }}>{t.title}</span>
                  {t.due_time && <span style={{ fontSize: 14, color: '#F0EAD650', fontFamily: sf }}>{new Date(t.due_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>}
                </div>
              ))}
            </div>
          ))
        )}

        {/* Upcoming bills */}
        {upcomingBills.length > 0 && upcomingBills.map(b => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px',
            background: '#3E3228', borderRadius: 8, marginBottom: 4, borderLeft: '3px solid #E8321A'
          }}>
            <span style={{ fontSize: 14 }}>&#129534;</span>
            <span style={{ fontSize: 14, color: '#F0EAD6', fontFamily: ff, flex: 1 }}>{b.name}</span>
            <span style={{ fontSize: 14, color: '#F0EAD670', fontFamily: sf }}>{fmtMoney(b.amount)}</span>
          </div>
        ))}

      </div>

      {/* Day Detail Sheet */}
      {calDayPanelOpen && calDay && (() => {
        const now = new Date(); now.setHours(0,0,0,0)
        const panelDateStr = localDateStr(calDay)
        const sessionsForDay = (focusSessions || []).filter(s => {
          if (!s.completed_at) return false
          return s.completed_at.slice(0,10) === panelDateStr
        })
        const isOverdue = (t) => !t.completed && t.scheduled_for && new Date(t.scheduled_for) < now && panelDateStr !== todayDStr
        const daysSince = (t) => { const sf = new Date(t.scheduled_for); sf.setHours(0,0,0,0); return Math.floor((now - sf) / 86400000) }

        return (
          <div className={cs.sheetOverlay} onClick={() => setCalDayPanelOpen(false)}>
            <div className={cs.sheet} onClick={e => e.stopPropagation()}>
              <div className={cs.sheetHandle} />
              <div className={cs.sheetHeader}>
                <div className={cs.sheetDateWrap}>
                  <div className={cs.sheetDate}>{calDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                  {panelIsToday && <div className={cs.sheetDateSub}>Today</div>}
                </div>
                <button className={cs.sheetClose} onClick={() => setCalDayPanelOpen(false)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tasks */}
              <div className={cs.secLabel}>TASKS</div>
              {panelDayTasks.length === 0 && <div className={cs.emptyText}>No tasks scheduled</div>}
              {panelDayTasks.sort((a,b) => (a.due_time||'').localeCompare(b.due_time||'')).map(t => {
                const done = t.completed
                const over = isOverdue(t)
                return (
                  <div key={t.id} className={done ? cs.taskRowDone : over ? cs.taskRowOverdue : cs.taskRow} onClick={() => { if (setDetailTask) setDetailTask(t); setCalDayPanelOpen(false) }}>
                    {done ? (
                      <div className={cs.taskCircleDone}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      </div>
                    ) : (
                      <div className={over ? cs.taskCircleOverdue : cs.taskCircle} />
                    )}
                    <div className={cs.taskInfo}>
                      <div className={done ? cs.taskTitleDone : cs.taskTitle}>{t.title}</div>
                      {over && <div className={cs.taskSubOverdue}>Overdue &middot; {daysSince(t)} days</div>}
                      {!over && !done && t.due_time && <div className={cs.taskSub}>{new Date(t.due_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>}
                      {done && t.due_time && <div className={cs.taskSub}>{new Date(t.due_time).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})} &middot; done</div>}
                    </div>
                  </div>
                )
              })}

              {/* Add task */}
              <div className={cs.addTaskBtn} onClick={() => {
                if (calDay && setNewDueDate) setNewDueDate(`${calDay.getFullYear()}-${String(calDay.getMonth()+1).padStart(2,'0')}-${String(calDay.getDate()).padStart(2,'0')}`)
                setCalDayPanelOpen(false)
                if (setShowAddModal) setShowAddModal(true)
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FF6644" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span className={cs.addTaskText}>Add task for this day</span>
              </div>

              {/* Bills */}
              {panelBills.length > 0 && (
                <>
                  <div className={cs.secLabel}>BILLS DUE</div>
                  {panelBills.map(b => (
                    <div key={b.id} className={b.autopay ? cs.billRowAuto : cs.billRow}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E8321A" strokeWidth="2" strokeLinecap="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                      <span className={cs.billName}>{b.name}</span>
                      <span className={cs.billAmount}>{fmtMoney(b.amount)} &middot; {b.autopay ? 'auto' : 'manual'}</span>
                      {b.autopay ? (
                        <span className={cs.billAutoBadge}>AUTO</span>
                      ) : (
                        <button className={cs.billPayBtn} onClick={() => switchTab?.('finance')}>Pay</button>
                      )}
                    </div>
                  ))}
                </>
              )}

              {/* Focus sessions */}
              {sessionsForDay.length > 0 && (
                <>
                  <div className={cs.secLabel} style={{marginTop: panelBills.length > 0 ? 10 : 0}}>FOCUS SESSIONS</div>
                  {sessionsForDay.map((s, i) => (
                    <div key={s.id || i} className={cs.focusRow}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3B8BD4" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                      <div style={{flex:1}}>
                        <div className={cs.focusName}>{s.task_name || 'Focus session'}</div>
                        <div className={cs.focusSub}>{s.duration_min || Math.round((s.duration || 0)/60)} min &middot; completed {new Date(s.completed_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}</div>
                      </div>
                      <span className={cs.focusXp}>+{s.xp_earned || s.xp || 0} XP</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
