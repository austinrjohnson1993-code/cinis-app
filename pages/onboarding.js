import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'
import Head from 'next/head'
import styles from '../styles/Onboarding.module.css'

const CinisMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <polygon points="32,2 56,15 56,43 32,56 8,43 8,15" fill="none" stroke="#FF6644" strokeWidth="1.1" opacity="0.45"/>
    <polygon points="32,4 54,16 54,42 32,54 10,42 10,16" fill="#FF6644"/>
    <polygon points="32,7 51,18 51,40 32,52 13,40 13,18" fill="#120704"/>
    <polygon points="32,14 46,22 46,40 32,48 18,40 18,22" fill="#5A1005"/>
    <polygon points="32,20 42,26 42,40 32,45 22,40 22,26" fill="#A82010"/>
    <polygon points="32,26 38,29 38,40 32,43 26,40 26,29" fill="#E8321A"/>
    <polygon points="32,29 45,40 40,43 32,47 24,43 19,40" fill="#FF6644" opacity="0.92"/>
    <polygon points="32,33 41,40 38,42 32,45 26,42 23,40" fill="#FFD0C0" opacity="0.76"/>
    <polygon points="32,36 37,40 36,41 32,43 28,41 27,40" fill="#FFF0EB" opacity="0.60"/>
  </svg>
)

// ── Questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  // Q0: Avoidance behavior → biggest challenge proxy
  {
    text: "When there's a task you've been putting off, what usually happens?",
    options: [
      { id: 'a', text: "I keep pushing it to tomorrow until the deadline forces me" },
      { id: 'b', text: "I start it but run out of steam halfway" },
      { id: 'c', text: "I overthink it until it feels impossible to begin" },
      { id: 'd', text: "I stay busy doing everything else instead" },
    ]
  },
  // Q1: Boundary/priority style
  {
    text: "A friend asks for a last-minute favor on a day you planned to work. You:",
    options: [
      { id: 'a', text: "Cancel your plans — people come first" },
      { id: 'b', text: "Try to fit both and end up stressed" },
      { id: 'c', text: "Say no but feel guilty about it all day" },
      { id: 'd', text: "Negotiate something that works for both" },
    ]
  },
  // Q2: Energy patterns (replaces weak notification Q)
  {
    text: "When do you do your best work?",
    options: [
      { id: 'a', text: "Morning — I'm sharpest before noon" },
      { id: 'b', text: "Afternoon — I hit my stride after lunch" },
      { id: 'c', text: "Evening or night — I come alive late" },
      { id: 'd', text: "It varies — no consistent pattern" },
    ]
  },
  // Q3: Productive day feeling → motivation
  {
    text: "What does a productive day feel like for you?",
    options: [
      { id: 'a', text: "I completed everything on my list" },
      { id: 'b', text: "I made real progress on the one thing that mattered most" },
      { id: 'c', text: "I stayed focused without feeling overwhelmed" },
      { id: 'd', text: "I kept my promises to others and to myself" },
    ]
  },
  // Q4: Communication style (direct question, replaces indirect "feedback reaction")
  {
    text: "How direct do you want your coach to be?",
    options: [
      { id: 'a', text: "Completely blunt — just tell me the truth" },
      { id: 'b', text: "Direct but kind — clear, no sugarcoating, no harshness" },
      { id: 'c', text: "Gentle — frame things softly" },
      { id: 'd', text: "Careful — I'm sensitive to harsh words" },
    ]
  },
  // Q5: Support preference
  {
    text: "Your ideal coach would:",
    options: [
      { id: 'a', text: "Push you hard and not accept excuses" },
      { id: 'b', text: "Help you think through problems yourself" },
      { id: 'c', text: "Celebrate every win and keep energy high" },
      { id: 'd', text: "Give you a clear logical plan and get out of the way" },
      { id: 'e', text: "Check in on how you're feeling before anything else" },
    ]
  },
  // Q6: Stress response (direct options: shut down / push through / distract / talk)
  {
    text: "When you're stressed or overwhelmed, you tend to:",
    options: [
      { id: 'a', text: "Shut down — go quiet, freeze, do nothing" },
      { id: 'b', text: "Push through — stress actually makes me go harder" },
      { id: 'c', text: "Seek distraction — phone, TV, anything else" },
      { id: 'd', text: "Talk it out — venting or processing helps me reset" },
    ]
  },
  // Q7: Start your day
  {
    text: "How do you prefer to start your day?",
    options: [
      { id: 'a', text: "With a clear prioritized list, ready to go" },
      { id: 'b', text: "With a quick check-in on how I'm feeling" },
      { id: 'c', text: "By jumping into the most urgent thing" },
      { id: 'd', text: "Slowly — I need time to ease in" },
    ]
  },
  // Q8: Task pushback reason → challenge type
  {
    text: "When a task keeps getting pushed back, it's usually because:",
    options: [
      { id: 'a', text: "I don't know where to start" },
      { id: 'b', text: "Other things always feel more urgent" },
      { id: 'c', text: "I'm not sure it actually matters" },
      { id: 'd', text: "It feels too big to tackle in one go" },
    ]
  },
  // Q9: Accountability / motivation style
  {
    text: "How do you respond to accountability?",
    options: [
      { id: 'a', text: "I need someone checking in or I'll drift" },
      { id: 'b', text: "I work better when I set my own deadlines" },
      { id: 'c', text: "Public commitment helps me follow through" },
      { id: 'd', text: "I do best when I understand the why behind the goal" },
    ]
  },
  // Q10: Life area focus (replaces weak phone notifications Q)
  {
    text: "Which area of your life do you most want Cinis focused on?",
    options: [
      { id: 'a', text: "Work and career" },
      { id: 'b', text: "Health and fitness" },
      { id: 'c', text: "Relationships" },
      { id: 'd', text: "Money and finances" },
      { id: 'e', text: "All of it — everything needs attention" },
    ]
  },
  // Q11: Completing avoided task
  {
    text: "When you finally finish something you've been putting off, you feel:",
    options: [
      { id: 'a', text: "Relieved more than proud" },
      { id: 'b', text: "Genuinely proud — wins matter to me" },
      { id: 'c', text: "Ready to immediately move to the next thing" },
      { id: 'd', text: "Like I should have done it sooner" },
    ]
  },
  // Q12: Work style (new)
  {
    text: "How do you work best through your task list?",
    options: [
      { id: 'a', text: "Deep focus — one thing at a time, no interruptions" },
      { id: 'b', text: "Task switching — I like bouncing between things" },
      { id: 'c', text: "Mixed — deep focus for big work, flexible for the rest" },
      { id: 'd', text: "I don't really have a system yet" },
    ]
  },
  // Q13: One thing you want most (new)
  {
    text: "What's the one thing you most want Cinis to help you with?",
    options: [
      { id: 'a', text: "Actually doing the tasks I keep avoiding" },
      { id: 'b', text: "Building habits that actually stick" },
      { id: 'c', text: "Staying on top of money and bills" },
      { id: 'd', text: "Managing stress and overwhelm" },
      { id: 'e', text: "Staying focused and getting things done" },
    ]
  },
]

// ── Persona scoring ───────────────────────────────────────────────────────────

