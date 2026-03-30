import React, { useState, useEffect } from 'react'
import styles from '../../styles/TabGuide.module.css'
import { localDateStr } from './shared'

/* ── Spark SVG ────────────────────────────────────────────────────────────── */
const SparkSvg = ({ color = '#FF6644', size = 9 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M8 0l2 5h5l-4 3 2 5-5-3-5 3 2-5L1 5h5z" />
  </svg>
)

/* ── Situation color map ──────────────────────────────────────────────────── */
const SIT_COLORS = {
  stuck: '#FF6644', overwhelmed: '#3B8BD4', momentum: '#FFB800',
  win: '#4CAF50', focus: '#3B8BD4', crash: 'rgba(240,234,214,0.5)',
}

/* ── Situations data ──────────────────────────────────────────────────────── */
const SITUATIONS = {
  stuck: {
    emoji: '\uD83E\uDDF1', title: 'Stuck', sub: "Task won't move. Brain won't engage.",
    gridTitle: "I can't get started",
    playName: 'Shrink the first step',
    playBody: "The task feels too big or unclear. Your brain resists ambiguity. Make it stupidly small — so small it feels insulting. That's the entry point.",
    steps: [
      'Pick the stuck task. Rewrite it as a 5-minute version. "Write report" → "Open doc and type one sentence."',
      'Open a Focus session for exactly 5 minutes. Nothing longer. The constraint is the point.',
      "When the timer ends, stop. If you want to keep going, start a new session. If not, you still moved.",
    ],
    whyItWorks: "ADHD brains struggle with task initiation, not task execution. Shrinking the task bypasses the prefrontal gatekeeping that says 'this is too much.' Once you're in motion, momentum takes over.",
    ctaLabel: 'Open Tasks',
    ctaTab: 'tasks',
  },
  overwhelmed: {
    emoji: '\uD83C\uDF0A', title: 'Overwhelmed', sub: 'Too much, nowhere obvious to start.',
    gridTitle: "I'm overwhelmed",
    playName: 'The one-thing triage',
    playBody: "You have too many things competing for attention. You need to see them all in one place, then ruthlessly cut to three.",
    steps: [
      "Go to your task list. Star exactly 3 tasks — the ones that would make today feel like a win if nothing else happened.",
      "Everything else gets pushed to tomorrow or archived. Don't negotiate. Three is the number.",
      "Start with whichever starred task has the lowest friction. Easy wins build capacity for hard ones.",
    ],
    whyItWorks: "Overwhelm is a working memory problem. You can't hold 15 priorities simultaneously. By externalizing to a list and constraining to 3, you free up cognitive bandwidth for actual execution.",
    ctaLabel: 'Open Tasks',
    ctaTab: 'tasks',
  },
  momentum: {
    emoji: '\uD83D\uDCC9', title: 'Losing momentum', sub: 'Streak slipping. Energy dropping.',
    gridTitle: "I'm losing momentum",
    playName: 'Protect the streak',
    playBody: "You don't need a great day. You need a non-zero day. One task, one check-in, one entry. That preserves the streak and keeps the habit alive.",
    steps: [
      "Find your smallest, easiest task. Something you could do in under 2 minutes.",
      "Complete it. Mark it done. Feel that micro-hit of accomplishment.",
      "If you have energy for more, do one more. If not, you're done. The streak lives.",
    ],
    whyItWorks: "Momentum isn't about intensity — it's about consistency. Missing one day makes missing two days 3x more likely. A minimum viable day keeps the chain unbroken.",
    ctaLabel: 'Open Habits',
    ctaTab: 'habits',
  },
  win: {
    emoji: '\u26A1', title: 'Need a quick win', sub: 'Low energy. Need to feel progress.',
    gridTitle: 'I need a quick win',
    playName: '2-minute sweep',
    playBody: "Scan your list for anything completable in under 2 minutes. Knock out 3–5 of those in rapid succession. Speed creates energy.",
    steps: [
      "Open your task list. Sort mentally by effort — find the sub-2-minute items.",
      "Set a timer for 10 minutes. Blitz through as many tiny tasks as you can.",
      "Each completion is real XP and real progress. Let the dopamine stack.",
    ],
    whyItWorks: "Quick wins activate the reward circuit. Each completion releases a small dopamine hit, which lowers the activation energy for the next task. It's a flywheel.",
    ctaLabel: 'Show quick tasks',
    ctaTab: 'tasks',
    rememberCard: false,
  },
  focus: {
    emoji: '\uD83C\uDFAF', title: "Can't focus", sub: "Distracted, scattered, can't lock in.",
    gridTitle: "I can't focus",
    playName: 'Body double + timer',
    playBody: "External structure compensates for internal dysregulation. A timer creates urgency. A body double creates accountability. Together, they're a focus scaffold.",
    steps: [
      "Open Focus and set a 25-minute session. Choose your target task.",
      "If available, partner up with a body double. Silent co-working is enough.",
      "During the session: one tab, one task, one timer. Nothing else exists for 25 minutes.",
    ],
    whyItWorks: "ADHD focus problems aren't about willpower. They're about insufficient external structure. Timers add time pressure (urgency), body doubles add social accountability. Both bypass the need for internal motivation.",
    ctaLabel: 'Open Focus',
    ctaTab: 'focus',
    rememberCard: false,
  },
  crash: {
    emoji: '\uD83D\uDCA5', title: 'Crashed today', sub: 'Got nothing done. Need to reset.',
    gridTitle: 'I crashed today',
    playName: 'Soft reset',
    playBody: "Today didn't go as planned. That's data, not failure. Talk to your coach, process what happened, and set up tomorrow to be different.",
    steps: [
      "Take 3 deep breaths. Seriously. Physiological regulation comes before cognitive function.",
      "Open a check-in with your coach. Tell them what happened, how you feel, what got in the way.",
      "Let the coach help you set one intention for tomorrow. Just one. That's your reset.",
    ],
    whyItWorks: "After a crash, the biggest risk is shame spiral → avoidance → another crash. A soft reset breaks that cycle by normalizing the bad day and creating a forward-facing plan.",
    ctaLabel: 'Talk to my coach',
    ctaTab: 'checkin',
    rememberCard: true,
  },
}
const SIT_ORDER = ['stuck', 'overwhelmed', 'momentum', 'win', 'focus', 'crash']

/* ── Fallback For You cards ───────────────────────────────────────────────── */
const FALLBACK_FY = [
  { situationKey: 'stuck', title: "You're stalling on LLC", body: "Day 4. Try the shrink-it play — one step, 5 minutes.", cta_label: 'Help me start →', is_primary: true },
  { situationKey: 'overwhelmed', title: '6 tasks, no clear start', body: 'Classic freeze. The triage play cuts it to one thing.', cta_label: 'Run triage →', is_primary: false },
]

/* ── Component ────────────────────────────────────────────────────────────── */
export default function TabGuide({ user, profile, tasks = [], switchTab, loggedFetch }) {
  const [activeSit, setActiveSit] = useState(null)
  const [forYouCards, setForYouCards] = useState(FALLBACK_FY)

  // Load cached "For you" cards
  useEffect(() => {
    const todayKey = `cinis_foryou_${localDateStr(new Date())}`
    try {
      const cached = typeof localStorage !== 'undefined' && localStorage.getItem(todayKey)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) { setForYouCards(parsed); return }
      }
    } catch {}
    // Try API
    if (loggedFetch && user) {
      const overdue = tasks.filter(t => !t.archived && !t.completed && t.scheduled_for && new Date(t.scheduled_for) < new Date()).length
      const todayCount = tasks.filter(t => !t.archived && t.scheduled_for && t.scheduled_for.slice(0,10) === localDateStr(new Date())).length
      loggedFetch('/api/guide/for-you', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overdue_tasks: overdue, tasks_today: todayCount, streak: profile?.current_streak || 0 }),
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.cards?.length > 0) {
          setForYouCards(data.cards)
          try { localStorage.setItem(todayKey, JSON.stringify(data.cards)) } catch {}
        }
      }).catch(() => {})
    }
  }, [user])

  const openSituation = (key) => setActiveSit(key)
  const closeSituation = () => setActiveSit(null)

  const sit = activeSit ? SITUATIONS[activeSit] : null
  const sitColor = activeSit ? (SIT_COLORS[activeSit] || '#FF6644') : '#FF6644'

  return (
    <div className={styles.outer}>
      {/* Header */}
      <div className={styles.headerWrap}>
        <div className={styles.headerTitle}>Guide</div>
        <div className={styles.headerSub}>What do you need right now?</div>
      </div>

      <div className={styles.body}>
        {/* For You strip */}
        <div className={styles.fyLabelRow}>
          <SparkSvg />
          <span className={styles.fyLabelText}>Your coach recommends</span>
        </div>
        <div className={styles.fyScroll}>
          {forYouCards.map((card, i) => (
            <div
              key={i}
              className={card.is_primary !== false ? styles.fyCardPrimary : styles.fyCard}
              data-sit={card.situationKey}
              onClick={() => card.situationKey ? openSituation(card.situationKey) : null}
            >
              <div className={styles.fyEmoji}>{SITUATIONS[card.situationKey]?.emoji || '\uD83D\uDD25'}</div>
              <div className={styles.fyTitle}>{card.title}</div>
              <div className={styles.fyBody}>{card.body}</div>
              <button
                className={card.is_primary !== false ? styles.fyCtaPrimary : styles.fyCtaSecondary}
                onClick={(e) => { e.stopPropagation(); card.situationKey ? openSituation(card.situationKey) : null }}
              >
                {card.cta_label}
              </button>
            </div>
          ))}
        </div>

        {/* Situation grid */}
        <div className={styles.secLabel}>I NEED HELP WITH...</div>
        <div className={styles.sitGrid}>
          {SIT_ORDER.map(key => {
            const s = SITUATIONS[key]
            return (
              <div key={key} className={styles.sitCard} onClick={() => openSituation(key)}>
                <div className={styles.sitEmoji}>{s.emoji}</div>
                <div className={styles.sitTitle}>{s.gridTitle}</div>
                <div className={styles.sitSub}>{s.sub}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Situation detail sheet */}
      {sit && (
        <div className={styles.sheetOverlay} onClick={closeSituation}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />

            <div className={styles.sheetHeader}>
              <div className={styles.sheetEmoji}>{sit.emoji}</div>
              <div className={styles.sheetTitle}>{sit.title}</div>
              <div className={styles.sheetSub}>{sit.sub}</div>
              <button className={styles.sheetClose} onClick={closeSituation}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(240,234,214,0.22)" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Play card */}
            <div className={styles.playCard} style={{ borderLeftColor: sitColor }}>
              <div className={styles.playName} style={{ color: sitColor }}>{sit.playName}</div>
              <div className={styles.playBody}>{sit.playBody}</div>
            </div>

            {/* Steps */}
            <div className={styles.stepsLabel}>DO THIS NOW</div>
            <div className={styles.stepsStack}>
              {sit.steps.map((step, i) => (
                <div key={i} className={styles.stepRow}>
                  <div className={styles.stepNum} style={{ background: `${sitColor}1F`, color: sitColor }}>{i + 1}</div>
                  <div className={styles.stepText}>{step}</div>
                </div>
              ))}
            </div>

            {/* Why it works */}
            {sit.whyItWorks && (
              <div className={styles.whyCard}>
                <div className={styles.whyLabel}>WHY THIS WORKS</div>
                <div className={styles.whyText}>{sit.whyItWorks}</div>
              </div>
            )}

            {/* REMEMBER card (crash only) */}
            {sit.rememberCard && (
              <div className={styles.rememberCard}>
                <div className={styles.rememberLabel}>REMEMBER</div>
                <div className={styles.rememberText}>A crash day is data, not defeat. You didn't fail — you got signal about what doesn't work. That's progress.</div>
              </div>
            )}

            {/* CTA */}
            <button className={styles.sheetCta} style={{ background: sitColor }} onClick={() => { closeSituation(); switchTab?.(sit.ctaTab) }}>
              {sit.ctaLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
