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
  const [subpage, setSubpage] = useState(null) // null | 'billing' | 'privacy' | 'export' | 'about'
  const [checkinMorning, setCheckinMorning] = useState(true)
  const [checkinMidday, setCheckinMidday] = useState(false)
  const [checkinEvening, setCheckinEvening] = useState(true)

  const [notifCheckin, setNotifCheckin] = useState(true)
  const [notifBills, setNotifBills] = useState(true)
  const [notifStreak, setNotifStreak] = useState(true)

  const [choreCadence, setChoreCadence] = useState('standard')
  const [memoryClearing, setMemoryClearing] = useState(false) // false | 'confirm' | 'cleared'

  // ── Privacy sub-page state ──────────────────────────────────────────────
  const [privAiStorage, setPrivAiStorage] = useState(true)
  const [privAnalytics, setPrivAnalytics] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // ── Export sub-page state ───────────────────────────────────────────────
  const [exportSending, setExportSending] = useState(null) // null | 'full' | 'journal' | 'tasks'

  // ── Feedback sub-page state ─────────────────────────────────────────────
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSending, setFeedbackSending] = useState(false)

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
    const pp = profile.privacy_prefs
    if (pp) {
      setPrivAiStorage(pp.ai_storage !== false)
      setPrivAnalytics(pp.analytics !== false)
    }
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

  // ── Privacy toggles ──────────────────────────────────────────────────────
  const handlePrivacyToggle = async (key) => {
    const map = { ai_storage: [privAiStorage, setPrivAiStorage], analytics: [privAnalytics, setPrivAnalytics] }
    const [val, setter] = map[key]
    const newVal = !val
    setter(newVal)
    const newPrefs = {
      ai_storage: key === 'ai_storage' ? newVal : privAiStorage,
      analytics: key === 'analytics' ? newVal : privAnalytics,
    }
    await patchProfile({ privacy_prefs: newPrefs })
  }

  // ── Export handler ──────────────────────────────────────────────────────
  const handleExport = async (type) => {
    setExportSending(type)
    try {
      await loggedFetch(`/api/export?type=${type}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      showToast(`Export sent to ${user?.email}`)
    } catch { showToast('Export failed') }
    setTimeout(() => setExportSending(null), 2000)
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
      showToast('Thanks \u2014 got it.')
      setFeedbackText('')
    } catch { showToast('Failed to send') }
    setFeedbackSending(false)
  }

  // ── Delete account handler ──────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    try {
      await loggedFetch('/api/delete-account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id }) })
      await supabase.auth.signOut()
      router.push('/')
    } catch { showToast('Delete failed') }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const initial = firstName?.charAt(0)?.toUpperCase() || '?'
  const isPro = profile?.plan === 'pro'
  const memory = profile?.coach_memory || []
  const memoryDate = profile?.coach_memory_updated_at
    ? new Date(profile.coach_memory_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  // ── Sub-page back header ──────────────────────────────────────────────────
  const SubHeader = ({ title }) => (
    <div className={styles.subHeader} onClick={() => setSubpage(null)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span className={styles.subHeaderTitle}>{title}</span>
    </div>
  )

  /* ── SUB-PAGE: Billing ──────────────────────────────────────────────────── */
  if (subpage === 'billing') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Subscription & billing" />

        {/* Current plan */}
        <div className={styles.cardPad}>
          <div className={styles.billingPlanRow}>
            <div>
              <div className={styles.billingPlanName}>{isPro ? 'Cinis Pro' : 'Cinis Free'}</div>
              <div className={styles.billingPlanDesc}>{isPro ? 'Full access to all features' : 'Basic productivity tools'}</div>
            </div>
            <span className={isPro ? styles.planPro : styles.planFree}>{isPro ? 'ACTIVE' : 'FREE'}</span>
          </div>

          {!isPro && (
            <>
              <div className={styles.divider} />
              <div className={styles.missLabel}>What you&apos;re missing</div>
              {['Coach memory across sessions', 'SMS check-in reminders', '15 AI interactions per day'].map(item => (
                <div key={item} className={styles.missRow}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  <span className={styles.missText}>{item}</span>
                </div>
              ))}
              <button className={styles.upgradeCta} onClick={() => router.push('/pricing')}>
                <div className={styles.upgradeCtaTitle}>Upgrade to Pro &mdash; $14/mo</div>
                <div className={styles.upgradeCtaSub}>or $99/year &middot; cancel anytime</div>
              </button>
            </>
          )}

          {isPro && (
            <>
              <div className={styles.divider} />
              <div className={styles.billingDetailRow}><span className={styles.billingDetailLabel}>Next renewal</span><span className={styles.billingDetailVal}>Managed by Stripe</span></div>
              <button className={styles.cancelBtn} onClick={() => console.log('[settings] cancel sub')}>Cancel subscription</button>
            </>
          )}
        </div>

        {/* Payment & history */}
        <div className={styles.secLabel}>PAYMENT & HISTORY</div>
        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Payment method</div>
              <div className={styles.toggleSub}>{isPro ? 'Visa ending in ••••' : 'No payment method on file'}</div>
            </div>
          </div>
          <div className={styles.toggleRowLast}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Billing history</div>
              <div className={styles.toggleSub}>{isPro ? 'View invoices' : 'No charges yet'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: Privacy ──────────────────────────────────────────────────── */
  if (subpage === 'privacy') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Data & privacy" />

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
          <div className={styles.toggleRow}>
            <div className={styles.toggleLeft}>
              <div className={styles.toggleLabel}>Usage analytics</div>
              <div className={styles.toggleSub}>Helps improve the product (anonymous)</div>
            </div>
            <button className={privAnalytics ? styles.toggleOn : styles.toggle} onClick={() => handlePrivacyToggle('analytics')}>
              <span className={privAnalytics ? styles.toggleThumbOn : styles.toggleThumb} />
            </button>
          </div>
          <div className={styles.accountRowLast} onClick={() => window.open('https://getcinis.app/privacy', '_blank')}>
            <span className={styles.accountRowLabel}>Privacy policy</span>
            <Chevron />
          </div>
        </div>

        {/* Danger zone */}
        <div className={styles.dangerCard}>
          <div className={styles.dangerTitle}>Danger zone</div>
          <div className={styles.dangerText}>Deleting your account removes all data permanently. This cannot be undone.</div>
          {!deleteConfirm ? (
            <button className={styles.dangerBtn} onClick={() => setDeleteConfirm(true)}>Delete my account</button>
          ) : (
            <div>
              <div className={styles.memoryConfirmText}>Are you absolutely sure? All data will be permanently deleted.</div>
              <div className={styles.memoryConfirmRow}>
                <button className={styles.memoryConfirmYes} onClick={handleDeleteAccount}>Yes, delete</button>
                <button className={styles.memoryConfirmCancel} onClick={() => setDeleteConfirm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: Export ────────────────────────────────────────────────────── */
  if (subpage === 'export') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="Export my data" />

        <div className={styles.exportDesc}>Download a copy of your data. Exports are sent to your email within a few minutes.</div>

        {[
          { type: 'full', title: 'Full data export', sub: 'JSON \u00B7 all records \u00B7 sent to email', color: '#4CAF50', icon: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3' },
          { type: 'journal', title: 'Journal entries only', sub: 'Markdown \u00B7 all entries', color: '#3B8BD4', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
          { type: 'tasks', title: 'Task history', sub: 'CSV \u00B7 completed + active', color: '#FFB800', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8' },
        ].map(opt => (
          <div key={opt.type} className={styles.exportRow} onClick={() => handleExport(opt.type)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={opt.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={opt.icon} /></svg>
            <div className={styles.exportRowText}>
              <div className={styles.exportRowTitle}>{opt.title}</div>
              <div className={styles.exportRowSub}>{opt.sub}</div>
            </div>
            {exportSending === opt.type ? (
              <span className={styles.exportSent}>Sent</span>
            ) : (
              <Chevron />
            )}
          </div>
        ))}

        <div className={styles.exportFooter}>Export is sent to {user?.email} within a few minutes.</div>
      </div>
    </div>
  )

  /* ── SUB-PAGE: About ────────────────────────────────────────────────────── */
  if (subpage === 'about') return (
    <div className={styles.wrap}>
      <div className={styles.subWrap}>
        <SubHeader title="About & feedback" />

        {/* Brand card */}
        <div className={styles.aboutBrand}>
          <div className={styles.aboutMarkWrap}><CinisMark size={40} /></div>
          <div className={styles.aboutName}>CINIS</div>
          <div className={styles.aboutTagline}>Where start meets finished.</div>
          <div className={styles.aboutVersion}>v0.9.1 &middot; Built in Georgetown, TX</div>
        </div>

        {/* Links */}
        <div className={styles.card}>
          {[
            { label: 'Send feedback', action: () => {} },
            { label: 'Rate Cinis', action: () => {} },
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
          { label: 'Subscription & billing', page: 'billing' },
          { label: 'Data & privacy', page: 'privacy' },
          { label: 'Export my data', page: 'export' },
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

      {/* 10 — Log out + version */}
      <button className={styles.logoutBtn} onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}>
        Log out
      </button>
      <div className={styles.version}>Cinis v0.9.1 &middot; Built in Georgetown, TX</div>
    </div>
  )
}
