import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Onboarding.module.css'
import CinisMark from '../lib/CinisMark'

// ── Questions ────────────────────────────────────────────────────────────────

const SLIDE_THEMES = ['Your daily reality', 'Your life systems', 'Your coaching style']

const QUESTIONS = [
  // ── Slide 1: Your daily reality ────────────────────────────
  {
    text: "When a new day starts, what is your relationship with 'The Plan'?",
    options: [
      { id: 'a', text: "I have a solid idea of what needs to happen" },
      { id: 'b', text: "There are items, but things get lost" },
      { id: 'c', text: "I'm purely reactive — the day decides" },
      { id: 'd', text: "I'm starting from zero every morning" },
    ]
  },
  {
    text: "How do you usually find out that you're 'behind' on life?",
    options: [
      { id: 'a', text: "I see it coming and adjust early" },
      { id: 'b', text: "I scramble when a deadline arrives" },
      { id: 'c', text: "Late Notice arrives — someone reminds me" },
      { id: 'd', text: "'Behind' feels like my normal state" },
    ]
  },
  {
    text: "Thinking about money: How were you taught to handle it?",
    options: [
      { id: 'a', text: "System or budgeting — it was modeled for me" },
      { id: 'b', text: "Careful but no real plan" },
      { id: 'c', text: "Wing it and hope for the best" },
      { id: 'd', text: "Blind anxiety or avoidance" },
    ]
  },
  // ── Slide 2: Your life systems ─────────────────────────────
  {
    text: "Taking care of your body (food, health) — what's the reality?",
    options: [
      { id: 'a', text: "I'm intentional about it" },
      { id: 'b', text: "Convenience wins most days" },
      { id: 'c', text: "Fastest or easiest food available" },
      { id: 'd', text: "I forget to eat until I'm exhausted" },
    ]
  },
  {
    text: "How do you handle 'The Boring Stuff' (dishes, mail, admin tasks)?",
    options: [
      { id: 'a', text: "It's habitual — I just do it" },
      { id: 'b', text: "Big cleaning days to catch up" },
      { id: 'c', text: "Only when I absolutely have to" },
      { id: 'd', text: "I was never really taught how to maintain a routine" },
    ]
  },
  {
    text: "How do you handle 'Mental Clutter'?",
    options: [
      { id: 'a', text: "I organize it immediately" },
      { id: 'b', text: "Notes everywhere I never look at again" },
      { id: 'c', text: "Keep it in my head and hope" },
      { id: 'd', text: "Hope the important ones come back to me" },
    ]
  },
  // ── Slide 3: Your coaching style ───────────────────────────
  {
    text: "If you're stuck on a task for days, what's the Shepherd move you need?",
    options: [
      { id: 'a', text: "A firm reminder — just tell me to do it" },
      { id: 'b', text: "A gentle nudge — acknowledge it's still there" },
      { id: 'c', text: "The Breakdown — split it into 2-minute parts" },
      { id: 'd', text: "The Check-in — ask why it feels heavy" },
    ]
  },
  {
    text: "What is your relationship with 'Accountability'?",
    options: [
      { id: 'a', text: "I'm my own toughest boss" },
      { id: 'b', text: "I'm better when someone is counting on me" },
      { id: 'c', text: "I self-sabotage or quit when I slip" },
      { id: 'd', text: "I don't really know how to track my own progress" },
    ]
  },
  {
    text: "What is the one area where you feel most 'unguided'?",
    options: [
      { id: 'a', text: "Career and professional growth" },
      { id: 'b', text: "Household and life management" },
      { id: 'c', text: "Finance and money" },
      { id: 'd', text: "Personal health and energy" },
    ]
  },
]

// ── Persona scoring ───────────────────────────────────────────────────────────