const SCORING = [
  // Q0: avoidance behavior
  { a: { drill_sergeant: 2 }, b: { coach: 2 }, c: { thinking_partner: 2 }, d: { strategist: 2 } },
  // Q1: boundary/priority
  { a: { drill_sergeant: 1 }, b: { hype_person: 1 }, c: { thinking_partner: 2 }, d: { strategist: 2 } },
  // Q2: energy patterns (light weights — structural data)
  { a: { strategist: 1, drill_sergeant: 1 }, b: { coach: 1 }, c: { hype_person: 1 }, d: { thinking_partner: 1 } },
  // Q3: productive day
  { a: { drill_sergeant: 1, strategist: 1 }, b: { strategist: 2 }, c: { thinking_partner: 2 }, d: { coach: 2 } },
  // Q4: communication style
  { a: { drill_sergeant: 3 }, b: { coach: 2, strategist: 1 }, c: { empath: 2, coach: 1 }, d: { empath: 3 } },
  // Q5: ideal coach
  { a: { drill_sergeant: 3 }, b: { thinking_partner: 3 }, c: { hype_person: 3 }, d: { strategist: 3 }, e: { empath: 3 } },
  // Q6: stress response
  { a: { empath: 3, thinking_partner: 2 }, b: { drill_sergeant: 3 }, c: { coach: 2, hype_person: 1 }, d: { coach: 3 } },
  // Q7: start your day
  { a: { strategist: 2, drill_sergeant: 1 }, b: { thinking_partner: 2 }, c: { drill_sergeant: 2 }, d: { coach: 1 } },
  // Q8: task pushback reason
  { a: { thinking_partner: 2 }, b: { strategist: 2 }, c: { thinking_partner: 1, coach: 1 }, d: { coach: 2 } },
  // Q9: accountability
  { a: { drill_sergeant: 2, hype_person: 1 }, b: { strategist: 2 }, c: { hype_person: 2 }, d: { thinking_partner: 2 } },
  // Q10: life area focus (light weights — structural data)
  { a: { strategist: 1 }, b: { coach: 1 }, c: { empath: 1 }, d: { strategist: 1 }, e: { coach: 1 } },
  // Q11: completing avoided task
  { a: { thinking_partner: 1 }, b: { hype_person: 3 }, c: { strategist: 2 }, d: { drill_sergeant: 1 } },
  // Q12: work style
  { a: { strategist: 2, thinking_partner: 1 }, b: { hype_person: 2 }, c: { coach: 2 }, d: { coach: 1, thinking_partner: 1 } },
  // Q13: one thing (light weights — structural data)
  { a: { drill_sergeant: 2, coach: 1 }, b: { coach: 2 }, c: { strategist: 2 }, d: { empath: 2 }, e: { strategist: 1, drill_sergeant: 1 } },
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

// ── Answer → structured data maps ─────────────────────────────────────────────

const ANSWER_MAPS = {
  avoidance: { a: 'delays until deadline forces action', b: 'starts but loses momentum', c: 'overthinks until paralyzed', d: 'avoids by staying busy with other tasks' },
  energy:    { a: 'morning', b: 'afternoon', c: 'evening/night', d: 'varies' },
  commStyle: { a: 'blunt', b: 'direct and kind', c: 'gentle/softened', d: 'careful/sensitive' },
  stress:    { a: 'shuts down', b: 'pushes through', c: 'seeks distraction', d: 'talks it out' },
  motivation:{ a: 'external check-ins', b: 'self-set deadlines', c: 'public commitment', d: 'understanding the why' },
  lifeArea:  { a: 'work and career', b: 'health and fitness', c: 'relationships', d: 'finances', e: 'everything' },
  workStyle: { a: 'deep focus', b: 'task switching', c: 'mixed', d: 'no system yet' },
  oneThing:  { a: 'doing tasks I keep avoiding', b: 'building habits that stick', c: 'managing money and bills', d: 'managing stress and overwhelm', e: 'staying focused and getting things done' },
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

const RANK_ITEMS_DEFAULT = ['Deep focus work', 'Quick wins', 'External commitments', 'Self-care / personal tasks']

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [phase, setPhase] = useState('context') // context | intro-tutorial | intro | questions | rankq | analyzing | reveal | saving
  const [mentalHealthContext, setMentalHealthContext] = useState(null)
  const [introTutorialStep, setIntroTutorialStep] = useState(0)
  const [name, setName] = useState('')
  const [checkinTimes, setCheckinTimes] = useState(['morning', 'evening'])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState(Array(QUESTIONS.length).fill(null))
  const [animKey, setAnimKey] = useState(0)
  const [personaBlend, setPersonaBlend] = useState([]) // stored as keys: ['drill_sergeant', 'coach']
  const [personaVoice, setPersonaVoice] = useState('warm_gentle')
  const [rankItems, setRankItems] = useState([...RANK_ITEMS_DEFAULT])
  const [rankDragIdx, setRankDragIdx] = useState(null)

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

  const handleAnswer = (optionId) => {
    const newAnswers = answers.map((a, i) => i === currentQ ? optionId : a)
    setAnswers(newAnswers)

    if (currentQ < QUESTIONS.length - 1) {
      setAnimKey(k => k + 1)
      setCurrentQ(q => q + 1)
    } else {
      setPhase('rankq')
    }
  }

  const handleBack = () => {
    if (currentQ > 0) {
      setAnimKey(k => k + 1)
      setCurrentQ(q => q - 1)
    } else {
      setPhase('intro')
    }
  }

  const handleRankSubmit = () => {
    // Store persona keys (not labels) so persona.js can look them up correctly
    const keys = computePersonas(answers)
    setPersonaBlend(keys.length ? keys : ['coach'])
    setPhase('analyzing')
    setTimeout(() => setPhase('reveal'), 1500)
  }

  const handleConfirm = async () => {
    if (!personaVoice) return
    setPhase('saving')

    // Extract structured answers from key questions
    const aiContextParts = []
    if (answers[6]) aiContextParts.push(`Stress response: ${ANSWER_MAPS.stress[answers[6]]}`)
    if (answers[12]) aiContextParts.push(`Work style: ${ANSWER_MAPS.workStyle[answers[12]]}`)

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
      // Structured answers saved to profile columns
      main_struggle: ANSWER_MAPS.avoidance[answers[0]] || null,
      work_schedule: ANSWER_MAPS.energy[answers[2]] || null,
      communication_style: ANSWER_MAPS.commStyle[answers[4]] || null,
      accountability_style: ANSWER_MAPS.motivation[answers[9]] || null,
      current_priorities: ANSWER_MAPS.lifeArea[answers[10]] || null,
      biggest_friction: ANSWER_MAPS.oneThing[answers[13]] || null,
      ai_context: aiContextParts.length ? aiContextParts.join('. ') : null,
    }
    if (mentalHealthContext) upsertData.mental_health_context = mentalHealthContext

    try {
      await supabase.from('profiles').upsert({ ...upsertData, ranked_priorities: rankItems })
    } catch {
      await supabase.from('profiles').upsert(upsertData)
    }

    try {
      await fetch('/api/generate-baseline-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
    } catch (e) {
      console.error('[onboarding] baseline profile generation failed:', e)
    }

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
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 600, letterSpacing: '0.16em', color: '#F0EAD6' }}>Cinis</span>
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
              <button onClick={() => setPhase('intro-tutorial')} className={styles.startBtn} style={{ marginTop: '28px' }}>
                Continue →
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Intro Tutorial ─────────────────────────────────────────────────────────
  if (phase === 'intro-tutorial') {
    const tutorialScreens = [
      {
        title: 'Welcome to Cinis',
        body: 'Before we build your coaching profile, we need to understand how you work. This takes about 5 minutes.',
        cta: 'Continue',
      },
      {
        title: 'Your Answers Shape Everything',
        body: "Your responses shape everything — your coach's voice, your check-in style, and how Cinis shows up for you. Be thoughtful, be honest.",
        cta: 'Got it',
      },
      {
        title: 'No Right Answers',
        body: "There are no right answers here. The more specific and honest you are, the better your coach gets. Ready?",
        cta: "Let's go",
      },
    ]
    const screen = tutorialScreens[introTutorialStep]
    const isLast = introTutorialStep === tutorialScreens.length - 1

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.introContainer}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
              <CinisMark size={48} />
            </div>
            <h1 className={styles.introTitle}>{screen.title}</h1>
            <p className={styles.introSub} style={{ fontSize: '16px', lineHeight: '1.6', maxWidth: '500px' }}>{screen.body}</p>
            <button
              onClick={() => {
                if (isLast) setPhase('intro')
                else setIntroTutorialStep(introTutorialStep + 1)
              }}
              className={styles.startBtn}
            >
              {screen.cta} →
            </button>
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
              <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 600, letterSpacing: '0.16em', color: '#F0EAD6' }}>Cinis</span>
            </div>
            <h1 className={styles.introTitle}>Let's set you up.</h1>
            <p className={styles.introSub}>14 quick questions. No wrong answers. Takes about 3 minutes.</p>

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

  // ── Questions ─────────────────────────────────────────────────────────────
  if (phase === 'questions') {
    const q = QUESTIONS[currentQ]
    const progress = ((currentQ + 1) / (QUESTIONS.length + 1)) * 100

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          <div className={styles.questionContainer}>
            <div className={styles.questionNav}>
              <span className={styles.questionCount}>{currentQ + 1} of {QUESTIONS.length + 1}</span>
            </div>

            <div key={animKey} className={styles.questionWrap}>
              <h2 className={styles.questionText}>{q.text}</h2>
              <div className={styles.optionsGrid}>
                {q.options.map(opt => {
                  const selected = answers[currentQ] === opt.id
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(opt.id)}
                      className={`${styles.optionCard} ${selected ? styles.optionCardSelected : ''}`}
                    >
                      <span className={`${styles.optionLetter} ${selected ? styles.optionLetterSelected : ''}`}>{opt.id.toUpperCase()}</span>
                      <span className={styles.optionText}>{opt.text}</span>
                    </button>
                  )
                })}
              </div>
              <button onClick={handleBack} className={styles.backBtn} style={{ marginTop: '20px' }}>← Back</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Rank question ─────────────────────────────────────────────────────────
  if (phase === 'rankq') {
    const progress = (QUESTIONS.length / (QUESTIONS.length + 1)) * 100
    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <div className={styles.questionContainer}>
            <div className={styles.questionNav}>
              <span className={styles.questionCount}>{QUESTIONS.length + 1} of {QUESTIONS.length + 1}</span>
            </div>
            <div className={styles.questionWrap}>
              <h2 className={styles.questionText}>Drag to rank what matters most to you.</h2>
              <p className={styles.rankSubtext}>Top = highest priority. This helps Cinis sort your tasks.</p>
              <div className={styles.rankList}>
                {rankItems.map((item, i) => (
                  <div
                    key={item}
                    draggable
                    onDragStart={() => setRankDragIdx(i)}
                    onDragOver={e => { e.preventDefault() }}
                    onDrop={() => {
                      if (rankDragIdx === null || rankDragIdx === i) return
                      const next = [...rankItems]
                      const [moved] = next.splice(rankDragIdx, 1)
                      next.splice(i, 0, moved)
                      setRankItems(next)
                      setRankDragIdx(null)
                    }}
                    className={styles.rankItem}
                  >
                    <span className={styles.rankPosition}>{i + 1}</span>
                    <span className={styles.rankItemText}>{item}</span>
                    <span className={styles.rankHandle}>⠿</span>
                  </div>
                ))}
              </div>
              <button onClick={handleRankSubmit} className={styles.startBtn} style={{ marginTop: '28px' }}>
                Done →
              </button>
              <button onClick={() => { setPhase('questions'); setCurrentQ(QUESTIONS.length - 1); setAnimKey(k => k + 1) }} className={styles.backBtn} style={{ marginTop: '16px' }}>← Back</button>
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
    const primaryKey = personaBlend[0]
    const secondaryKey = personaBlend[1] || null
    const primaryDef = PERSONA_DEFS[primaryKey] || PERSONA_DEFS['coach']
    const secondaryDef = secondaryKey ? PERSONA_DEFS[secondaryKey] : null

    return (
      <>
        <Head><title>Getting Started — Cinis</title></Head>
        <div className={styles.page}>
          <div className={styles.revealContainer}>
            <div className={styles.revealCard}>
              <p className={styles.revealLabel}>Your coaching style</p>
              <h1 className={styles.revealPersona}>{primaryDef.label}</h1>
              <p className={styles.revealDesc}>{primaryDef.desc}</p>
              {secondaryDef && (
                <p className={styles.revealSecondary}>
                  with <strong>{secondaryDef.label}</strong> energy
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
              Meet your coach →
            </button>
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
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 600, letterSpacing: '0.16em', color: '#F0EAD6' }}>Cinis</span>
          </div>
          <p className={styles.savingText}>Setting up your space...</p>
        </div>
      </div>
    </>
  )
}
