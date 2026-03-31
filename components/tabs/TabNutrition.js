import React, { useState, useEffect } from 'react'
import { COLORS, FONTS } from '../../lib/constants'
import LogMealSheet from '../sheets/LogMealSheet'
import LogWeightSheet from '../sheets/LogWeightSheet'
import CreateSavedMealSheet from '../sheets/CreateSavedMealSheet'
import AddSupplementSheet from '../sheets/AddSupplementSheet'

// ── Shared mini-components (no hooks — pure render) ──────────────────────────

const COL = COLORS
const fig = FONTS.fig
const sora = FONTS.sora

function MacroRing({ value, target, label, color, unit = '' }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const pct = Math.min((value || 0) / (target || 1), 1)
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 4px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(240,234,214,0.08)" strokeWidth="6"/>
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            transform="rotate(-90 36 36)"/>
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontFamily: sora, fontSize: 15, fontWeight: 600, color }}>{Math.round(value || 0)}</span>
          {unit && <span style={{ fontSize: 9, color: COL.ghost }}>{unit}</span>}
        </div>
      </div>
      <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>/ {target}{unit}</div>
      <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )
}

function NCard({ children, style, borderLeft }) {
  return (
    <div style={{ background: COL.char, borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: borderLeft || 'none', ...style }}>
      {children}
    </div>
  )
}

function NRow({ children, style }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>{children}</div>
}

function SLabel({ children, color }) {
  return (
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: color || COL.ghost, fontFamily: fig, marginBottom: 6, marginTop: 10 }}>
      {children}
    </div>
  )
}

function NTag({ bg, color, children }) {
  return <span style={{ display: 'inline-block', fontFamily: fig, fontSize: 10, borderRadius: 4, padding: '2px 8px', background: bg, color }}>{children}</span>
}

