import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyAlbum } from '../../modules/spotify/types'
import styles from './CoverFlow.module.css'

type SortKey = 'added' | 'year' | 'artist' | 'name'

const SORT_LABELS: Record<SortKey, string> = {
  added: 'Reciente',
  year:  'Año',
  artist:'Artista',
  name:  'Álbum',
}

const VISIBLE_SIDE = 5   // albums visible on each side of center
const ALBUM_SIZE   = 220 // px, center album face
const STEP_X       = 140 // px between album centers
const SIDE_ANGLE   = 52  // rotateY degrees for side albums
const SIDE_Z       = -80 // translateZ for side albums
const DRAG_THRESHOLD = 50 // px to trigger navigation

async function fetchSavedAlbums(token: string): Promise<SpotifyAlbum[]> {
  const res = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('No se pudo cargar la biblioteca')
  const data = await res.json()
  return data.items.map((i: { album: SpotifyAlbum }) => i.album)
}

function sortAlbums(albums: SpotifyAlbum[], key: SortKey): SpotifyAlbum[] {
  const copy = [...albums]
  switch (key) {
    case 'year':
      return copy.sort((a, b) =>
        (parseInt(a.release_date) || 0) - (parseInt(b.release_date) || 0))
    case 'artist':
      return copy.sort((a, b) =>
        (a.artists[0]?.name ?? '').localeCompare(b.artists[0]?.name ?? ''))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return copy // original = date added desc
  }
}

interface ItemStyle {
  transform: string
  zIndex: number
  opacity: number
  pointerEvents: 'all' | 'none'
}

function getItemStyle(pos: number): ItemStyle {
  const abs = Math.abs(pos)

  if (abs > VISIBLE_SIDE) {
    return { transform: 'translateX(0) scale(0)', zIndex: 0, opacity: 0, pointerEvents: 'none' }
  }

  if (pos === 0) {
    return {
      transform: `translateX(0px) rotateY(0deg) translateZ(0px) scale(1)`,
      zIndex: VISIBLE_SIDE + 1,
      opacity: 1,
      pointerEvents: 'all',
    }
  }

  const sign   = pos > 0 ? 1 : -1
  const tx     = sign * (STEP_X * abs + ALBUM_SIZE * 0.08)
  const ry     = -sign * SIDE_ANGLE
  const tz     = SIDE_Z * abs
  const scale  = Math.max(0.55, 0.85 - abs * 0.06)
  const opacity = abs <= 3 ? 1 : 1 - (abs - 3) * 0.5

  return {
    transform: `translateX(${tx}px) rotateY(${ry}deg) translateZ(${tz}px) scale(${scale})`,
    zIndex: VISIBLE_SIDE + 1 - abs,
    opacity: Math.max(0, opacity),
    pointerEvents: abs <= 2 ? 'all' : 'none',
  }
}

interface Props {
  onSelectAlbum: (album: SpotifyAlbum) => void
}

