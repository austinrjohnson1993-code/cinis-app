import { useState, useEffect, useRef } from 'react'
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
  coach: 'Coach',
}
const PERSONA_KEYS = Object.keys(PERSONA_DISPLAY)

/* ── Chore cadence options ─────────────────────────────────────────────────── */
const CADENCE_OPTIONS = [
  { id: 'light', emoji: '\uD83C\uDF3F', title: 'Light', sub: 'Weekly essentials' },
  { id: 'standard', emoji: '\uD83E\uDDF9', title: 'Standard', sub: 'Balanced routine' },
  { id: 'thorough', emoji: '\u2728', title: 'Thorough', sub: 'Full deep clean' },
]

/* ── Color palette ─────────────────────────────────────────────────────────── */
const C = {
  coal: '#211A14',
  char: '#3E3228',
  ash: '#F0EAD6',
  hot: '#FF6644',
  ember: '#E8321A',
  green: '#4CAF50',
  gold: '#FFB800',
  dim: 'rgba(240,234,214,0.36)',
  ghost: 'rgba(240,234,214,0.22)',
  micro: 'rgba(240,234,214,0.14)',
  border: 'rgba(240,234,214,0.08)',
}

/* ── Coach memory icon colors by category ────────────────────────────────── */
const MEMORY_ICON_COLORS = {
  pattern: C.hot,
  avoidance: C.ember,
  strength: C.green,
  default: C.hot,
}

/* ── Spark SVG ─────────────────────────────────────────────────────────────── */
const SparkSvg = ({ color = C.hot }) => (
  <svg width="9" height="9" viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0, marginTop: 2 }}>
    <path d="M8 0l2 5h5l-4 3 2 5-5-3-5 3 2-5L1 5h5z" />
  </svg>
)