function MacroRow({ cal, protein, carbs, fat }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
      {[['cal', cal], ['P', (protein || 0) + 'g'], ['C', (carbs || 0) + 'g'], ['F', (fat || 0) + 'g']].map(([l, v]) => (
        <span key={l} style={{ fontSize: 10, color: COL.faint, fontFamily: fig }}>
          <span style={{ color: COL.ash }}>{v}</span> {l}
        </span>
      ))}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TabNutrition({ user, profile, showToast, loggedFetch, switchTab }) {

  // ── Sub-tab ──────────────────────────────────────────────────────────────
  const [nutrSub, setNutrSub] = useState('log')
  const [knowledgeFilter, setKnowledgeFilter] = useState('All')
  const [learnFilter, setLearnFilter] = useState('All')
  const [mealGoalFilter, setMealGoalFilter] = useState(null)

  // ── Log tab ──────────────────────────────────────────────────────────────
  const [logEntries, setLogEntries] = useState([])
  const [logTotals, setLogTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [logTargets, setLogTargets] = useState({ calories: 2400, protein: 180, water: 10 })
  const [logLoaded, setLogLoaded] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [showLogMeal, setShowLogMeal] = useState(false)
  const [defaultMealType, setDefaultMealType] = useState('lunch')

  // ── Stack tab ─────────────────────────────────────────────────────────────
  const [supplements, setSupplements] = useState([])
  const [suppLoaded, setSuppLoaded] = useState(false)
  const [showAddSupp, setShowAddSupp] = useState(false)
  const [suppUpdating, setSuppUpdating] = useState(null)

  // ── Meals tab ─────────────────────────────────────────────────────────────
  const [savedMeals, setSavedMeals] = useState([])
  const [mealsLoaded, setMealsLoaded] = useState(false)
  const [showCreateMeal, setShowCreateMeal] = useState(false)
  const [quickLogging, setQuickLogging] = useState(null)

  // ── Body tab ──────────────────────────────────────────────────────────────
  const [weightLog, setWeightLog] = useState([])
  const [weightLoaded, setWeightLoaded] = useState(false)
  const [showLogWeight, setShowLogWeight] = useState(false)
  const [bodyGoal, setBodyGoal] = useState(profile?.nutrition_goal || 'maintain')
  const [savingGoal, setSavingGoal] = useState(false)

  // ── Insights tab ──────────────────────────────────────────────────────────
  const [insightsData, setInsightsData] = useState(null)
  const [insightsLoaded, setInsightsLoaded] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)

  // ── Data fetchers ─────────────────────────────────────────────────────────
  const fetchLog = async () => {
    setLogLoaded(true)
    setLogLoading(true)
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'
      const res = await loggedFetch(`/api/nutrition/log?timezone=${encodeURIComponent(tz)}`)
      if (!res.ok) return
      const data = await res.json()
      setLogEntries(data.entries || [])
      if (data.totals) setLogTotals(data.totals)
      if (data.targets) setLogTargets(data.targets)
    } catch (e) {
      console.error('[TabNutrition] fetchLog:', e)
    } finally {
      setLogLoading(false)
    }
  }

  const fetchSupplements = async () => {
    setSuppLoaded(true)
    try {
      const res = await loggedFetch('/api/nutrition/supplements')
      if (!res.ok) return
      const data = await res.json()
      setSupplements(data.supplements || [])
    } catch (e) {
      console.error('[TabNutrition] fetchSupplements:', e)
    }
  }

  const fetchSavedMeals = async () => {
    setMealsLoaded(true)
    try {
      const res = await loggedFetch('/api/nutrition/meals')
      if (!res.ok) return
      const data = await res.json()
      setSavedMeals(data.meals || [])
    } catch (e) {
      console.error('[TabNutrition] fetchSavedMeals:', e)
    }
  }

  const fetchWeightLog = async () => {
    setWeightLoaded(true)
    try {
      const res = await loggedFetch('/api/nutrition/weight')
      if (!res.ok) return
      const data = await res.json()
      setWeightLog(data.entries || [])
    } catch (e) {
      console.error('[TabNutrition] fetchWeightLog:', e)
    }
  }

  const fetchInsights = async () => {
    setInsightsLoaded(true)
    setInsightsLoading(true)
    try {
      const res = await loggedFetch('/api/nutrition/insights')
      if (!res.ok) return
      const data = await res.json()
      setInsightsData(data)
    } catch (e) {
      console.error('[TabNutrition] fetchInsights:', e)
    } finally {
      setInsightsLoading(false)
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !logLoaded) fetchLog()
  }, [user])

  useEffect(() => {
    if (!user) return
    if (nutrSub === 'stack' && !suppLoaded) fetchSupplements()
    if (nutrSub === 'meals' && !mealsLoaded) fetchSavedMeals()
    if (nutrSub === 'body' && !weightLoaded) fetchWeightLog()
    if (nutrSub === 'insights' && !insightsLoaded) fetchInsights()
  }, [nutrSub, user])

  // ── Derived values ────────────────────────────────────────────────────────
  const waterEntries = logEntries.filter(e => e.meal_type === 'water')
  const waterCount = waterEntries.length
  const waterTarget = logTargets.water || 10
  const mealEntries = logEntries.filter(e => e.meal_type !== 'water')
  const proteinLeft = Math.max(0, (logTargets.protein || 180) - Math.round(logTotals.protein || 0))
  const todayStr = new Date().toISOString().slice(0, 10)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleWaterTap = async (i) => {
    const filled = i < waterCount
    if (filled) {
      // Tap filled dot → remove last water entry
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago'
        const res = await loggedFetch(`/api/nutrition/water?timezone=${encodeURIComponent(tz)}`, { method: 'DELETE' })
        if (res.ok) setLogEntries(prev => {
          const waterIdxs = prev.map((e, idx) => e.meal_type === 'water' ? idx : -1).filter(x => x >= 0)
          const lastWaterIdx = waterIdxs[waterIdxs.length - 1]
          return prev.filter((_, idx) => idx !== lastWaterIdx)
        })
      } catch {}
    } else {
      // Tap empty dot → add water entry
      try {
        const res = await loggedFetch('/api/nutrition/water', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        if (res.ok) {
          const data = await res.json()
          if (data.entry) setLogEntries(prev => [...prev, data.entry])
        }
      } catch {}
    }
  }

  const handleToggleSupp = async (supp) => {
    const takenToday = supp.last_taken_date === todayStr
    setSuppUpdating(supp.id)
    try {
      const res = await loggedFetch('/api/nutrition/supplements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supp.id, taken: !takenToday }),
      })
      if (res.ok) {
        const data = await res.json()
        setSupplements(prev => prev.map(s => s.id === supp.id ? data.supplement : s))
      }
    } catch (e) {
      console.error('[TabNutrition] toggleSupp:', e)
    } finally {
      setSuppUpdating(null)
    }
  }

  const handleQuickLogMeal = async (meal) => {
    setQuickLogging(meal.id)
    try {
      const res = await loggedFetch('/api/nutrition/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meal_name: meal.name,
          food_description: meal.description || null,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          meal_type: 'snack',
          template_id: meal.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.entry) {
          setLogEntries(prev => [...prev, data.entry])
          setLogTotals(prev => ({
            calories: prev.calories + (meal.calories || 0),
            protein:  Math.round((prev.protein + (parseFloat(meal.protein_g) || 0)) * 10) / 10,
            carbs:    Math.round((prev.carbs   + (parseFloat(meal.carbs_g)   || 0)) * 10) / 10,
            fat:      Math.round((prev.fat     + (parseFloat(meal.fat_g)     || 0)) * 10) / 10,
          }))
          setSavedMeals(prev => prev.map(m => m.id === meal.id ? { ...m, log_count: (m.log_count || 0) + 1 } : m))
          showToast(`${meal.name} logged`)
        }
      } else {
        showToast('Failed to log meal')
      }
    } catch {
      showToast('Failed to log meal')
    } finally {
      setQuickLogging(null)
    }
  }

  const handleSaveBodyGoal = async (goal) => {
    setBodyGoal(goal)
    setSavingGoal(true)
    try {
      await loggedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, updates: { nutrition_goal: goal } }),
      })
    } catch {}
    setSavingGoal(false)
  }

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
  }

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch { return dateStr }
  }

  // ── Supplement grouping ───────────────────────────────────────────────────
  const TIMING_ORDER = ['Morning', 'Pre-workout', 'Post-workout', 'With meals', 'Evening', 'Night']
  const TIMING_COLORS = {
    Morning: COL.hot, 'Pre-workout': COL.ember, 'Post-workout': COL.ember,
    Evening: COL.ghost, Night: COL.ghost, 'With meals': COL.green,
  }
  const suppGroups = {}
  supplements.forEach(s => {
    const groups = s.timing_groups || ['Morning']
    groups.forEach(g => {
      if (!suppGroups[g]) suppGroups[g] = []
      if (!suppGroups[g].find(x => x.id === s.id)) suppGroups[g].push(s)
    })
  })
  const orderedGroups = [
    ...TIMING_ORDER.filter(t => suppGroups[t]),
    ...Object.keys(suppGroups).filter(t => !TIMING_ORDER.includes(t)),
  ]

  // ── GOAL MACRO TARGETS ────────────────────────────────────────────────────
  const GOAL_TARGETS = {
    cut:       { calOffset: -500, protein: 1.0, label: 'Cut' },
    maintain:  { calOffset: 0,    protein: 0.8, label: 'Maintain' },
    'lean bulk': { calOffset: 250, protein: 0.9, label: 'Lean bulk' },
    bulk:      { calOffset: 500,  protein: 0.9, label: 'Bulk' },
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  // ── LOG TAB ───────────────────────────────────────────────────────────────
  const renderLog = () => (
    <div>
      <div style={{ marginBottom: 12 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.ghost, fontFamily: fig }}>Nutrition</span>
        <h1 style={{ margin: '2px 0 0', fontFamily: sora, fontSize: 20, fontWeight: 600, color: COL.ash }}>Today</h1>
      </div>

      {/* Macro rings */}
      {logLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0', color: COL.ghost, fontFamily: fig, fontSize: 12 }}>Loading…</div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 14 }}>
          <MacroRing value={logTotals.calories} target={logTargets.calories} label="Cal" color={COL.ember} unit="kcal" />
          <MacroRing value={logTotals.protein}  target={logTargets.protein}  label="Protein"  color={COL.hot}  unit="g" />
          <MacroRing value={logTotals.carbs}    target={280}                 label="Carbs"    color={COL.gold} unit="g" />
          <MacroRing value={logTotals.fat}      target={80}                  label="Fat"      color={COL.blue} unit="g" />
        </div>
      )}

      {/* Protein callout */}
      {proteinLeft > 0 && (
        <div style={{ background: COL.char, borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
          <span style={{ fontFamily: sora, fontSize: 13, fontWeight: 600, color: COL.ash }}>{proteinLeft}g protein remaining</span>
          <p style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, margin: '3px 0 0' }}>
            {proteinLeft >= 40 ? `~${Math.ceil(proteinLeft / 7)} oz chicken or ${Math.ceil(proteinLeft / 25)} scoops whey` : 'Almost there — one more snack covers it'}
          </p>
        </div>
      )}

      {/* Water tracker */}
      <div style={{ background: COL.char, borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <NRow>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.blue, fontFamily: fig }}>Water</span>
          <span style={{ fontFamily: sora, fontSize: 12, color: COL.ghost }}>{waterCount} / {waterTarget} glasses</span>
        </NRow>
        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
          {Array.from({ length: waterTarget }).map((_, i) => {
            const filled = i < waterCount
            return (
              <div key={i}
                onClick={() => handleWaterTap(i)}
                style={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 6,
                  background: filled ? `${COL.blue}30` : 'rgba(240,234,214,0.08)',
                  border: `1px solid ${filled ? `${COL.blue}60` : COL.charBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: filled ? COL.blue : COL.micro,
                }}>
                  {filled ? '💧' : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Today's meals */}
      <SLabel>Today's meals</SLabel>
      {mealEntries.length === 0 ? (
        <div style={{ border: `0.5px dashed ${COL.charBorder}`, borderRadius: 10, padding: 12, marginBottom: 8, textAlign: 'center' }}>
          <span style={{ fontFamily: fig, fontSize: 12, color: COL.ghost }}>Nothing logged yet — tap + Log meal to start</span>
        </div>
      ) : (
        mealEntries.map((entry, i) => (
          <NCard key={entry.id || i} style={{ padding: 10 }}>
            <NRow style={{ marginBottom: 4 }}>
              <span style={{ fontFamily: fig, fontSize: 13, fontWeight: 600, color: COL.ash, textTransform: 'capitalize' }}>
                {entry.meal_type || entry.meal_name}
              </span>
              <span style={{ fontSize: 11, color: COL.ghost, fontFamily: fig }}>{formatTime(entry.logged_at)}</span>
            </NRow>
            {entry.food_description && (
              <div style={{ fontSize: 11, color: `${COL.ash}aa`, fontFamily: fig, marginBottom: 4 }}>{entry.food_description}</div>
            )}
            {!entry.food_description && entry.meal_name && (
              <div style={{ fontSize: 11, color: `${COL.ash}aa`, fontFamily: fig, marginBottom: 4 }}>{entry.meal_name}</div>
            )}
            <MacroRow cal={entry.calories} protein={Math.round(entry.protein_g)} carbs={Math.round(entry.carbs_g)} fat={Math.round(entry.fat_g)} />
          </NCard>
        ))
      )}

      {/* Quick add chips */}
      <NCard>
        <SLabel>Quick add</SLabel>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'].map(type => (
            <div key={type}
              onClick={() => { setDefaultMealType(type.toLowerCase().replace('-', '-')); setShowLogMeal(true) }}
              style={{ background: COL.coal, border: `0.5px solid ${COL.charBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 11, color: COL.dim, fontFamily: fig, cursor: 'pointer' }}>
              {type}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>Saved meals auto-fill macros. Tap or type anything — AI estimates the rest.</div>
      </NCard>

      {/* Log meal button */}
      <button
        onClick={() => { setDefaultMealType('lunch'); setShowLogMeal(true) }}
        style={{ width: '100%', marginTop: 4, padding: '11px', borderRadius: 10, background: `${COL.ember}18`, border: `1px solid ${COL.ember}40`, color: COL.ember, fontFamily: fig, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        + Log meal
      </button>
    </div>
  )

  // ── STACK TAB ─────────────────────────────────────────────────────────────
  const renderStack = () => (
    <div>
      <NRow style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: COL.dim, fontFamily: fig }}>Your supplement stack. Tap to mark taken.</span>
        <span style={{ fontSize: 12, color: COL.ember, fontFamily: fig, cursor: 'pointer' }} onClick={() => setShowAddSupp(true)}>+ Add</span>
      </NRow>

      {supplements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💊</div>
          <div style={{ fontFamily: fig, fontSize: 12, color: COL.ghost, lineHeight: 1.6 }}>No supplements added yet.</div>
          <button onClick={() => setShowAddSupp(true)} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 8, background: `${COL.ember}18`, border: `1px solid ${COL.ember}40`, color: COL.ember, fontFamily: fig, fontSize: 12, cursor: 'pointer' }}>
            Add first supplement
          </button>
        </div>
      ) : (
        orderedGroups.map(group => (
          <div key={group}>
            <SLabel color={TIMING_COLORS[group] || COL.ghost}>{group}</SLabel>
            {(suppGroups[group] || []).map(supp => {
              const takenToday = supp.last_taken_date === todayStr
              const isUpdating = suppUpdating === supp.id
              return (
                <NCard key={supp.id} style={{ padding: 10, opacity: isUpdating ? 0.6 : 1 }}>
                  <NRow>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: takenToday ? COL.green : COL.ash, fontFamily: fig }}>{supp.name}</span>
                      <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig }}>
                        {supp.dose && `${supp.dose} · `}{supp.frequency || 'Daily'}{supp.note ? ` · ${supp.note}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleSupp(supp)}
                      disabled={isUpdating}
                      style={{
                        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                        background: takenToday ? `${COL.green}20` : `${COL.ember}15`,
                        border: `1px solid ${takenToday ? `${COL.green}50` : `${COL.ember}30`}`,
                        color: takenToday ? COL.green : COL.ember,
                        fontFamily: fig, fontSize: 11,
                      }}>
                      {takenToday ? '✓ Done' : 'Take'}
                    </button>
                  </NRow>
                </NCard>
              )
            })}
          </div>
        ))
      )}

      {/* Stack tip */}
      {supplements.length > 0 && (() => {
        const totalCount = supplements.length
        const takenCount = supplements.filter(s => s.last_taken_date === todayStr).length
        const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0
        return (
          <NCard borderLeft={`3px solid ${pct >= 80 ? COL.green : pct >= 50 ? COL.hot : COL.ember}`} style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: pct >= 80 ? COL.green : COL.hot, fontFamily: fig, marginBottom: 4 }}>
              Today — {takenCount}/{totalCount} taken
            </div>
            <div style={{ height: 4, background: 'rgba(240,234,214,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? COL.green : COL.hot, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
          </NCard>
        )
      })()}
    </div>
  )

  // ── MEALS TAB ─────────────────────────────────────────────────────────────
  const MEAL_GOALS = ['High protein', 'Under 500 cal', '5 min prep', 'Meal prep batch']
  const filteredMeals = mealGoalFilter && savedMeals.length > 0
    ? savedMeals.filter(m => {
        if (mealGoalFilter === 'High protein') return (parseFloat(m.protein_g) || 0) >= 30
        if (mealGoalFilter === 'Under 500 cal') return (m.calories || 0) < 500
        return true
      })
    : savedMeals

  const renderMeals = () => (
    <div>
      <NRow style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: COL.dim, fontFamily: fig }}>Tap a meal to quick-log it.</span>
        <span style={{ fontSize: 12, color: COL.ember, fontFamily: fig, cursor: 'pointer' }} onClick={() => setShowCreateMeal(true)}>+ Create</span>
      </NRow>

      {savedMeals.length > 0 && (
        <>
          <SLabel>Go-to meals</SLabel>
          {filteredMeals.map(meal => (
            <div key={meal.id}
              onClick={() => quickLogging !== meal.id && handleQuickLogMeal(meal)}
              style={{ background: COL.coal, border: `0.5px solid ${COL.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer', opacity: quickLogging === meal.id ? 0.5 : 1 }}>
              <NRow style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{meal.name}</span>
                <span style={{ fontSize: 11, color: COL.ghost, fontFamily: fig }}>
                  {quickLogging === meal.id ? 'Logging…' : `Logged ${meal.log_count || 0}×`}
                </span>
              </NRow>
              {meal.description && <div style={{ fontSize: 11, color: COL.dim, fontFamily: fig, marginBottom: 4 }}>{meal.description}</div>}
              <MacroRow cal={meal.calories} protein={Math.round(meal.protein_g)} carbs={Math.round(meal.carbs_g)} fat={Math.round(meal.fat_g)} />
            </div>
          ))}
        </>
      )}

      {savedMeals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, lineHeight: 1.6, marginBottom: 12 }}>No saved meals yet. Create one to quick-log it in the future.</div>
          <button onClick={() => setShowCreateMeal(true)} style={{ padding: '9px 20px', borderRadius: 8, background: `${COL.ember}18`, border: `1px solid ${COL.ember}40`, color: COL.ember, fontFamily: fig, fontSize: 12, cursor: 'pointer' }}>
            Create first meal
          </button>
        </div>
      )}

      <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
      <SLabel>Filter by goal</SLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MEAL_GOALS.map(g => (
          <div key={g}
            onClick={() => setMealGoalFilter(mealGoalFilter === g ? null : g)}
            style={{ background: mealGoalFilter === g ? `${COL.ember}18` : COL.char, border: `0.5px solid ${mealGoalFilter === g ? `${COL.ember}40` : COL.charBorder}`, borderRadius: 6, padding: '7px 12px', fontSize: 11, color: mealGoalFilter === g ? COL.ember : COL.dim, fontFamily: fig, cursor: 'pointer' }}>
            {g} →
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>AI suggests meals based on remaining macros.</div>
    </div>
  )

  // ── BODY TAB ──────────────────────────────────────────────────────────────
  const latestWeight = weightLog[0]
  const prevWeight = weightLog[1]
  const weightDelta = latestWeight && prevWeight
    ? (parseFloat(latestWeight.weight_lbs) - parseFloat(prevWeight.weight_lbs)).toFixed(1)
    : null

  const renderBody = () => (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[
          { v: latestWeight ? `${parseFloat(latestWeight.weight_lbs).toFixed(1)}` : '—', l: 'Weight (lbs)', col: COL.ash },
          { v: logTargets.calories?.toLocaleString() || '2,400', l: 'Daily target', col: COL.hot },
          { v: GOAL_TARGETS[bodyGoal]?.label || 'Maintain', l: 'Current goal', col: COL.dim },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: COL.char, borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: sora, fontSize: 17, fontWeight: 600, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 10, color: COL.faint, fontFamily: fig, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Goal selector */}
      <NCard>
        <SLabel>Goal</SLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['cut', 'Cut'], ['maintain', 'Maintain'], ['lean bulk', 'Lean bulk'], ['bulk', 'Bulk']].map(([key, label]) => {
            const isActive = bodyGoal === key
            return (
              <div key={key}
                onClick={() => handleSaveBodyGoal(key)}
                style={{ flex: 1, padding: 8, borderRadius: 6, textAlign: 'center', cursor: 'pointer',
                  background: isActive ? `${COL.ember}18` : COL.coal,
                  border: `${isActive ? 1 : 0.5}px solid ${isActive ? `${COL.ember}40` : COL.charBorder}`,
                  fontSize: 11, color: isActive ? COL.ember : COL.faint, fontFamily: fig,
                }}>
                {label}
              </div>
            )
          })}
        </div>
        <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>Goal sets calorie target and macro split automatically</div>
      </NCard>

      {/* Weight log */}
      <NRow style={{ margin: '10px 0 6px' }}>
        <SLabel>Weight log</SLabel>
        <span style={{ fontSize: 12, color: COL.ember, fontFamily: fig, cursor: 'pointer' }} onClick={() => setShowLogWeight(true)}>+ Log today</span>
      </NRow>

      {weightLog.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px', color: COL.ghost, fontFamily: fig, fontSize: 11 }}>No weight logged yet.</div>
      ) : (
        weightLog.slice(0, 10).map((entry, i) => {
          const prev = weightLog[i + 1]
          const delta = prev ? (parseFloat(entry.weight_lbs) - parseFloat(prev.weight_lbs)).toFixed(1) : null
          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < Math.min(weightLog.length, 10) - 1 ? `0.5px solid ${COL.charLight}` : 'none' }}>
              <span style={{ fontSize: 13, color: COL.ash, fontFamily: fig }}>{formatDate(entry.logged_date)}</span>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontFamily: sora, fontSize: 13, fontWeight: 500, color: COL.ash }}>{parseFloat(entry.weight_lbs).toFixed(1)}</span>
                {delta && (
                  <span style={{ fontSize: 11, color: parseFloat(delta) > 0 ? COL.green : parseFloat(delta) < 0 ? COL.ember : COL.faint, fontFamily: fig, marginLeft: 6 }}>
                    {parseFloat(delta) > 0 ? '+' : ''}{delta}
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  // ── KNOWLEDGE TAB (static) ────────────────────────────────────────────────
  const KNOWLEDGE_CARDS = [
    { title: "Protein timing doesn't matter (much)", tag: 'Protein', tagBg: `${COL.hot}20`, tagCol: COL.hot, body: 'The anabolic window is mostly a myth. Hit your daily target — 0.7-1g per pound. Spread across 3-5 meals, 30-50g per sitting.' },
    { title: 'Creatine is the only proven supplement', tag: 'Supplements', tagBg: `${COL.green}20`, tagCol: COL.green, body: '5g/day, every day, no loading needed. Increases muscle energy reserves — more reps, more volume, more growth.' },
    { title: 'Your cut calories should be gradual', tag: 'Cutting', tagBg: `${COL.ember}20`, tagCol: COL.ember, body: '300-500 deficit, not 1,000. Protein stays high (1g/lb). Drop another 200 only when weight stalls 2+ weeks.' },
    { title: 'Water matters more than you think', tag: 'Hydration', tagBg: `${COL.blue}20`, tagCol: COL.blue, body: '2% dehydration drops strength 10-20%. Half bodyweight in ounces daily. Creatine users need extra 16-20oz.' },
    { title: 'Sleep is an anabolic steroid', tag: 'Recovery', tagBg: `${COL.hot}20`, tagCol: COL.hot, body: 'GH peaks during deep sleep. Under 7 hrs = more cortisol, less recovery. 7-9 hours is non-negotiable for results.' },
    { title: 'Meal prep saves your diet', tag: 'Meal prep', tagBg: `${COL.green}20`, tagCol: COL.green, body: 'Cook 3-4 proteins + 2-3 carbs on Sunday. 90 minutes. If the food is ready, you eat it. If not, you order DoorDash.' },
  ]
  const K_FILTERS = ['All', 'Protein', 'Cutting', 'Bulking', 'Supplements', 'Recovery', 'Hydration']
  const filteredKnowledge = knowledgeFilter === 'All' ? KNOWLEDGE_CARDS : KNOWLEDGE_CARDS.filter(c => c.tag === knowledgeFilter)

  const renderKnowledge = () => (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {K_FILTERS.map(f => (
          <span key={f} onClick={() => setKnowledgeFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 14, fontFamily: fig, fontSize: 11, cursor: 'pointer',
              background: knowledgeFilter === f ? COL.ember : COL.char,
              color: knowledgeFilter === f ? COL.ash : COL.dim }}>
            {f}
          </span>
        ))}
      </div>
      {filteredKnowledge.map((card, i) => (
        <NCard key={i}>
          <NRow>
            <span style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{card.title}</span>
            <NTag bg={card.tagBg} color={card.tagCol}>{card.tag}</NTag>
          </NRow>
          <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.6, marginTop: 6 }}>{card.body}</div>
        </NCard>
      ))}
    </div>
  )

  // ── LEARN TAB (static) ────────────────────────────────────────────────────
  const L_FILTERS = ['All', 'Guides', 'Calculators', 'Research', 'Tools']
  const renderLearn = () => (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {L_FILTERS.map(f => (
          <span key={f} onClick={() => setLearnFilter(f)}
            style={{ padding: '5px 12px', borderRadius: 14, fontFamily: fig, fontSize: 11, cursor: 'pointer',
              background: learnFilter === f ? COL.ember : COL.char,
              color: learnFilter === f ? COL.ash : COL.dim }}>
            {f}
          </span>
        ))}
      </div>
      <NCard borderLeft={`3px solid ${COL.hot}`} style={{ padding: 14 }}>
        <NTag bg={`${COL.hot}20`} color={COL.hot}>Featured guide</NTag>
        <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>Your first meal prep: a step-by-step system</div>
        <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>Pick 2 proteins, 2 carbs, 1 sauce. 90 minutes on Sunday. Uses your actual macro targets.</div>
        <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Start guide →</div>
      </NCard>
      {(learnFilter === 'All' || learnFilter === 'Guides') && (
        <>
          <SLabel>Guides</SLabel>
          {[['Set up your macros in 5 minutes', 'Enter weight, pick goal, Cinis calculates everything.'],
            ['Build a supplement stack', "What's proven, what's marketing, how to time it."],
            ['The reverse diet playbook', 'Coming off a cut without gaining it all back.'],
          ].map(([t, d], i) => (
            <NCard key={i} style={{ padding: 14 }}>
              <NTag bg={`${COL.ember}20`} color={COL.ember}>Guide</NTag>
              <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
              <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
              <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Start →</div>
            </NCard>
          ))}
        </>
      )}
      {(learnFilter === 'All' || learnFilter === 'Calculators') && (
        <>
          <SLabel>Calculators</SLabel>
          {[['TDEE calculator', 'Total Daily Energy Expenditure — everything starts here.'],
            ['1RM estimator', 'Weight × reps → estimated one-rep max.'],
            ['Cut / bulk timeline', 'Current weight → goal → how long each phase takes.'],
          ].map(([t, d], i) => (
            <NCard key={i} style={{ padding: 14 }}>
              <NTag bg={`${COL.green}20`} color={COL.green}>Calculator</NTag>
              <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
              <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
              <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Calculate →</div>
            </NCard>
          ))}
        </>
      )}
      {(learnFilter === 'All' || learnFilter === 'Tools') && (
        <>
          <SLabel>Trusted resources</SLabel>
          {[['Examine.com', 'Independent supplement research. No sponsorships.', 'https://examine.com'],
            ['Jeff Nippard', 'Evidence-based training + nutrition content.', 'https://youtube.com/@JeffNippard'],
            ['Renaissance Periodization', 'Gold standard structured meal plans.', 'https://rpstrength.com'],
          ].map(([t, d, href], i) => (
            <NCard key={i} style={{ padding: 14 }}>
              <NTag bg={`${COL.ash}10`} color={COL.dim}>External</NTag>
              <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
              <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
              <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Open site →</div>
              </a>
            </NCard>
          ))}
        </>
      )}
    </div>
  )

  // ── INSIGHTS TAB ──────────────────────────────────────────────────────────
  const renderInsights = () => {
    const stats = insightsData?.stats
    const insight = insightsData?.insight
    return (
      <div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { v: insightsLoading ? '…' : (stats?.avg_meals_per_day ?? '—'), l: 'Avg meals/day', col: COL.hot },
            { v: insightsLoading ? '…' : (stats?.avg_water_per_day ?? '—'), l: 'Avg glasses', col: COL.blue },
            { v: insightsLoading ? '…' : (stats != null ? `${stats.supplement_adherence_pct}%` : '—'), l: 'Supp adherence', col: COL.green },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: COL.char, borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontFamily: sora, fontSize: 18, fontWeight: 600, color: s.col }}>{s.v}</div>
              <div style={{ fontSize: 10, color: COL.faint, fontFamily: fig, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* AI insight */}
        {(insight || insightsLoading) && (
          <NCard borderLeft={`3px solid ${COL.ember}`}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.ember, fontFamily: fig, marginBottom: 4 }}>Coach insight</div>
            <div style={{ fontSize: 12, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.6 }}>
              {insightsLoading ? 'Analyzing your last 7 days…' : insight}
            </div>
          </NCard>
        )}

        {/* Avg calories + protein cards */}
        {stats && (
          <>
            {stats.avg_calories_per_day > 0 && (
              <NCard borderLeft={`3px solid ${COL.hot}`}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.hot, fontFamily: fig, marginBottom: 4 }}>Calories (7-day avg)</div>
                <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 700, color: COL.ash }}>{stats.avg_calories_per_day}</div>
                <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, marginTop: 2 }}>
                  Target: {logTargets.calories} · {stats.avg_calories_per_day >= logTargets.calories ? 'On or above target' : `${logTargets.calories - stats.avg_calories_per_day} below target`}
                </div>
              </NCard>
            )}
            {stats.avg_protein_per_day > 0 && (
              <NCard borderLeft={`3px solid ${COL.blue}`}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.blue, fontFamily: fig, marginBottom: 4 }}>Protein (7-day avg)</div>
                <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 700, color: COL.ash }}>{stats.avg_protein_per_day}g</div>
                <div style={{ fontSize: 11, color: COL.ghost, fontFamily: fig, marginTop: 2 }}>
                  Target: {logTargets.protein}g · {stats.avg_protein_per_day >= logTargets.protein ? 'Hitting target' : `${logTargets.protein - stats.avg_protein_per_day}g short on average`}
                </div>
              </NCard>
            )}
          </>
        )}

        {!insightsLoading && !insightsData && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: COL.ghost, fontFamily: fig, fontSize: 12 }}>
            Log meals for a few days to unlock insights.
          </div>
        )}

        <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
        <NCard style={{ textAlign: 'center', padding: 14 }}>
          <div style={{ fontSize: 12, color: COL.dim, fontFamily: fig, marginBottom: 6 }}>Your coach knows your nutrition data</div>
          <div
            onClick={() => switchTab && switchTab('checkin')}
            style={{ fontSize: 12, color: COL.ember, fontFamily: fig, cursor: 'pointer' }}>
            Ask about meal ideas or supplement timing →
          </div>
        </NCard>
      </div>
    )
  }

  // ── TAB MAP ───────────────────────────────────────────────────────────────
  const TABS = ['Log', 'Meals', 'Stack', 'Body', 'Insights', 'Knowledge', 'Learn']
  const tabRenderers = {
    log: renderLog, meals: renderMeals, stack: renderStack,
    body: renderBody, insights: renderInsights,
    knowledge: renderKnowledge, learn: renderLearn,
  }

  return (
    <>
      <div style={{ paddingBottom: 80, background: COL.coal, minHeight: '100vh' }}>
        {/* Sub-tab nav */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 14px', overflowX: 'auto' }}>
          {TABS.map(tab => {
            const key = tab.toLowerCase()
            const isActive = nutrSub === key
            return (
              <button key={tab} onClick={() => setNutrSub(key)}
                style={{
                  padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  background: isActive ? 'rgba(232,50,26,0.15)' : COL.char,
                  color: isActive ? COL.ember : COL.ghost,
                  border: isActive ? '1px solid rgba(232,50,26,0.25)' : `1px solid ${COL.charBorder}`,
                  fontFamily: fig, fontSize: 12, fontWeight: isActive ? 500 : 400,
                }}>
                {tab}
              </button>
            )
          })}
        </div>
        <div style={{ padding: '0 14px' }}>
          {(tabRenderers[nutrSub] || tabRenderers.log)()}
        </div>
      </div>

      {/* Sheets */}
      <LogMealSheet
        open={showLogMeal}
        onClose={() => setShowLogMeal(false)}
        defaultMealType={defaultMealType}
        loggedFetch={loggedFetch}
        onSave={() => { setLogLoaded(false); fetchLog() }}
      />
      <LogWeightSheet
        open={showLogWeight}
        onClose={() => setShowLogWeight(false)}
        loggedFetch={loggedFetch}
        onSave={() => { setWeightLoaded(false); fetchWeightLog() }}
      />
      <CreateSavedMealSheet
        open={showCreateMeal}
        onClose={() => setShowCreateMeal(false)}
        loggedFetch={loggedFetch}
        onSave={() => { setMealsLoaded(false); fetchSavedMeals() }}
      />
      <AddSupplementSheet
        open={showAddSupp}
        onClose={() => setShowAddSupp(false)}
        loggedFetch={loggedFetch}
        onSave={() => { setSuppLoaded(false); fetchSupplements() }}
      />
    </>
  )
}
