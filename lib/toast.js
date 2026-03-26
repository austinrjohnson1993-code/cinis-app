import { useState, useEffect, useRef } from 'react'
import styles from '../styles/Dashboard.module.css'

let toastQueue = []
let listeners = []

export function showToast(message, type = 'info') {
  const id = Date.now()
  toastQueue.push({ id, message, type })
  listeners.forEach(cb => cb([...toastQueue]))

  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id)
    listeners.forEach(cb => cb([...toastQueue]))
  }, 3000)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])
  const listenerRef = useRef(null)

  useEffect(() => {
    listenerRef.current = (newToasts) => setToasts(newToasts)
    listeners.push(listenerRef.current)

    return () => {
      listeners = listeners.filter(cb => cb !== listenerRef.current)
    }
  }, [])

  return (
    <>
      {toasts.map(toast => (
        <div key={toast.id} className={styles.toast}>
          {toast.message}
        </div>
      ))}
    </>
  )
}
