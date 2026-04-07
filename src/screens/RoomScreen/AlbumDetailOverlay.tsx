import { useEffect, useState } from 'react'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyAlbum } from '../../modules/spotify/types'
import { TIMINGS } from '../../modules/slowness/SlownessSystem'
import styles from './AlbumDetailOverlay.module.css'

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface Props {
  album: SpotifyAlbum
  onClose: () => void
  onPlay: () => Promise<void>
}

export function AlbumDetailOverlay({ album, onClose, onPlay }: Props) {
  const { resolvedSides, playerState } = useVinylStore()
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TIMINGS.ALBUM_READ_MIN / 1000))
  const [canPlay, setCanPlay] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  // Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); setCanPlay(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handlePlay = async () => {
    setError(null)
    try {
      await onPlay()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const year = album.release_date?.split('-')[0] ?? '—'
  const coverUrl = album.images[0]?.url

  return (
    <div className={`${styles.backdrop} ${visible ? styles.visible : ''}`} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>

        <div className={styles.header}>
          {coverUrl && <img className={styles.cover} src={coverUrl} alt={album.name} />}
          <div className={styles.meta}>
            <div className={styles.title}>{album.name}</div>
            <div className={styles.artist}>{album.artists.map(a => a.name).join(', ')}</div>
            <div className={styles.year}>{year}</div>
          </div>
        </div>

        {resolvedSides ? (
          <div className={styles.tracklist}>
            <div className={styles.side}>
              <div className={styles.sideLabel}>▶ CARA A</div>
              {resolvedSides.sideA.map((t, i) => (
                <div key={t.id} className={styles.track}>
                  <span className={styles.trackNum}>{i + 1}</span>
                  <span className={styles.trackName}>{t.name}</span>
                  <span className={styles.trackDur}>{formatMs(t.duration_ms)}</span>
                </div>
              ))}
            </div>
            <div className={styles.side}>
              <div className={styles.sideLabel}>▶ CARA B</div>
              {resolvedSides.sideB.map((t, i) => (
                <div key={t.id} className={styles.track}>
                  <span className={styles.trackNum}>{i + 1}</span>
                  <span className={styles.trackName}>{t.name}</span>
                  <span className={styles.trackDur}>{formatMs(t.duration_ms)}</span>
                </div>
              ))}
            </div>
            {resolvedSides.source === 'auto' && (
              <p className={styles.sourceNote}>División automática</p>
            )}
          </div>
        ) : (
          <p className={styles.loading}>Resolviendo caras...</p>
        )}

        <div className={styles.actions}>
          <button
            className={styles.playBtn}
            onClick={handlePlay}
            disabled={!canPlay || playerState === 'dropping-needle'}
          >
            {playerState === 'dropping-needle'
              ? 'BAJANDO AGUJA...'
              : 'PONER EN EL PLATO'}
          </button>
          {!canPlay && secondsLeft > 0 && (
            <span className={styles.countdown}>{secondsLeft}s</span>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  )
}
