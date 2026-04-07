import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVinylStore } from '../../store/useVinylStore'
import styles from './FlipOverlay.module.css'

const ANIMATION_DURATION = 3000
const HOLD_DURATION = 1500

export function FlipOverlay() {
  const navigate = useNavigate()
  const { confirmFlip, playerState } = useVinylStore()
  const [animDone, setAnimDone] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdStart = useRef<number | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (playerState !== 'flipping') {
      navigate('/turntable')
    }
  }, [playerState, navigate])

  useEffect(() => {
    const timer = setTimeout(() => setAnimDone(true), ANIMATION_DURATION)
    return () => clearTimeout(timer)
  }, [])

  const startHold = () => {
    holdStart.current = Date.now()
    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - (holdStart.current ?? Date.now())
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100)
      setHoldProgress(progress)

      if (progress >= 100) {
        clearInterval(holdInterval.current!)
        handleConfirm()
      }
    }, 50)
  }

  const cancelHold = () => {
    if (holdInterval.current) clearInterval(holdInterval.current)
    setHoldProgress(0)
  }

  const handleConfirm = async () => {
    await confirmFlip()
    navigate('/turntable')
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.disc} />

      <p className={styles.message}>Dale la vuelta al disco</p>
      <p className={styles.sub}>Cara B</p>

      <button
        ref={btnRef}
        className={styles.confirmBtn}
        disabled={!animDone}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        style={{ '--hold-progress': `${holdProgress}%` } as React.CSSProperties}
      >
        {animDone ? 'Mantener para confirmar' : 'Girando...'}
      </button>
    </div>
  )
}
