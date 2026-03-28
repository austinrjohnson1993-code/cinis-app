import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabase'
import CinisMark from '../../lib/CinisMark'
import styles from '../../styles/TabSettings.module.css'

/* ── Persona display map ───────────────────────────────────────────────────── */
const PERSONA_DISPLAY = {
  strategist: 'Strategist',
  empath: 'Empath',
  drill_sergeant: 'Drill Sergeant',
  hype_person: 'Hype Person',
  thinking_partner: 'Thinking Partner',
}
const PERSONA_KEYS = Object.keys(PERSONA_DISPLAY)

/* ── Chore cadence options ─────────────────────────────────────────────────── */
const CADENCE_OPTIONS = [
  { id: 'light', emoji: '\uD83C\uDF3F', title: 'Light', sub: 'Weekly essentials' },
  { id: 'standard', emoji: '\uD83E\uDDF9', title: 'Standard', sub: 'Balanced routine' },
  { id: 'thorough', emoji: '\u2728', title: 'Thorough', sub: 'Full deep clean' },
]

/* ── Spark SVG ─────────────────────────────────────────────────────────────── */
const SparkSvg = () => (
  <svg width="9" height="9" viewBox="0 0 16 16" fill="#FF6644" style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M8 0l2 5h5l-4 3 2 5-5-3-5 3 2-5L1 5h5z" />
  </svg>
)

