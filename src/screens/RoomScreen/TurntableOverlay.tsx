import { useRef } from 'react'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyTrack } from '../../modules/spotify/types'
import styles from './TurntableOverlay.module.css'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function getCurrentTrackIndex(tracks: SpotifyTrack[], positionMs: number): number {
  let elapsed = 0
  for (let i = 0; i < tracks.length; i++) {
    elapsed += tracks[i].duration_ms
    if (positionMs < elapsed) return i
  }
  return tracks.length - 1
}

interface Props {
  onTriggerFlip: () => void
  onStop: () => void
}

export function TurntableOverlay({ onTriggerFlip, onStop }: Props) {
  const {
    selectedAlbum,
    resolvedSides,
    playerState,
    currentSide,
    positionMs,
    isPaused,
    togglePause,
  } = useVinylStore()

  const tracklistRef = useRef<HTMLDivElement>(null)

  const isPlaying  = (playerState === 'playing-a' || playerState === 'playing-b') && !isPaused
  const isActive   = playerState === 'playing-a' || playerState === 'playing-b' || isPaused
  const isIdle     = playerState === 'idle'

  const currentTracks = currentSide === 'A'
    ? resolvedSides?.sideA ?? []
    : resolvedSides?.sideB ?? []

  const sideDuration = currentSide === 'A'
    ? (resolvedSides?.flipAtMs ?? 0)
    : (resolvedSides?.sideB.reduce((s, t) => s + t.duration_ms, 0) ?? 0)

  const progress       = sideDuration > 0 ? Math.min(positionMs / sideDuration, 1) : 0
  const currentTrackIdx = getCurrentTrackIndex(currentTracks, positionMs)
  const currentTrack    = currentTracks[currentTrackIdx]

  // Needle angle: 28° at start → 5° near inner groove
  const needleAngle = 28 - progress * 23

  if (isIdle || !selectedAlbum) {
    return (
      <div className={styles.overlay}>
        <div className={styles.emptyMsg}>Sin disco en el plato</div>
      </div>
    )
  }

  const coverUrl = selectedAlbum.images[0]?.url

  return (
    <div className={styles.overlay}>
      {/* Top: disc + tonearm */}
      <div className={styles.turntableArea}>

        {/* Tonearm */}
        <div
          className={styles.tonearmWrap}
          style={{ transform: `rotate(${needleAngle}deg)` }}
        >
          <div className={styles.tonearmPivot} />
          <div className={styles.tonearmArm} />
          <div className={styles.tonearmHead} />
        </div>

        {/* Vinyl disc — click to pause/resume */}
        <button
          className={`${styles.disc} ${isPlaying ? styles.spinning : ''}`}
          onClick={() => isActive && togglePause()}
          title={isPaused ? 'Reanudar' : 'Pausar'}
          aria-label={isPaused ? 'Reanudar reproducción' : 'Pausar reproducción'}
        >
          {/* Groove rings */}
          <div className={styles.grooves} />

          {/* Album art label */}
          <div className={styles.label}>
            {coverUrl
              ? <img className={styles.labelImg} src={coverUrl} alt="" draggable={false} />
              : <div className={styles.labelBlank} />
            }
          </div>

          {/* Spindle */}
          <div className={styles.spindle} />

          {/* Pause overlay */}
          {isPaused && (
            <div className={styles.pauseOverlay}>
              <span className={styles.pauseIcon}>⏸</span>
            </div>
          )}

          {/* Gloss sheen */}
          <div className={styles.gloss} />
        </button>
      </div>

      {/* Bottom panel */}
      <div className={styles.panel}>
        {/* Current track info */}
        <div className={styles.nowPlaying}>
          <div className={styles.sideTag}>CARA {currentSide}</div>
          <div className={styles.trackName}>{currentTrack?.name ?? '—'}</div>
          <div className={styles.albumName}>{selectedAlbum.name}</div>
          <div className={styles.artist}>
            {selectedAlbum.artists.map(a => a.name).join(', ')}
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.progressWrap}>
          <span className={styles.time}>{formatMs(positionMs)}</span>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
          </div>
          <span className={styles.time}>{formatMs(sideDuration)}</span>
        </div>

        {/* Setlist */}
        <div className={styles.setlist} ref={tracklistRef}>
          {currentTracks.map((track, i) => (
            <div
              key={track.id}
              className={`${styles.setlistTrack} ${i === currentTrackIdx ? styles.setlistActive : ''}`}
            >
              <span className={styles.setlistNum}>{i + 1}</span>
              <span className={styles.setlistName}>{track.name}</span>
              <span className={styles.setlistDur}>{formatMs(track.duration_ms)}</span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          {playerState === 'playing-a' && (
            <button className={styles.btn} onClick={onTriggerFlip}>
              ↺ CARA B
            </button>
          )}
          <button
            className={`${styles.btn} ${styles.btnStop}`}
            onClick={onStop}
            disabled={playerState === 'lifting-needle'}
          >
            ◼ LEVANTAR AGUJA
          </button>
        </div>

        {(playerState === 'dropping-needle') && (
          <p className={styles.statusMsg}>Bajando aguja...</p>
        )}
        {(playerState === 'lifting-needle') && (
          <p className={styles.statusMsg}>Levantando aguja...</p>
        )}
      </div>
    </div>
  )
}
