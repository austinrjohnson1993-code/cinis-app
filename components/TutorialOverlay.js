import { useState } from 'react'
import styles from '../styles/Tutorial.module.css'
import CinisMark from '../lib/CinisMark'

const STEPS = [
  {
    title: 'Welcome to Cinis.',
    body: 'Your AI coach is ready. Here\u2019s a quick look at how things work \u2014 it\u2019ll take 30 seconds.',
    icon: null, // will show CinisMark
  },
  {
    title: 'Tasks',
    body: 'Add what you need to do. Cinis will help you prioritize, break things down, and keep you moving.',
    icon: '\u2705',
  },
  {
    title: 'Check-in',
    body: 'Your coach checks in throughout the day \u2014 morning, midday, evening. Just respond naturally. It learns how you work.',
    icon: '\uD83D\uDCAC',
  },
  {
    title: 'Voice Capture',
    body: 'Tap the mic button anytime to capture a thought, task, or note. No typing needed \u2014 just speak.',
    icon: '\uD83C\uDF99\uFE0F',
  },
  {
    title: 'Focus Sessions',
    body: 'When it\u2019s time to lock in, start a focus session. Cinis tracks your time and keeps distractions out.',
    icon: '\uD83C\uDFAF',
  },
  {
    title: 'Everything Else',
    body: 'Calendar, habits, finance, nutrition, progress \u2014 it\u2019s all here. Explore when you\u2019re ready. Nothing gets lost.',
    icon: '\uD83D\uDCCB',
  },
]

export default function TutorialOverlay({ userName, onComplete }) {
  const [step, setStep] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const handleNext = () => {
    if (isLast) {
      setFadeOut(true)
      setTimeout(() => onComplete(), 400)
    } else {
      setStep(s => s + 1)
    }
  }

  const handleSkip = () => {
    setFadeOut(true)
    setTimeout(() => onComplete(), 400)
  }

  return (
    <div className={`${styles.overlay} ${fadeOut ? styles.overlayFadeOut : ''}`}>
      <div className={styles.card} key={step}>
        {isFirst ? (
          <div className={styles.markWrap}>
            <CinisMark size={48} />
          </div>
        ) : (
          <div className={styles.stepIcon}>{current.icon}</div>
        )}

        <h2 className={styles.title}>
          {isFirst && userName ? `Welcome to Cinis, ${userName}.` : current.title}
        </h2>
        <p className={styles.body}>{current.body}</p>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
          ))}
        </div>

        <div className={styles.actions}>
          {!isFirst && (
            <button onClick={() => setStep(s => s - 1)} className={styles.backBtn}>
              &larr; Back
            </button>
          )}
          <button onClick={handleNext} className={styles.nextBtn}>
            {isLast ? 'Let\u2019s go' : 'Next'}
          </button>
        </div>

        {!isLast && (
          <button onClick={handleSkip} className={styles.skipBtn}>
            Skip tour
          </button>
        )}
      </div>
    </div>
  )
}