const SCORING = [
  // Slide 1 — Your daily reality
  /* Q1 daily plan */       { a: { strategist: 2 }, b: { coach: 2 }, c: { drill_sergeant: 2 }, d: { empath: 2, coach: 1 } },
  /* Q2 behind on life */   { a: { strategist: 2 }, b: { drill_sergeant: 2 }, c: { coach: 2 }, d: { empath: 3 } },
  /* Q3 money */            { a: { strategist: 3 }, b: { thinking_partner: 2 }, c: { drill_sergeant: 2 }, d: { empath: 3 } },
  // Slide 2 — Your life systems
  /* Q4 body/health */      { a: { strategist: 2 }, b: { coach: 2 }, c: { drill_sergeant: 2 }, d: { empath: 3 } },
  /* Q5 boring stuff */     { a: { strategist: 2 }, b: { coach: 2 }, c: { drill_sergeant: 2 }, d: { empath: 2, thinking_partner: 1 } },
  /* Q6 mental clutter */   { a: { strategist: 3 }, b: { thinking_partner: 2 }, c: { drill_sergeant: 2 }, d: { empath: 2 } },
  // Slide 3 — Your coaching style
  /* Q7 stuck task */       { a: { drill_sergeant: 3 }, b: { coach: 3 }, c: { thinking_partner: 3 }, d: { empath: 3 } },
  /* Q8 accountability */   { a: { drill_sergeant: 3 }, b: { hype_person: 2, coach: 1 }, c: { empath: 2, thinking_partner: 1 }, d: { thinking_partner: 2 } },
  /* Q9 unguided area */    { a: { strategist: 2 }, b: { coach: 2 }, c: { strategist: 2, thinking_partner: 1 }, d: { empath: 2 } },
]

const PERSONA_DEFS = {
  drill_sergeant:   { label: 'The Drill Sergeant',   desc: 'Blunt, direct, zero fluff. Gets you moving.' },
  coach:            { label: 'The Coach',             desc: 'Warm, strategic, keeps you moving forward.' },
  thinking_partner: { label: 'The Thinking Partner', desc: 'Collaborative, helps you think it through.' },
  hype_person:      { label: 'The Hype Person',       desc: 'Energetic, celebratory, makes wins feel huge.' },
  strategist:       { label: 'The Strategist',        desc: 'Logical, pragmatic, systems-focused.' },
  empath:           { label: 'The Empath',            desc: 'Emotionally attuned, meets you where you are.' },
}

function computePersonas(answers) {
  const scores = { drill_sergeant: 0, coach: 0, thinking_partner: 0, hype_person: 0, strategist: 0, empath: 0 }
  answers.forEach((optionId, qIdx) => {
    if (!optionId) return
    const weights = SCORING[qIdx]?.[optionId] || {}
    Object.entries(weights).forEach(([persona, pts]) => {
      if (persona in scores) scores[persona] += pts
    })
  })
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 2)
    .slice(0, 3)
    .map(([key]) => key)
}

// ── Mental health context options ─────────────────────────────────────────────

const MH_OPTIONS = [
  { id: 'adhd_diagnosed',   emoji: '🧠', label: 'ADHD — Diagnosed',              desc: 'I have a formal ADHD diagnosis.' },
  { id: 'adhd_suspected',   emoji: '🔍', label: 'ADHD — Suspected',              desc: "I haven't been diagnosed but relate strongly to ADHD." },
  { id: 'ocd',              emoji: '🌀', label: 'OCD',                            desc: 'I have OCD and want better systems around it.' },
  { id: 'anxiety',          emoji: '😟', label: 'Anxiety',                        desc: 'Anxiety gets in the way of starting and finishing things.' },
  { id: 'depression',       emoji: '😔', label: 'Depression',                     desc: 'Low energy and motivation make it hard to get things done.' },
  { id: 'multiple',         emoji: '🧩', label: 'Multiple things',               desc: "A mix of the above — it's complicated." },
  { id: 'no_diagnosis',     emoji: '📋', label: 'No diagnosis — just disorganized', desc: "I don't have a diagnosis but struggle to stay on top of things." },
  { id: 'well_organized',   emoji: '✅', label: 'Well organized — want more',    desc: "I'm already organized but want a smarter system." },
]

// ── Component ─────────────────────────────────────────────────────────────────

