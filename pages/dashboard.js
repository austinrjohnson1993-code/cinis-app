import React, { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Dashboard.module.css'
import { CheckSquare, ChatCircle, Target, CalendarBlank, Wallet, ChartLineUp, Gear, ArrowCounterClockwise, UsersThree, BowlFood, Books } from '@phosphor-icons/react'
import { showToast as libShowToast, ToastContainer } from '../lib/toast.js'
import { applyAccentColor } from '../lib/accentColor'
import { THEMES, applyTheme, TabErrorBoundary } from '../components/tabs/shared'

// Tab components
import TabTasks from '../components/tabs/TabTasks'
import TabCheckin from '../components/tabs/TabCheckin'
import TabFocus from '../components/tabs/TabFocus'
import TabCalendar from '../components/tabs/TabCalendar'
import TabHabits from '../components/tabs/TabHabits'
import TabTagTeam from '../components/tabs/TabTagTeam'
import TabFinance from '../components/tabs/TabFinance'
import TabNutrition from '../components/tabs/TabNutrition'
import TabProgress from '../components/tabs/TabProgress'
import TabGuide from '../components/tabs/TabGuide'
import TabSettings from '../components/tabs/TabSettings'

// ── Nav config ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare size={22} /> },
  { id: 'checkin', label: 'Check-in', icon: <ChatCircle size={22} /> },
  { id: 'focus', label: 'Focus', icon: <Target size={22} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarBlank size={22} /> },
  { id: 'habits', label: 'Habits', icon: <ArrowCounterClockwise size={22} /> },
  { id: 'tagteam', label: 'Tag Team', icon: <UsersThree size={22} /> },
  { id: 'finance', label: 'Finance', icon: <Wallet size={22} /> },
  { id: 'nutrition', label: 'Nutrition', icon: <BowlFood size={22} /> },
  { id: 'progress', label: 'Progress', icon: <ChartLineUp size={22} /> },
  { id: 'guide', label: 'Guide', icon: <Books size={22} /> },
  { id: 'settings', label: 'Settings', icon: <Gear size={22} /> },
]
const NAV_PRIMARY_IDS = ['tasks', 'checkin', 'focus', 'calendar']
const NAV_MORE_IDS = ['habits', 'tagteam', 'finance', 'nutrition', 'progress', 'guide', 'settings']

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [greeting, setGreeting] = useState('')
  const [activeTheme, setActiveTheme] = useState(THEMES[0])
  const [showMoreDrawer, setShowMoreDrawer] = useState(false)

  // Voice FAB
  const [voiceFabState, setVoiceFabState] = useState('idle')
  const voiceFabRecognitionRef = useRef(null)

  // Debug
  const debugRef = useRef({ lastCall: null, lastError: null })
  const isDebug = typeof window !== 'undefined' && window.location.search.includes('debug=true')

  const loggedFetch = useCallback(async (url, opts = {}) => {
    const t0 = Date.now()
    try {
      const res = await fetch(url, opts)
      const clone = res.clone()
      const text = await clone.text().catch(() => '')
      debugRef.current.lastCall = { endpoint: url, method: opts.method || 'GET', status: res.status, ms: Date.now() - t0, preview: text.slice(0, 120) }
      return new Response(text, { status: res.status, headers: res.headers })
    } catch (err) {
      debugRef.current.lastCall = { endpoint: url, method: opts.method || 'GET', status: 'ERR', ms: Date.now() - t0, preview: String(err) }
      debugRef.current.lastError = String(err)
      throw err
    }
  }, [])

  const showToast = (msg) => libShowToast(msg)
  const switchTab = (id) => { setActiveTab(id); setShowMoreDrawer(false) }

  // ── Auth + data fetch ────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const savedColor = localStorage.getItem('fb_accent_color')
      if (savedColor) {
        const theme = THEMES.find(t => t.id === savedColor) || THEMES.find(t => t.accent === savedColor)
        if (theme) applyTheme(theme)
        else applyAccentColor(savedColor)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data)
      if (data.accent_color) {
        const savedTheme = THEMES.find(t => t.id === data.accent_color) || THEMES.find(t => t.accent === data.accent_color) || THEMES[0]
        applyTheme(savedTheme)
        setActiveTheme(savedTheme)
        if (typeof localStorage !== 'undefined') localStorage.setItem('fb_accent_color', savedTheme.id)
      }
    } else {
      router.push('/onboarding')
    }
  }

  const fetchTasks = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('tasks').select('*').eq('user_id', userId).eq('archived', false)
        .order('sort_order', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false })
      if (error) throw error
      setTasks(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const hasSession = { current: false }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        hasSession.current = true
        setUser(session.user)
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          fetchProfile(session.user.id)
          fetchTasks(session.user.id)
        }
      } else if (event === 'SIGNED_OUT' && hasSession.current) {
        router.push('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Voice FAB ────────────────────────────────────────────────────────────
  const startVoiceFab = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { libShowToast('Voice input not supported in this browser.', { type: 'error' }); return }
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
    recognition.onerror = () => { setVoiceFabState('idle'); libShowToast('Could not hear you. Try again.', { type: 'error' }) }
    recognition.onend = () => setVoiceFabState(prev => prev === 'recording' ? 'idle' : prev)
    voiceFabRecognitionRef.current = recognition
    recognition.start()
  }
  const stopVoiceFab = () => voiceFabRecognitionRef.current?.stop()
  const handleVoiceFabClick = () => {
    if (voiceFabState === 'idle') startVoiceFab()
    else if (voiceFabState === 'recording') stopVoiceFab()
  }
  const handleVoiceInput = async (transcript) => {
    try {
      const res = await loggedFetch('/api/voice/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: transcript }) })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed')
      setVoiceFabState('idle')
      if (user) fetchTasks(user.id)
      libShowToast(`Created: ${data.message}`, { type: 'undo', duration: 5000, undoCallback: () => handleUndoVoiceTask(data.record.id, data.type) })
    } catch { setVoiceFabState('idle'); libShowToast('Could not create task. Try again.', { type: 'error' }) }
  }
  const handleUndoVoiceTask = async (id, type) => {
    try {
      if (type === 'bill') await loggedFetch(`/api/bills/${id}`, { method: 'DELETE' })
      else await loggedFetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true }) })
      if (user) fetchTasks(user.id)
      libShowToast('Undone.', { type: 'success', duration: 2000 })
    } catch { libShowToast('Could not undo. Try again.', { type: 'error' }) }
  }

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/') }
  const handleRunRollover = async () => {
    try {
      const res = await loggedFetch('/api/rollover-tasks', { method: 'POST' })
      const data = await res.json()
      showToast(`Rolled ${data.rolled} task${data.rolled !== 1 ? 's' : ''}`)
      if (data.rolled > 0 && user) fetchTasks(user.id)
    } catch { showToast('Rollover failed') }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className={styles.loadingPage}>
      <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '1.3rem', letterSpacing: '0.16em', color: '#F5F0E3' }}>CINIS</span>
    </div>
  )

  const tabProps = { user, profile, setProfile, tasks, setTasks, showToast, loggedFetch, switchTab }

  return (
    <>
      <Head><title>Dashboard — Cinis</title></Head>
      <div className={styles.appShell}>

        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarLogo}>
            <svg width="24" height="24" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <polygon points="32,2 56,15 56,43 32,56 8,43 8,15" fill="none" stroke="#FF6644" strokeWidth="1.1" opacity="0.45"/>
              <path d="M 12.63,14.56 L 29.37,5.44 Q 32,4 34.63,5.44 L 51.37,14.56 Q 54,16 54,19 L 54,39 Q 54,42 51.37,43.44 L 34.63,52.56 Q 32,54 29.37,52.56 L 12.63,43.44 Q 10,42 10,39 L 10,19 Q 10,16 12.63,14.56 Z" fill="#FF6644"/>
              <path d="M 14.9,16.1 L 29.8,7.8 Q 32,6.6 34.2,7.8 L 49.1,16.1 Q 51.4,17.4 51.4,20 L 51.4,38 Q 51.4,40.6 49.1,41.9 L 34.2,50.2 Q 32,51.4 29.8,50.2 L 14.9,41.9 Q 12.6,40.6 12.6,38 L 12.6,20 Q 12.6,17.4 14.9,16.1 Z" fill="#120704"/>
              <polygon points="32,14 46,22 46,40 32,48 18,40 18,22" fill="#5A1005"/>
              <polygon points="32,20 42,26 42,40 32,45 22,40 22,26" fill="#A82010"/>
              <polygon points="32,26 38,29 38,40 32,43 26,40 26,29" fill="#E8321A"/>
              <polygon points="32,29 45,40 40,43 32,47 24,43 19,40" fill="#FF6644" opacity="0.92"/>
              <polygon points="32,33 41,40 38,42 32,45 26,42 23,40" fill="#FFD0C0" opacity="0.76"/>
              <polygon points="32,36 37,40 36,41 32,43 28,41 27,40" fill="#FFF0EB" opacity="0.60"/>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.16em', color: '#F5F0E3' }}>CINIS</span>
              <span style={{ fontFamily: "'Figtree', sans-serif", fontSize: '0.62rem', color: 'rgba(245,240,227,0.3)', letterSpacing: '0.01em', lineHeight: 1 }}>Where start meets finished.</span>
            </div>
          </div>
          <nav className={styles.sidebarNav}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => switchTab(item.id)}
                className={`${styles.sidebarNavItem} ${activeTab === item.id ? styles.sidebarNavItemActive : ''}`}>
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            {profile?.session_count > 0 && (
              <span className={styles.sessionBadge}>Session #{profile.session_count}</span>
            )}
            <span className={styles.sidebarEmail}>{user?.email}</span>
            <button onClick={handleSignOut} className={styles.signOutBtn}>Sign out</button>
            <button onClick={handleRunRollover} className={styles.rolloverDevBtn}>Run rollover</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className={styles.main}>
          {activeTab === 'tasks' && <TabErrorBoundary tabName="Tasks"><TabTasks {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'checkin' && <TabErrorBoundary tabName="Check-in"><TabCheckin {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'focus' && <TabErrorBoundary tabName="Focus"><TabFocus {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'calendar' && <TabErrorBoundary tabName="Calendar"><TabCalendar {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'habits' && <TabErrorBoundary tabName="Habits"><TabHabits {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'tagteam' && <TabErrorBoundary tabName="Tag Team"><TabTagTeam {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'finance' && <TabErrorBoundary tabName="Finance"><TabFinance {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'nutrition' && <TabErrorBoundary tabName="Nutrition"><TabNutrition {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'progress' && <TabErrorBoundary tabName="Progress"><TabProgress {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'guide' && <TabErrorBoundary tabName="Guide"><TabGuide {...tabProps} /></TabErrorBoundary>}
          {activeTab === 'settings' && <TabErrorBoundary tabName="Settings"><TabSettings {...tabProps} activeTheme={activeTheme} setActiveTheme={setActiveTheme} /></TabErrorBoundary>}
        </main>

        {/* VOICE FAB */}
        <button
          className={`${styles.voiceFab} ${voiceFabState === 'recording' ? styles.voiceFabRecording : ''} ${voiceFabState === 'processing' ? styles.voiceFabProcessing : ''}`}
          onClick={handleVoiceFabClick}
          aria-label={voiceFabState === 'idle' ? 'Voice input' : voiceFabState === 'recording' ? 'Stop recording' : 'Processing'}
        >
          {voiceFabState === 'recording' ? (
            <div className={styles.voiceWaveBars}>
              <span className={styles.voiceWaveBar} />
              <span className={styles.voiceWaveBar} />
              <span className={styles.voiceWaveBar} />
            </div>
          ) : voiceFabState === 'processing' ? (
            <div className={styles.voiceFabSpinner} />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="white"/>
              <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <line x1="9" y1="22" x2="15" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        {/* TOAST */}
        <ToastContainer />

        {/* BOTTOM NAV (mobile) */}
        <nav className={styles.bottomNav} aria-hidden="true">
          {NAV_ITEMS.filter(i => NAV_PRIMARY_IDS.includes(i.id)).map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className={`${styles.bottomNavItem} ${activeTab === item.id ? styles.bottomNavItemActive : ''}`}>
              <span className={styles.bottomNavIcon}>{item.icon}</span>
              <span className={styles.bottomNavLabel}>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMoreDrawer(true)}
            className={`${styles.bottomNavItem} ${NAV_MORE_IDS.includes(activeTab) ? styles.bottomNavItemActive : ''}`}>
            <span className={styles.bottomNavIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
              </svg>
            </span>
            <span className={styles.bottomNavLabel}>More</span>
          </button>
        </nav>

        {/* MORE DRAWER (mobile) */}
        {showMoreDrawer && (
          <div className={styles.moreDrawerOverlay} onClick={() => setShowMoreDrawer(false)}>
            <div className={styles.moreDrawer} onClick={e => e.stopPropagation()}>
              <div className={styles.moreDrawerHandle} />
              {NAV_ITEMS.filter(i => NAV_MORE_IDS.includes(i.id)).map(item => (
                <button key={item.id} onClick={() => switchTab(item.id)}
                  className={`${styles.moreDrawerItem} ${activeTab === item.id ? styles.moreDrawerItemActive : ''}`}>
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  )
}