/* ── Chevron SVG ───────────────────────────────────────────────────────────── */
const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2.5" strokeLinecap="round" className={styles.chevron}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function TabSettings({ user, profile, setProfile, showToast, loggedFetch }) {
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────────────────
  const [checkinMorning, setCheckinMorning] = useState(true)
  const [checkinMidday, setCheckinMidday] = useState(false)
  const [checkinEvening, setCheckinEvening] = useState(true)

  const [notifCheckin, setNotifCheckin] = useState(true)
  const [notifBills, setNotifBills] = useState(true)
  const [notifStreak, setNotifStreak] = useState(true)

  const [choreCadence, setChoreCadence] = useState('standard')
  const [memoryClearing, setMemoryClearing] = useState(false) // false | 'confirm' | 'cleared'

  // ── Sync from profile ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    const sched = profile.checkin_schedule
    if (sched) {
      setCheckinMorning(sched.morning !== false)
      setCheckinMidday(sched.midday === true)
      setCheckinEvening(sched.evening !== false)
    } else if (Array.isArray(profile.checkin_times)) {
      setCheckinMorning(profile.checkin_times.includes('morning'))
      setCheckinMidday(profile.checkin_times.includes('midday'))
      setCheckinEvening(profile.checkin_times.includes('evening'))
    }
    const nprefs = profile.notification_prefs
    if (nprefs) {
      setNotifCheckin(nprefs.checkin !== false)
      setNotifBills(nprefs.bills !== false)
      setNotifStreak(nprefs.streak !== false)
    }
    if (profile.chore_cadence) setChoreCadence(profile.chore_cadence)
  }, [profile])

  // ── Patch helper ──────────────────────────────────────────────────────────
  const patchProfile = async (updates) => {
    if (!user) return false
    try {
      const res = await loggedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, updates }),
      })
      if (res.ok) { showToast('Saved'); return true }
      return false
    } catch { return false }
  }

  // ── Coaching blend ────────────────────────────────────────────────────────
  const blend = profile?.persona_blend || []
  const handleBlendTap = async (key) => {
    const current = profile?.persona_blend || []
    let next
    if (current.includes(key)) {
      next = current.filter(k => k !== key)
    } else {
      if (current.length >= 3) return
      next = [...current, key]
    }
    setProfile(prev => ({ ...prev, persona_blend: next }))
    const ok = await patchProfile({ persona_blend: next })
    if (!ok) setProfile(prev => ({ ...prev, persona_blend: current }))
  }

  // ── Check-in schedule toggle ──────────────────────────────────────────────
  const handleCheckinToggle = async (slot) => {
    const map = { morning: [checkinMorning, setCheckinMorning], midday: [checkinMidday, setCheckinMidday], evening: [checkinEvening, setCheckinEvening] }
    const [val, setter] = map[slot]
    const newVal = !val
    setter(newVal)
    const newSched = {
      morning: slot === 'morning' ? newVal : checkinMorning,
      midday: slot === 'midday' ? newVal : checkinMidday,
      evening: slot === 'evening' ? newVal : checkinEvening,
    }
    // Also update checkin_times array for backward compat
    const checkin_times = Object.entries(newSched).filter(([, v]) => v).map(([k]) => k)
    await patchProfile({ checkin_schedule: newSched, checkin_times })
  }

  // ── Notification toggles ──────────────────────────────────────────────────
  const handleNotifToggle = async (key) => {
    const map = { checkin: [notifCheckin, setNotifCheckin], bills: [notifBills, setNotifBills], streak: [notifStreak, setNotifStreak] }
    const [val, setter] = map[key]
    const newVal = !val
    setter(newVal)
    if (newVal && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    const newPrefs = {
      checkin: key === 'checkin' ? newVal : notifCheckin,
      bills: key === 'bills' ? newVal : notifBills,
      streak: key === 'streak' ? newVal : notifStreak,
    }
    await patchProfile({ notification_prefs: newPrefs })
  }

  // ── Chore cadence ─────────────────────────────────────────────────────────
  const handleCadence = async (id) => {
    setChoreCadence(id)
    setProfile(prev => ({ ...prev, chore_cadence: id }))
    await patchProfile({ chore_cadence: id })
  }

  // ── Clear memory ──────────────────────────────────────────────────────────
  const handleClearMemory = async () => {
    setMemoryClearing('cleared')
    setProfile(prev => ({ ...prev, coach_memory: [], coach_memory_updated_at: null }))
    await loggedFetch('/api/profile/memory', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) }).catch(() => {})
    showToast('Memory cleared')
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const initial = firstName?.charAt(0)?.toUpperCase() || '?'
  const isPro = profile?.plan === 'pro'
  const memory = profile?.coach_memory || []
  const memoryDate = profile?.coach_memory_updated_at
    ? new Date(profile.coach_memory_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      {/* 1 — Header */}
      <div className={styles.header}>Settings</div>

      {/* 2 — Profile card */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>{initial}</div>
        <div className={styles.profileInfo}>
          <div className={styles.profileName}>{profile?.full_name || 'User'}</div>
          <div className={styles.profileEmail}>{user?.email}</div>
        </div>
        <span className={isPro ? styles.planPro : styles.planFree}>{isPro ? 'PRO' : 'FREE'}</span>
      </div>

      {/* 3 — Upgrade banner (free only) */}
      {!isPro && (
        <div className={styles.upgradeBanner} onClick={() => router.push('/pricing')}>
          <div className={styles.upgradeLeft}>
            <div className={styles.upgradeTitle}>Upgrade to Pro</div>
            <div className={styles.upgradeSub}>Memory &middot; SMS &middot; 15 AI/day &middot; $14/mo</div>
          </div>
          <div className={styles.upgradeArrow}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        </div>
      )}

      {/* 4 — Coaching blend */}
      <div className={styles.secLabel}>COACHING BLEND</div>
      <div className={styles.cardPad}>
        <div className={styles.blendDesc}>Pick up to 3 voices. Your coach blends them in every response.</div>
        <div className={styles.chips}>
          {PERSONA_KEYS.map(key => (
            <button
              key={key}
              className={blend.includes(key) ? styles.chipActive : styles.chip}
              onClick={() => handleBlendTap(key)}
            >
              {PERSONA_DISPLAY[key]}
            </button>
          ))}
        </div>
        {blend.length > 0 && (
          <div className={styles.blendDisplay}>
            Active:{' '}
            {blend.map((k, i) => (
              <span key={k}>
                {i > 0 && ' \u00B7 '}
                <span className={styles.blendName}>{PERSONA_DISPLAY[k] || k}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5 — Check-in schedule */}
      <div className={styles.secLabel}>CHECK-IN SCHEDULE</div>
      <div className={styles.card}>
        {[
          { key: 'morning', label: 'Morning', time: '8:00 AM', val: checkinMorning },
          { key: 'midday', label: 'Midday', time: '12:30 PM', val: checkinMidday },
          { key: 'evening', label: 'Evening', time: '8:00 PM', val: checkinEvening, last: true },
        ].map(({ key, label, time, val, last }) => (
          <div key={key} className={last ? styles.toggleRowLast : styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>{label}</div>
              <div className={styles.toggleSub}>{time}</div>
            </div>
            <button className={val ? styles.toggleOn : styles.toggle} onClick={() => handleCheckinToggle(key)}>
              <span className={val ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
        ))}
      </div>

      {/* 6 — Notifications */}
      <div className={styles.secLabel}>NOTIFICATIONS</div>
      <div className={styles.card}>
        {[
          { key: 'checkin', label: 'Check-in reminders', sub: 'Push per schedule', val: notifCheckin },
          { key: 'bills', label: 'Bill due alerts', sub: '2 days before due date', val: notifBills },
          { key: 'streak', label: 'Streak at risk', sub: 'If no activity by 9pm', val: notifStreak, last: true },
        ].map(({ key, label, sub, val, last }) => (
          <div key={key} className={last ? styles.toggleRowLast : styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>{label}</div>
              <div className={styles.toggleSub}>{sub}</div>
            </div>
            <button className={val ? styles.toggleOn : styles.toggle} onClick={() => handleNotifToggle(key)}>
              <span className={val ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
        ))}
      </div>

      {/* 7 — Chore cadence */}
      <div className={styles.secLabel}>CHORE CADENCE</div>
      <div className={styles.cardPad}>
        <div className={styles.cadenceDesc}>How often chores show up in your Routines. Adjusts the full preset.</div>
        <div className={styles.cadenceRow}>
          {CADENCE_OPTIONS.map(opt => {
            const active = choreCadence === opt.id
            return (
              <div key={opt.id} className={active ? styles.cadenceTileActive : styles.cadenceTile} onClick={() => handleCadence(opt.id)}>
                <div className={styles.cadenceEmoji}>{opt.emoji}</div>
                <div className={active ? styles.cadenceTitleActive : styles.cadenceTitle}>{opt.title}</div>
                <div className={active ? styles.cadenceSubActive : styles.cadenceSub}>{opt.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 8 — Coach's memory */}
      <div className={styles.secLabel}>COACH&apos;S MEMORY</div>
      <div className={styles.cardPad}>
        <div className={styles.memoryHeader}>
          <div className={styles.memoryIcon}>
            <CinisMark size={9} />
          </div>
          <div className={styles.memoryDesc}>What your coach carries into every conversation.</div>
        </div>

        <div className={styles.memoryStack}>
          {memory.length > 0 ? memory.map((item, i) => (
            <div key={i} className={styles.memoryItem}>
              <SparkSvg />
              <div className={styles.memoryItemText}>{item}</div>
            </div>
          )) : (
            <div className={styles.memoryEmpty}>
              Your coach is still learning your patterns. Check in a few more times to build memory.
            </div>
          )}
        </div>

        <div className={styles.memoryFooter}>
          <span className={styles.memoryDate}>{memoryDate ? `Last updated ${memoryDate}` : ''}</span>
          {memoryClearing === 'confirm' ? (
            <div>
              <div className={styles.memoryConfirmText}>This will clear everything your coach has learned. Are you sure?</div>
              <div className={styles.memoryConfirmRow}>
                <button className={styles.memoryConfirmYes} onClick={handleClearMemory}>Yes, clear</button>
                <button className={styles.memoryConfirmCancel} onClick={() => setMemoryClearing(false)}>Cancel</button>
              </div>
            </div>
          ) : memoryClearing === 'cleared' ? (
            <span className={styles.memoryClearedBtn}>Cleared</span>
          ) : (
            <button className={styles.memoryClearBtn} onClick={() => setMemoryClearing('confirm')}>Clear memory</button>
          )}
        </div>
      </div>

      {/* 9 — Account */}
      <div className={styles.secLabel}>ACCOUNT</div>
      <div className={styles.card}>
        {[
          { label: 'Subscription & billing' },
          { label: 'Data & privacy' },
          { label: 'Export my data' },
          { label: 'About & feedback', last: true },
        ].map(({ label, last }) => (
          <div
            key={label}
            className={last ? styles.accountRowLast : styles.accountRow}
            onClick={() => console.log(`[settings] ${label}`)}
          >
            <span className={styles.accountRowLabel}>{label}</span>
            <Chevron />
          </div>
        ))}
      </div>

      {/* 10 — Log out + version */}
      <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
        Log out
      </button>
      <div className={styles.version}>Cinis v0.9.1 &middot; Built in Georgetown, TX</div>
    </div>
  )
}