const QUESTIONS_PER_SLIDE = 3
const TOTAL_SLIDES = Math.ceil(QUESTIONS.length / QUESTIONS_PER_SLIDE)

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [phase, setPhase] = useState('context') // context | intro | questions | part2 | analyzing | reveal | building
  const [mentalHealthContext, setMentalHealthContext] = useState(null)
  const [name, setName] = useState('')
  const [checkinTimes, setCheckinTimes] = useState(['morning', 'evening'])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null))
  const [animKey, setAnimKey] = useState(0)
  const [slideDirection, setSlideDirection] = useState('forward') // forward | backward
  const [personaBlend, setPersonaBlend] = useState([])
  const [personaVoice, setPersonaVoice] = useState('warm_gentle')
  const [part2Step, setPart2Step] = useState(0)
  const [shepherdFocus, setShepherdFocus] = useState('')
  const [shepherdInterrupt, setShepherdInterrupt] = useState(null)
  const [shepherdCelebrate, setShepherdCelebrate] = useState(null)

  useEffect(() => {
    const isReset = window.location.search.includes('reset=1')
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)
      if (!isReset) {
        const { data: profile } = await supabase
          .from('profiles').select('onboarded, persona_set').eq('id', session.user.id).single()
        if (profile?.onboarded && profile?.persona_set) router.push('/dashboard')
      }
    })
  }, [])

  const toggleCheckinTime = (t) => {
    setCheckinTimes(prev =>
      prev.includes(t)
        ? prev.length > 1 ? prev.filter(x => x !== t) : prev
        : [...prev, t]
    )
  }

  const handleSelect = (qIdx, optionId) => {
    setAnswers(prev => prev.map((a, i) => i === qIdx ? optionId : a))
  }

  const handleNextSlide = () => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setSlideDirection('forward')
      setAnimKey(k => k + 1)
      setCurrentSlide(s => s + 1)
    } else {
      setPhase('part2')
      setPart2Step(0)
    }
  }

  const handleBack = () => {
    if (currentSlide > 0) {
      setSlideDirection('backward')
      setAnimKey(k => k + 1)
      setCurrentSlide(s => s - 1)
    } else {
      setPhase('intro')
    }
  }

  const handlePart2Submit = () => {
    const keys = computePersonas(answers)
    const blend = (keys.length ? keys : ['coach']).map(k => PERSONA_DEFS[k].label)
    setPersonaBlend(blend)
    setPhase('analyzing')
    setTimeout(() => setPhase('reveal'), 1500)
  }

  const [buildStep, setBuildStep] = useState(0)
  const [buildFadeOut, setBuildFadeOut] = useState(false)

  const BUILDING_STEPS = [
    'Setting up your profile\u2026',
    'Calibrating your coaching style\u2026',
    'Preparing your dashboard\u2026',
    'Ready.',
  ]

  const handleConfirm = async () => {
    setPhase('building')
    setBuildStep(0)
    const upsertData = {
      id: user.id,
      email: user.email,
      full_name: name.trim() || user.email.split('@')[0],
      onboarded: true,
      persona_blend: personaBlend,
      persona_voice: personaVoice,
      persona_set: true,
      checkin_times: checkinTimes,
      onboarding_complete: true,
      tutorial_completed: false,
      created_at: new Date().toISOString(),
    }
    if (mentalHealthContext) upsertData.mental_health_context = mentalHealthContext

    // Step 1: save profile
    try {
      await supabase.from('profiles').upsert({
        ...upsertData,
        shepherd_focus: shepherdFocus || null,
        shepherd_interrupt: shepherdInterrupt || null,
        shepherd_celebrate: shepherdCelebrate || null,
      })
    } catch {
      await supabase.from('profiles').upsert(upsertData)
    }
    setBuildStep(1)

    // Step 2: generate baseline
    try {
      await fetch('/api/generate-baseline-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
    } catch (e) {
      console.error('[onboarding] baseline profile generation failed:', e)
    }
    setBuildStep(2)

    // Step 3: brief pause for "preparing dashboard"
    await new Promise(r => setTimeout(r, 800))
    setBuildStep(3)

    // Step 4: fade out then navigate
    await new Promise(r => setTimeout(r, 600))
    setBuildFadeOut(true)
    await new Promise(r => setTimeout(r, 500))
    router.push('/dashboard')
  }

  if (!user) return null

  // ── Context (step 0) ──────────────────────────────────────────────────────
  if (phase === 'context') {
    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.contextContainer}>
            <div className={styles.contextLogo}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CinisMark size={32} />
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.16em', color: '#F0EAD6' }}>CINIS</span>
              </span>
            </div>
            <h1 className={styles.introTitle}>What brings you here?</h1>
            <p className={styles.introSub}>This helps Cinis understand how to support you. You can always update this later.</p>

            <div className={styles.mhGrid}>
              {MH_OPTIONS.map(opt => {
                const selected = mentalHealthContext === opt.id
                return (
                  <div
                    key={opt.id}
                    onClick={() => setMentalHealthContext(selected ? null : opt.id)}
                    className={`${styles.mhCard} ${selected ? styles.mhCardSelected : ''}`}
                  >
                    <div className={styles.mhCardEmoji}>{opt.emoji}</div>
                    <div className={styles.mhCardLabel}>{opt.label}</div>
                    <div className={styles.mhCardDesc}>{opt.desc}</div>
                  </div>
                )
              })}
            </div>

            {mentalHealthContext && (
              <button onClick={() => setPhase('intro')} className={styles.startBtn} style={{ marginTop: '28px' }}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.introContainer}>
            <div className={styles.introLogo}>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <CinisMark size={32} />
                <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.16em', color: '#F0EAD6' }}>CINIS</span>
              </span>
            </div>
            <h1 className={styles.introTitle}>Let's set you up.</h1>
            <p className={styles.introSub}>A few quick questions. No wrong answers. Under a minute.</p>

            <div className={styles.introForm}>
              <div className={styles.introField}>
                <label className={styles.introLabel}>What should we call you?</label>
                <input
                  type="text"
                  placeholder="Your first name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setPhase('questions') }}
                  className={styles.introInput}
                  autoFocus
                />
              </div>

              <div className={styles.introField}>
                <label className={styles.introLabel}>When do you want to check in?</label>
                <div className={styles.checkinRow}>
                  {['morning', 'midday', 'evening'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleCheckinTime(t)}
                      className={`${styles.checkinToggle} ${checkinTimes.includes(t) ? styles.checkinToggleOn : ''}`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => setPhase('questions')} className={styles.startBtn}>
                Next →
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Questions (grouped slides) ────────────────────────────────────────────
  if (phase === 'questions') {
    const slideStart = currentSlide * QUESTIONS_PER_SLIDE
    const slideQuestions = QUESTIONS.slice(slideStart, slideStart + QUESTIONS_PER_SLIDE)
    const slideAllAnswered = slideQuestions.every((_, i) => answers[slideStart + i] !== null)
    const progress = ((currentSlide + 1) / (TOTAL_SLIDES + 1)) * 100

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.questionContainer}>
            <div className={styles.questionNav}>
              <button onClick={handleBack} className={styles.backBtn}>&larr; Back</button>
              <span className={styles.questionCount}>{currentSlide + 1} of {TOTAL_SLIDES + 1}</span>
            </div>

            <div key={animKey} className={`${styles.questionWrap} ${slideDirection === 'backward' ? styles.questionWrapBackward : ''}`}>
              <p className={styles.slideTheme}>{SLIDE_THEMES[currentSlide]}</p>

              {slideQuestions.map((q, i) => {
                const qIdx = slideStart + i
                return (
                  <div key={qIdx} className={styles.questionBlock}>
                    <p className={styles.questionLabel}>{q.text}</p>
                    <div className={styles.optionsList}>
                      {q.options.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => handleSelect(qIdx, opt.id)}
                          className={`${styles.optionPill} ${answers[qIdx] === opt.id ? styles.optionPillSelected : ''}`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              <button
                onClick={handleNextSlide}
                disabled={!slideAllAnswered}
                className={styles.startBtn}
                style={{ marginTop: 8 }}
              >
                {currentSlide < TOTAL_SLIDES - 1 ? 'Next \u2192' : 'Almost done \u2192'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Part 2 questions (Q10–Q12) ───────────────────────────────────────────
  if (phase === 'part2') {
    const totalSteps = TOTAL_SLIDES + 3
    const currentStep = TOTAL_SLIDES + 1 + part2Step
    const progress = (currentStep / totalSteps) * 100

    const handlePart2Back = () => {
      if (part2Step > 0) {
        setPart2Step(s => s - 1)
      } else {
        setSlideDirection('backward')
        setPhase('questions')
        setCurrentSlide(TOTAL_SLIDES - 1)
        setAnimKey(k => k + 1)
      }
    }

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.questionContainer}>
            <div className={styles.questionNav}>
              <button onClick={handlePart2Back} className={styles.backBtn}>&larr; Back</button>
              <span className={styles.questionCount}>{currentStep} of {totalSteps}</span>
            </div>
            <div className={styles.questionWrap}>

              {/* Q10 — open text */}
              {part2Step === 0 && (
                <div className={styles.questionBlock}>
                  <p className={styles.slideTheme}>One more thing</p>
                  <p className={styles.questionLabel}>What is one thing currently weighing on your mind the most?</p>
                  <textarea
                    className={styles.part2Textarea}
                    placeholder="Type anything — there's no wrong answer."
                    value={shepherdFocus}
                    onChange={e => setShepherdFocus(e.target.value)}
                    rows={4}
                  />
                  <button
                    onClick={() => setPart2Step(1)}
                    className={styles.startBtn}
                    style={{ marginTop: 16 }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Q11 — interrupt pattern */}
              {part2Step === 1 && (
                <div className={styles.questionBlock}>
                  <p className={styles.slideTheme}>Your Shepherd</p>
                  <p className={styles.questionLabel}>If I see you falling into a 'Bad Pattern,' should I:</p>
                  <div className={styles.optionsList}>
                    {[
                      { id: 'a', text: "Flag it immediately" },
                      { id: 'b', text: "Weekly Check-in" },
                      { id: 'c', text: "Suggest a quiet Next Step" },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setShepherdInterrupt(opt.id)}
                        className={`${styles.optionPill} ${shepherdInterrupt === opt.id ? styles.optionPillSelected : ''}`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPart2Step(2)}
                    disabled={!shepherdInterrupt}
                    className={styles.startBtn}
                    style={{ marginTop: 16 }}
                  >
                    Next →
                  </button>
                </div>
              )}

              {/* Q12 — celebration style */}
              {part2Step === 2 && (
                <div className={styles.questionBlock}>
                  <p className={styles.slideTheme}>Your Shepherd</p>
                  <p className={styles.questionLabel}>When we succeed, how should we celebrate?</p>
                  <div className={styles.optionsList}>
                    {[
                      { id: 'a', text: "Progress is the reward" },
                      { id: 'b', text: "Win notification + streak" },
                      { id: 'c', text: "Visual chart of progress" },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setShepherdCelebrate(opt.id)}
                        className={`${styles.optionPill} ${shepherdCelebrate === opt.id ? styles.optionPillSelected : ''}`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePart2Submit}
                    disabled={!shepherdCelebrate}
                    className={styles.startBtn}
                    style={{ marginTop: 16 }}
                  >
                    Done →
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Analyzing ─────────────────────────────────────────────────────────────
  if (phase === 'analyzing') {
    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.analyzeScreen}>
            <p className={styles.analyzeText}>
              Analyzing your style
              <span className={styles.analyzeDots}>
                <span /><span /><span />
              </span>
            </p>
          </div>
        </div>
      </>
    )
  }

  // ── Reveal ────────────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    const primaryLabel = personaBlend[0]
    const secondaryLabel = personaBlend[1] || null
    const primaryDef = Object.values(PERSONA_DEFS).find(d => d.label === primaryLabel)

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.revealContainer}>
            <div className={styles.revealCard}>
              <p className={styles.revealLabel}>Your coaching style</p>
              <h1 className={styles.revealPersona}>{primaryLabel}</h1>
              <p className={styles.revealDesc}>{primaryDef?.desc}</p>
              {secondaryLabel && (
                <p className={styles.revealSecondary}>
                  with <strong>{secondaryLabel}</strong> energy
                </p>
              )}
            </div>

            <div className={styles.voicePrefBlock}>
              <p className={styles.voicePrefLabel}>Voice preference</p>
              <div className={styles.mhGrid}>
                {[
                  { id: 'warm_gentle',     emoji: '🌊', label: 'Warm & Gentle',      desc: 'Supportive, encouraging, patient' },
                  { id: 'warm_direct',     emoji: '🎯', label: 'Warm & Direct',       desc: 'Caring but no-nonsense, clear action steps' },
                  { id: 'bold_direct',     emoji: '⚡', label: 'Bold & Direct',       desc: 'High energy, blunt, gets you moving' },
                  { id: 'calm_analytical', emoji: '🧠', label: 'Calm & Analytical',   desc: 'Logical, structured, systems-focused' },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setPersonaVoice(opt.id)}
                    className={`${styles.mhCard} ${personaVoice === opt.id ? styles.mhCardSelected : ''}`}
                  >
                    <div className={styles.mhCardEmoji}>{opt.emoji}</div>
                    <div className={styles.mhCardLabel}>{opt.label}</div>
                    <div className={styles.mhCardDesc}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleConfirm} className={styles.startBtn}>
              Let's go →
            </button>
          </div>
        </div>
      </>
    )
  }

  // ── Building ──────────────────────────────────────────────────────────────
  if (phase === 'building') {
    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={`${styles.page} ${buildFadeOut ? styles.buildFadeOut : ''}`}>
          <div className={styles.buildingContainer}>
            <div className={styles.buildingMark}>
              <CinisMark size={56} />
            </div>
            <div className={styles.buildingSteps}>
              {BUILDING_STEPS.map((step, i) => (
                <p
                  key={i}
                  className={`${styles.buildingStep} ${i <= buildStep ? styles.buildingStepVisible : ''} ${i === buildStep ? styles.buildingStepActive : ''}`}
                >
                  {i < buildStep && <span className={styles.buildingCheck}>&check;</span>}
                  {step}
                </p>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Saving ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>Getting Started — Cinis</title></Head>
      <div className={styles.page}>
        <div className={styles.savingContainer}>
          <div className={styles.savingLogo}>
            <span className="brand">Cinis</span>
          </div>
          <p className={styles.savingText}>Setting up your space...</p>
        </div>
      </div>
    </>
  )
}