/* ── Chevron SVG ───────────────────────────────────────────────────────────── */
const Chevron = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2.5" strokeLinecap="round" className={styles.chevron}>
    <path d="M9 6l6 6-6 6" />
  </svg>
)

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function TabSettings({ user, profile, setProfile, showToast, loggedFetch }) {
  const router = useRouter()
  const patchTimeoutRef = useRef(null)

  // ── State ─────────────────────────────────────────────────────────────────
  const [subpage, setSubpage] = useState(null) // null | 'checkin' | 'notifications' | 'account' | 'about'
  const [checkinMorning, setCheckinMorning] = useState(true)
  const [checkinMidday, setCheckinMidday] = useState(false)
  const [checkinEvening, setCheckinEvening] = useState(true)
  const [checkinMorningTime, setCheckinMorningTime] = useState('08:00')
  const [checkinMiddayTime, setCheckinMiddayTime] = useState('12:30')
  const [checkinEveningTime, setCheckinEveningTime] = useState('20:00')

  const [notifPush, setNotifPush] = useState(true)
  const [notifCheckin, setNotifCheckin] = useState(true)
  const [notifBills, setNotifBills] = useState(true)
  const [notifStreak, setNotifStreak] = useState(true)

  const [choreCadence, setChoreCadence] = useState('standard')
  const [coachMemories, setCoachMemories] = useState([])
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [addingMemory, setAddingMemory] = useState(false)
  const [newMemoryText, setNewMemoryText] = useState('')
  const [memoryToDelete, setMemoryToDelete] = useState(null)
  const [deletingMemory, setDeletingMemory] = useState(false)

  // ── Account & privacy sub-page state ────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [displayNameEditing, setDisplayNameEditing] = useState(false)
  const [privAiStorage, setPrivAiStorage] = useState(true)
  const [privAnalytics, setPrivAnalytics] = useState(true)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteAccountSending, setDeleteAccountSending] = useState(false)

  // ── Feedback sub-page state ─────────────────────────────────────────────
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)

  // ── Fetch coach memories on mount ───────────────────────────────────────
  useEffect(() => {
    const fetchMemories = async () => {
      if (!user) return
      setMemoriesLoading(true)
      try {
        const res = await loggedFetch('/api/coach-memories', { method: 'GET' })
        if (res.ok) {
          const data = await res.json()
          setCoachMemories(Array.isArray(data) ? data : data.memories || [])
        }
      } catch {
        console.error('Failed to fetch coach memories')
      } finally {
        setMemoriesLoading(false)
      }
    }
    fetchMemories()
  }, [user, loggedFetch])

  // ── Sync from profile ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.full_name || '')
    const sched = profile.checkin_schedule
    if (sched) {
      setCheckinMorning(sched.morning !== false)
      setCheckinMidday(sched.midday === true)
      setCheckinEvening(sched.evening !== false)
      if (sched.morning_time) setCheckinMorningTime(sched.morning_time)
      if (sched.midday_time) setCheckinMiddayTime(sched.midday_time)
      if (sched.evening_time) setCheckinEveningTime(sched.evening_time)
    } else if (Array.isArray(profile.checkin_times)) {
      setCheckinMorning(profile.checkin_times.includes('morning'))
      setCheckinMidday(profile.checkin_times.includes('midday'))
      setCheckinEvening(profile.checkin_times.includes('evening'))
    }
    const nprefs = profile.notification_prefs
    if (nprefs) {
      setNotifPush(nprefs.push !== false)
      setNotifCheckin(nprefs.checkin !== false)
      setNotifBills(nprefs.bills !== false)
      setNotifStreak(nprefs.streak !== false)
    }
    if (profile.chore_cadence) setChoreCadence(profile.chore_cadence)
    const pp = profile.privacy_prefs
    if (pp) {
      setPrivAiStorage(pp.ai_storage !== false)
      setPrivAnalytics(pp.analytics !== false)
    }
  }, [profile])

  // ── Patch helper with debounce ────────────────────────────────────────────
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

  // ── Debounced patch (800ms) ────────────────────────────────────────────────
  const debouncedPatch = (updates) => {
    if (patchTimeoutRef.current) clearTimeout(patchTimeoutRef.current)
    patchTimeoutRef.current = setTimeout(() => {
      patchProfile(updates)
    }, 800)
  }

  // ── Coaching blend ────────────────────────────────────────────────────────
  const blend = profile?.persona_blend || []
  const handleBlendTap = (key) => {
    const current = profile?.persona_blend || []
    let next
    if (current.includes(key)) {
      next = current.filter(k => k !== key)
    } else {
      if (current.length >= 3) {
        // Auto-deselect oldest when 4th tapped
        next = [...current.slice(1), key]
      } else {
        next = [...current, key]
      }
    }
    setProfile(prev => ({ ...prev, persona_blend: next }))
    debouncedPatch({ persona_blend: next })
  }

  // ── Format relative time ───────────────────────────────────────────────────
  const formatRelativeTime = (isoString) => {
    const now = new Date()
    const date = new Date(isoString)
    const diffMs = now - date
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ── Coach memory: add ──────────────────────────────────────────────────────
  const handleAddMemory = async () => {
    if (!newMemoryText.trim() || !user) return
    setAddingMemory(true)
    try {
      const res = await loggedFetch('/api/coach-memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newMemoryText.trim(), source: 'user_note' }),
      })
      if (res.ok) {
        const newMem = await res.json()
        setCoachMemories(prev => [newMem, ...prev])
        setNewMemoryText('')
        showToast('Memory saved')
      }
    } catch {
      showToast('Failed to save memory')
    } finally {
      setAddingMemory(false)
    }
  }

  // ── Coach memory: delete ───────────────────────────────────────────────────
  const handleDeleteMemory = async (id) => {
    if (!user) return
    setDeletingMemory(true)
    try {
      const res = await loggedFetch(`/api/coach-memories/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setCoachMemories(prev => prev.filter(m => m.id !== id))
        setMemoryToDelete(null)
        showToast('Memory deleted')
      }
    } catch {
      showToast('Failed to delete memory')
    } finally {
      setDeletingMemory(false)
    }
  }

  // ── Check-in schedule toggle ──────────────────────────────────────────────
  const handleCheckinToggle = (slot) => {
    const map = { morning: [checkinMorning, setCheckinMorning], midday: [checkinMidday, setCheckinMidday], evening: [checkinEvening, setCheckinEvening] }
    const [val, setter] = map[slot]
    const newVal = !val
    setter(newVal)
    const newSched = {
      morning: slot === 'morning' ? newVal : checkinMorning,
      midday: slot === 'midday' ? newVal : checkinMidday,
      evening: slot === 'evening' ? newVal : checkinEvening,
      morning_time: checkinMorningTime,
      midday_time: checkinMiddayTime,
      evening_time: checkinEveningTime,
    }
    const checkin_times = Object.entries(newSched).filter(([k, v]) => !k.endsWith('_time') && v).map(([k]) => k)
    debouncedPatch({ checkin_schedule: newSched, checkin_times })
  }

  // ── Check-in time change ───────────────────────────────────────────────────
  const handleCheckinTimeChange = (slot, time) => {
    const map = { morning: setCheckinMorningTime, midday: setCheckinMiddayTime, evening: setCheckinEveningTime }
    map[slot](time)
    const newSched = {
      morning: checkinMorning,
      midday: checkinMidday,
      evening: checkinEvening,
      morning_time: slot === 'morning' ? time : checkinMorningTime,
      midday_time: slot === 'midday' ? time : checkinMiddayTime,
      evening_time: slot === 'evening' ? time : checkinEveningTime,
    }
    debouncedPatch({ checkin_schedule: newSched })
  }

  // ── Notification toggles ──────────────────────────────────────────────────
  const handleNotifToggle = async (key) => {
    const map = { push: [notifPush, setNotifPush], checkin: [notifCheckin, setNotifCheckin], bills: [notifBills, setNotifBills], streak: [notifStreak, setNotifStreak] }
    const [val, setter] = map[key]
    const newVal = !val
    setter(newVal)
    if (newVal && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    const newPrefs = {
      push: key === 'push' ? newVal : notifPush,
      checkin: key === 'checkin' ? newVal : notifCheckin,
      bills: key === 'bills' ? newVal : notifBills,
      streak: key === 'streak' ? newVal : notifStreak,
    }
    debouncedPatch({ notification_prefs: newPrefs })
  }

  // ── Chore cadence ─────────────────────────────────────────────────────────
  const handleCadence = (id) => {
    setChoreCadence(id)
    setProfile(prev => ({ ...prev, chore_cadence: id }))
    debouncedPatch({ chore_cadence: id })
  }

  // ── Save display name ──────────────────────────────────────────────────────
  const handleSaveDisplayName = async () => {
    if (!displayName.trim() || !user) return
    try {
      const res = await loggedFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, updates: { full_name: displayName.trim() } }),
      })
      if (res.ok) {
        setProfile(prev => ({ ...prev, full_name: displayName.trim() }))
        setDisplayNameEditing(false)
        showToast('Name updated')
      }
    } catch {
      showToast('Failed to update name')
    }
  }

  // ── Privacy toggles ──────────────────────────────────────────────────
  const handlePrivacyToggle = (key) => {
    const map = { ai_storage: [privAiStorage, setPrivAiStorage], analytics: [privAnalytics, setPrivAnalytics] }
    const [val, setter] = map[key]
    const newVal = !val
    setter(newVal)
    const newPrefs = {
      ai_storage: key === 'ai_storage' ? newVal : privAiStorage,
      analytics: key === 'analytics' ? newVal : privAnalytics,
    }
    debouncedPatch({ privacy_prefs: newPrefs })
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE' || !user) return
    setDeleteAccountSending(true)
    try {
      await loggedFetch('/api/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      showToast('Delete failed')
      setDeleteAccountSending(false)
    }
  }

  // ── Feedback handler ────────────────────────────────────────────────────
  const handleFeedback = async () => {
    if (!feedbackText.trim()) return
    setFeedbackSending(true)
    try {
      await loggedFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, message: feedbackText.trim() }),
      })
      showToast('Thanks — got it.')
      setFeedbackText('')
    } catch { showToast('Failed to send') }
    setFeedbackSending(false)
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const initial = firstName?.charAt(0)?.toUpperCase() || '?'
  const isPro = profile?.subscription_status === 'pro'

  // ── Sub-page back header ──────────────────────────────────────────────────
  const SubHeader = ({ title }) => (
    <div className={styles.subHeader} onClick={() => setSubpage(null)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ghost} strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className={styles.subHeaderTitle}>{title}</span>
    </div>
  )

  /* ── SUB-PAGE: Check-in schedule ────────────────────────────────────────── */
  if (subpage === 'checkin') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Check-in schedule" />

        <div className={styles.card}>
          {[
            { key: 'morning', label: 'Morning', val: checkinMorning, time: checkinMorningTime },
            { key: 'midday', label: 'Midday', val: checkinMidday, time: checkinMiddayTime },
            { key: 'evening', label: 'Evening', val: checkinEvening, time: checkinEveningTime, last: true },
          ].map(({ key, label, val, time, last }) => (
            <div key={key} className={last ? styles.toggleRowLast : styles.toggleRow}>
              <div className={styles.toggleLeft}>
                <div className={styles.toggleLabel}>{label}</div>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => handleCheckinTimeChange(key, e.target.value)}
                  className={styles.timeInput}
                  disabled={!val}
                />
              </div>
              <button className={val ? styles.toggleOn : styles.toggle} onClick={() => handleCheckinToggle(key)}>
                <span className={val ? styles.toggleThumbOn : styles.toggleThumb} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: Notifications ────────────────────────────────────────────── */
  if (subpage === 'notifications') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Notifications" />

        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Push notifications</div>
              <div className={styles.toggleSub}>Browser & mobile alerts</div>
            </div>
            <button className={notifPush ? styles.toggleOn : styles.toggle} onClick={() => handleNotifToggle('push')}>
              <span className={notifPush ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
          {notifPush && (
            <>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLeft}>
                  <div className={styles.toggleLabel}>Check-in reminders</div>
                  <div className={styles.toggleSub}>Per schedule</div>
                </div>
                <button className={notifCheckin ? styles.toggleOn : styles.toggle} onClick={() => handleNotifToggle('checkin')}>
                  <span className={notifCheckin ? styles.toggleThumbOn : styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRow}>
                <div className={styles.toggleLeft}>
                  <div className={styles.toggleLabel}>Bill due alerts</div>
                  <div className={styles.toggleSub}>2 days before due date</div>
                </div>
                <button className={notifBills ? styles.toggleOn : styles.toggle} onClick={() => handleNotifToggle('bills')}>
                  <span className={notifBills ? styles.toggleThumbOn : styles.toggleThumb} />
                </button>
              </div>
              <div className={styles.toggleRowLast}>
                <div className={styles.toggleLeft}>
                  <div className={styles.toggleLabel}>Streak at risk</div>
                  <div className={styles.toggleSub}>If no activity by 9pm</div>
                </div>
                <button className={notifStreak ? styles.toggleOn : styles.toggle} onClick={() => handleNotifToggle('streak')}>
                  <span className={notifStreak ? styles.toggleThumbOn : styles.toggleThumb} />
                </button>
              </div>
            </>
          )}
          {!notifPush && (
            <div className={styles.toggleRowLast} />
          )}
        </div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: Account & privacy ────────────────────────────────────────── */
  if (subpage === 'account') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Account & privacy" />

        {/* Display name */}
        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Display name</div>
              {displayNameEditing ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={styles.nameEditInput}
                  autoFocus
                />
              ) : (
                <div className={styles.toggleSub}>{displayName || 'Not set'}</div>
              )}
            </div>
            {displayNameEditing ? (
              <button className={styles.saveNameBtn} onClick={handleSaveDisplayName}>Save</button>
            ) : (
              <button className={styles.editNameBtn} onClick={() => setDisplayNameEditing(true)}>Edit</button>
            )}
          </div>
          <div className={styles.toggleRowLast}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Email address</div>
              <div className={styles.toggleSub}>{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Password */}
        <div className={styles.card}>
          <div className={styles.toggleRowLast}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Password</div>
              <div className={styles.toggleSub}>Manage your login security</div>
            </div>
            <button className={styles.changePasswordBtn} onClick={() => window.open('https://getcinis.app/change-password', '_blank')}>Change</button>
          </div>
        </div>

        {/* Privacy toggles */}
        <div className={styles.secLabel}>DATA & PRIVACY</div>
        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>AI conversation storage</div>
              <div className={styles.toggleSub}>Used for coach memory and insights</div>
            </div>
            <button className={privAiStorage ? styles.toggleOn : styles.toggle} onClick={() => handlePrivacyToggle('ai_storage')}>
              <span className={privAiStorage ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
          <div className={styles.toggleRowLast}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Usage analytics</div>
              <div className={styles.toggleSub}>Helps improve the product (anonymous)</div>
            </div>
            <button className={privAnalytics ? styles.toggleOn : styles.toggle} onClick={() => handlePrivacyToggle('analytics')}>
              <span className={privAnalytics ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
        </div>

        {/* Export data */}
        <div className={styles.secLabel}>EXPORT DATA</div>
        <div className={styles.card}>
          <div className={styles.toggleRowLast} onClick={() => showToast('Export feature coming soon')}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Download my data</div>
              <div className={styles.toggleSub}>JSON export sent to email</div>
            </div>
            <Chevron />
          </div>
        </div>

        {/* Danger zone */}
        <div className={styles.dangerCard}>
          <div className={styles.dangerTitle}>Danger zone</div>
          <div className={styles.dangerText}>Deleting your account removes all data permanently. This cannot be undone.</div>
          <div className={styles.dangerSubText}>Type DELETE to confirm:</div>
          <input
            type="text"
            placeholder="DELETE"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className={styles.deleteConfirmInput}
          />
          <button
            className={deleteConfirmText === 'DELETE' ? styles.dangerBtnActive : styles.dangerBtn}
            disabled={deleteConfirmText !== 'DELETE' || deleteAccountSending}
            onClick={handleDeleteAccount}
          >
            {deleteAccountSending ? 'Deleting...' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: About & feedback ─────────────────────────────────────────── */
  if (subpage === 'about') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="About & feedback" />

        {/* Brand card */}
        <div className={styles.aboutBrand}>
          <div className={styles.aboutMarkWrap}><CinisMark size={40} /></div>
          <div className={styles.aboutName}>CINIS</div>
          <div className={styles.aboutTagline}>Where start meets finished.</div>
          <div className={styles.aboutVersion}>v0.9.1 Built in Georgetown, TX</div>
        </div>

        {/* Links */}
        <div className={styles.card}>
          {[
            { label: 'Terms of service', action: () => window.open('https://getcinis.app/terms', '_blank') },
            { label: 'Privacy policy', action: () => window.open('https://getcinis.app/privacy', '_blank'), last: true },
          ].map(({ label, action, last }) => (
            <div key={label} className={last ? styles.accountRowLast : styles.accountRow} onClick={action}>
              <span className={styles.accountRowLabel}>{label}</span>
              <Chevron />
            </div>
          ))}
        </div>

        {/* Feedback */}
        <div className={styles.cardPad}>
          <div className={styles.feedbackTitle}>Got a thought?</div>
          <textarea
            className={styles.feedbackInput}
            placeholder="Tell us what you think..."
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
          />
          <button
            className={styles.feedbackBtn}
            disabled={feedbackSending || !feedbackText.trim()}
            onClick={handleFeedback}
          >
            {feedbackSending ? 'Sending...' : 'Send feedback'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Render (main settings) ──────────────────────────────────────────────
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
            <div className={styles.upgradeSub}>Memory · SMS · 15 AI/day · $14/mo</div>
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
                {i > 0 && ' · '}
                <span className={styles.blendName}>{PERSONA_DISPLAY[k] || k}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 5 — Chore cadence */}
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

      {/* 6 — Coach's memory */}
      <div className={styles.secLabel}>COACH'S MEMORY</div>
      <div className={styles.cardPad}>
        <div className={styles.memoryHeader}>
          <div className={styles.memoryIcon}>
            <CinisMark size={9} />
          </div>
          <div className={styles.memoryDesc}>What your coach carries into every conversation.</div>
        </div>

        <div className={styles.memoryStack}>
          {memoriesLoading ? (
            <div className={styles.memoryEmpty}>Loading...</div>
          ) : coachMemories.length > 0 ? (
            coachMemories.map((mem) => {
              const category = mem.category || 'default'
              const iconColor = MEMORY_ICON_COLORS[category] || MEMORY_ICON_COLORS.default
              return (
                <div key={mem.id} className={styles.memoryCard}>
                  <div className={styles.memoryCardContent}>
                    <SparkSvg color={iconColor} />
                    <div className={styles.memoryCardText}>{mem.text}</div>
                  </div>
                  <div className={styles.memoryCardMeta}>
                    Learned from {mem.source || 'check-in'} · {formatRelativeTime(mem.created_at)}
                  </div>
                  <button
                    className={styles.memoryDeleteBtn}
                    onClick={() => handleDeleteMemory(mem.id)}
                    disabled={deletingMemory}
                  >
                    ×
                  </button>
                </div>
              )
            })
          ) : (
            <div className={styles.memoryEmpty}>
              Your coach is still learning your patterns. Check in a few more times to build memory.
            </div>
          )}
        </div>

        {/* Add memory context row */}
        <div className={styles.memoryAddRow}>
          <div className={styles.memoryAddPrompt}>+ Tell your coach something...</div>
          {addingMemory && (
            <div className={styles.memoryAddForm}>
              <textarea
                className={styles.memoryAddInput}
                placeholder="What should your coach remember about you?"
                value={newMemoryText}
                onChange={(e) => setNewMemoryText(e.target.value)}
                autoFocus
              />
              <div className={styles.memoryAddButtons}>
                <button
                  className={styles.memoryAddSaveBtn}
                  onClick={handleAddMemory}
                  disabled={!newMemoryText.trim()}
                >
                  Save
                </button>
                <button
                  className={styles.memoryAddCancelBtn}
                  onClick={() => { setNewMemoryText(''); setAddingMemory(false); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7 — Settings nav */}
      <div className={styles.secLabel}>SETTINGS</div>
      <div className={styles.card}>
        {[
          { label: 'Check-in schedule', page: 'checkin' },
          { label: 'Notifications', page: 'notifications' },
          { label: 'Account & privacy', page: 'account' },
          { label: 'About & feedback', page: 'about', last: true },
        ].map(({ label, page, last }) => (
          <div
            key={label}
            className={last ? styles.accountRowLast : styles.accountRow}
            onClick={() => setSubpage(page)}
          >
            <span className={styles.accountRowLabel}>{label}</span>
            <Chevron />
          </div>
        ))}
      </div>

      {/* 8 — Log out + version */}
      <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
        Log out
      </button>
      <div className={styles.version}>Cinis v0.9.1 · Built in Georgetown, TX</div>
    </div>
  )
}
