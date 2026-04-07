import { useEffect, useRef, useState } from 'react'
import styles from './FlipModal.module.css'

const ANIM_DURATION = 3000
const HOLD_DURATION = 1500

interface Props {
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function FlipModal({ onConfirm, onCancel }: Props) {
  const [animDone, setAnimDone] = useState(false)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStart = useRef<number | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const t = setTimeout(() => setAnimDone(true), ANIM_DURATION)
    return () => clearTimeout(t)
  }, [])

  const startHold = () => {
    holdStart.current = Date.now()
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - (holdStart.current ?? Date.now())
      const p = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setProgress(p)
      if (p >= 100) {
        clearInterval(holdInterval.current!)
        onConfirm()
      }
    }, 50)
  }

  const cancelHold = () => {
    if (holdInterval.current) clearInterval(holdInterval.current)
    setProgress(0)
  }

  return (
    <div
      className={`${styles.backdrop} ${visible ? styles.visible : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className={styles.panel}>
        <div className={styles.disc} />

        <p className={styles.message}>Dale la vuelta al disco</p>
        <p className={styles.sub}>CARA B</p>

        <button
          className={styles.confirmBtn}
          disabled={!animDone}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          style={{ '--hold-progress': `${progress}%` } as React.CSSProperties}
        >
          {animDone ? 'Mantener para confirmar' : 'Girando...'}
        </button>
      </div>
    </div>
  )
}