export function CoverFlow({ onSelectAlbum }: Props) {
  const { spotifyToken, albums, setAlbums } = useVinylStore()
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [sortKey, setSortKey]   = useState<SortKey>('added')
  const [currentIdx, setCurrentIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragStartX   = useRef<number | null>(null)
  const isDragging   = useRef(false)

  // Fetch albums
  useEffect(() => {
    if (!spotifyToken || albums.length > 0) return
    setLoading(true)
    fetchSavedAlbums(spotifyToken)
      .then(setAlbums)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [spotifyToken, albums.length, setAlbums])

  const sorted = useMemo(() => sortAlbums(albums, sortKey), [albums, sortKey])

  // Clamp index when sort changes
  useEffect(() => {
    setCurrentIdx((i) => Math.min(i, Math.max(0, sorted.length - 1)))
  }, [sorted.length])

  const goTo = useCallback((idx: number) => {
    setCurrentIdx(Math.max(0, Math.min(idx, sorted.length - 1)))
  }, [sorted.length])

  // Drag / swipe handlers
  const onDragStart = useCallback((clientX: number) => {
    dragStartX.current = clientX
    isDragging.current = false
  }, [])

  const onDragMove = useCallback((clientX: number) => {
    if (dragStartX.current === null) return
    if (Math.abs(clientX - dragStartX.current) > 8) isDragging.current = true
  }, [])

  const onDragEnd = useCallback((clientX: number, onClickFallback?: () => void) => {
    if (dragStartX.current === null) return
    const delta = clientX - dragStartX.current
    dragStartX.current = null

    if (isDragging.current) {
      if (delta < -DRAG_THRESHOLD) goTo(currentIdx + 1)
      else if (delta > DRAG_THRESHOLD) goTo(currentIdx - 1)
      isDragging.current = false
    } else {
      onClickFallback?.()
    }
  }, [currentIdx, goTo])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  goTo(currentIdx - 1)
      if (e.key === 'ArrowRight') goTo(currentIdx + 1)
      if (e.key === 'Enter') {
        const album = sorted[currentIdx]
        if (album) onSelectAlbum(album)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentIdx, sorted, goTo, onSelectAlbum])

  // Mouse wheel navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let lastWheel = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastWheel < 200) return
      lastWheel = now
      goTo(currentIdx + (e.deltaX > 0 || e.deltaY > 0 ? 1 : -1))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [currentIdx, goTo])

  const current = sorted[currentIdx]

  if (loading) return (
    <div className={styles.overlay}>
      <p className={styles.status}>Cargando biblioteca...</p>
    </div>
  )

  if (error) return (
    <div className={styles.overlay}>
      <p className={styles.status}>{error}</p>
    </div>
  )

  return (
    <div className={styles.overlay} ref={containerRef}>

      {/* Sort controls */}
      <div className={styles.sortBar}>
        {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
          <button
            key={key}
            className={`${styles.sortBtn} ${sortKey === key ? styles.sortActive : ''}`}
            onClick={() => setSortKey(key)}
          >
            {SORT_LABELS[key]}
          </button>
        ))}
      </div>

      {/* CoverFlow stage */}
      <div className={styles.stage}>
        <div
          className={styles.carousel}
          onMouseDown={(e) => onDragStart(e.clientX)}
          onMouseMove={(e) => onDragMove(e.clientX)}
          onMouseUp={(e) => onDragEnd(e.clientX)}
          onMouseLeave={() => { dragStartX.current = null; isDragging.current = false }}
          onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
          onTouchEnd={(e) => onDragEnd(e.changedTouches[0].clientX)}
        >
          {sorted.map((album, i) => {
            const pos   = i - currentIdx
            const style = getItemStyle(pos)
            if (Math.abs(pos) > VISIBLE_SIDE) return null

            return (
              <div
                key={album.id}
                className={styles.item}
                style={{
                  transform:     style.transform,
                  zIndex:        style.zIndex,
                  opacity:       style.opacity,
                  pointerEvents: style.pointerEvents,
                }}
                onMouseDown={(e) => onDragStart(e.clientX)}
                onMouseUp={(e) => onDragEnd(e.clientX, () => {
                  if (pos === 0) onSelectAlbum(album)
                  else goTo(i)
                })}
                onTouchStart={(e) => { e.stopPropagation(); onDragStart(e.touches[0].clientX) }}
                onTouchEnd={(e) => { e.stopPropagation(); onDragEnd(e.changedTouches[0].clientX, () => {
                  if (pos === 0) onSelectAlbum(album)
                  else goTo(i)
                })}}
              >
                <div
                  className={`${styles.face} ${pos === 0 ? styles.faceCenter : ''}`}
                  style={{ width: ALBUM_SIZE, height: ALBUM_SIZE }}
                >
                  {album.images[0] ? (
                    <img
                      className={styles.cover}
                      src={album.images[0].url}
                      alt={album.name}
                      draggable={false}
                    />
                  ) : (
                    <div className={styles.coverPlaceholder} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current album info */}
      {current && (
        <div className={styles.info}>
          <div className={styles.infoTitle}>{current.name}</div>
          <div className={styles.infoArtist}>
            {current.artists.map(a => a.name).join(', ')}
          </div>
          <div className={styles.infoYear}>
            {current.release_date?.split('-')[0] ?? ''}
            <span className={styles.infoTracks}>
              {' · '}{current.total_tracks} pistas
            </span>
          </div>
        </div>
      )}

      {/* Arrow nav */}
      <button
        className={`${styles.arrow} ${styles.arrowLeft}`}
        onClick={() => goTo(currentIdx - 1)}
        disabled={currentIdx === 0}
      >‹</button>
      <button
        className={`${styles.arrow} ${styles.arrowRight}`}
        onClick={() => goTo(currentIdx + 1)}
        disabled={currentIdx === sorted.length - 1}
      >›</button>

      {/* Counter */}
      <div className={styles.counter}>
        {currentIdx + 1} / {sorted.length}
      </div>
    </div>
  )
}
