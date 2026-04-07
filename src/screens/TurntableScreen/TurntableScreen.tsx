import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVinylStore } from '../../store/useVinylStore'
import styles from './TurntableScreen.module.css'

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// Needle angle: 30° at start → 5° near center, mapped from progress 0→1
function needleAngle(progress: number): number {
  return 30 - progress * 25
}

export function TurntableScreen() {
  const navigate = useNavigate()
  const {
    selectedAlbum,
    resolvedSides,
    playerState,
    currentSide,
    positionMs,
    durationMs,
    triggerFlip,
    stopPlayback,
  } = useVinylStore()

  useEffect(() => {
    if (!selectedAlbum) navigate('/shelf')
  }, [selectedAlbum, navigate])

  // Auto-navigate to flip overlay
  useEffect(() => {
    if (playerState === 'flipping') {
      navigate('/flip')
    }
  }, [playerState, navigate])

  if (!selectedAlbum) return null

  const sideDuration =
    currentSide === 'A'
      ? resolvedSides?.flipAtMs ?? durationMs
      : durationMs

  const progress = sideDuration > 0 ? Math.min(positionMs / sideDuration, 1) : 0
  const angle = needleAngle(progress)
  const isPlaying = playerState === 'playing-a' || playerState === 'playing-b'

  const coverUrl = selectedAlbum.images[0]?.url

  return (
    <div className={styles.screen}>
      <div className={styles.turntable}>
        <div className={`${styles.disc} ${isPlaying ? '' : styles.paused}`}>
          <div className={styles.label}>
            {coverUrl ? (
              <img className={styles.labelImage} src={coverUrl} alt="" />
            ) : (
              <div className={styles.labelPlaceholder} />
            )}
          </div>
          <div className={styles.spindle} />
        </div>

        {/* Tonearm rotates based on progress */}
        <div
          className={styles.tonearmWrap}
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className={styles.tonearm} />
          <div className={styles.needle} />
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.sideIndicator}>
          {playerState === 'dropping-needle' ? 'Bajando aguja...' : `Cara ${currentSide}`}
        </div>
        <div className={styles.albumName}>{selectedAlbum.name}</div>
        <div className={styles.position}>
          {formatTime(positionMs)} / {formatTime(sideDuration)}
        </div>
      </div>

      <div className={styles.controls}>
        <button
          className={styles.controlBtn}
          onClick={() => triggerFlip()}
          disabled={playerState !== 'playing-a'}
        >
          Girar disco
        </button>
        <button
          className={styles.controlBtn}
          onClick={async () => {
            await stopPlayback()
            navigate('/shelf')
          }}
          disabled={playerState === 'lifting-needle'}
        >
          Guardar disco
        </button>
      </div>
    </div>
  )
}
