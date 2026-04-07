import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVinylStore } from '../../store/useVinylStore'
import { TIMINGS } from '../../modules/slowness/SlownessSystem'
import styles from './AlbumScreen.module.css'

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function AlbumScreen() {
  const navigate = useNavigate()
  const { selectedAlbum, resolvedSides, startPlayback, playerState } = useVinylStore()
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(TIMINGS.ALBUM_READ_MIN / 1000))
  const [canPlay, setCanPlay] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedAlbum) {
      navigate('/shelf')
      return
    }

    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          setCanPlay(true)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [selectedAlbum, navigate])

  const handlePlay = async () => {
    setPlayError(null)
    try {
      await startPlayback()
      navigate('/turntable')
    } catch (e) {
      setPlayError((e as Error).message)
    }
  }

  if (!selectedAlbum) return null

  const album = selectedAlbum
  const year = album.release_date?.split('-')[0] ?? '—'

  return (
    <div className={styles.screen}>
      <button className={styles.back} onClick={() => navigate('/shelf')}>
        ← Volver a la estantería
      </button>

      <div className={styles.layout}>
        <div className={styles.coverWrap}>
          {album.images[0] ? (
            <img className={styles.cover} src={album.images[0].url} alt={album.name} />
          ) : (
            <div className={styles.coverPlaceholder} />
          )}
        </div>

        <div className={styles.info}>
          <h1 className={styles.albumTitle}>{album.name}</h1>
          <div className={styles.artist}>
            {album.artists.map((a) => a.name).join(', ')}
          </div>

          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>AÑO</span>
              {year}
            </span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>PISTAS</span>
              {album.total_tracks}
            </span>
          </div>

          {resolvedSides ? (
            <>
              <div className={styles.tracklist}>
                <div className={styles.side}>
                  <div className={styles.sideLabel}>Cara A</div>
                  {resolvedSides.sideA.map((track, i) => (
                    <div key={track.id} className={styles.track}>
                      <span className={styles.trackNum}>{i + 1}</span>
                      <span className={styles.trackName}>{track.name}</span>
                      <span className={styles.trackDuration}>
                        {formatDuration(track.duration_ms)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className={styles.side}>
                  <div className={styles.sideLabel}>Cara B</div>
                  {resolvedSides.sideB.map((track, i) => (
                    <div key={track.id} className={styles.track}>
                      <span className={styles.trackNum}>{i + 1}</span>
                      <span className={styles.trackName}>{track.name}</span>
                      <span className={styles.trackDuration}>
                        {formatDuration(track.duration_ms)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {resolvedSides.source === 'auto' && (
                <p className={styles.sourceNote}>
                  División automática — no se encontraron datos de cara A/B
                </p>
              )}
            </>
          ) : (
            <p className={styles.loadingNote}>Resolviendo caras del disco...</p>
          )}

          <div className={styles.actions}>
            <button
              className={styles.playBtn}
              onClick={handlePlay}
              disabled={!canPlay || playerState === 'dropping-needle'}
            >
              {playerState === 'dropping-needle' ? 'Bajando aguja...' : 'Poner en el plato'}
            </button>
            {!canPlay && secondsLeft > 0 && (
              <span className={styles.countdown}>{secondsLeft}s</span>
            )}
          </div>
          {playError && (
            <p style={{ fontFamily: 'Courier New, monospace', fontSize: '0.7rem', color: '#c0392b', marginTop: '0.8rem' }}>
              {playError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
