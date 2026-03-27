import { useEffect, useState } from 'react'
import styles from '../styles/Dashboard.module.css'

export default function VoiceFAB({ state = 'idle', onClick, hide = false }) {
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition))
  }, [])

  if (!supported || hide) return null

  return (
    <button
      className={`${styles.voiceFab} ${state === 'recording' ? styles.voiceFabRecording : ''} ${state === 'processing' ? styles.voiceFabProcessing : ''}`}
      onClick={onClick}
      disabled={state === 'processing'}
      aria-label={
        state === 'idle' ? 'Voice input' :
        state === 'recording' ? 'Stop recording' :
        'Processing'
      }
    >
      {state === 'recording' ? (
        <div className={styles.voiceWaveBars}>
          <span className={styles.voiceWaveBar} />
          <span className={styles.voiceWaveBar} />
          <span className={styles.voiceWaveBar} />
        </div>
      ) : state === 'processing' ? (
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
  )
}
