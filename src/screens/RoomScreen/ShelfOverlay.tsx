import { useEffect, useState } from 'react'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyAlbum } from '../../modules/spotify/types'
import styles from './ShelfOverlay.module.css'

async function fetchSavedAlbums(token: string): Promise<SpotifyAlbum[]> {
  const response = await fetch('https://api.spotify.com/v1/me/albums?limit=50', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch albums')
  const data = await response.json()
  return data.items.map((item: { album: SpotifyAlbum }) => item.album)
}

interface Props {
  onSelectAlbum: (album: SpotifyAlbum) => void
}

export function ShelfOverlay({ onSelectAlbum }: Props) {
  const { spotifyToken, albums, setAlbums } = useVinylStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!spotifyToken || albums.length > 0) return
    setLoading(true)
    fetchSavedAlbums(spotifyToken)
      .then(setAlbums)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [spotifyToken, albums.length, setAlbums])

  return (
    <div className={styles.overlay}>
      <div className={styles.label}>ESTANTERÍA</div>

      {loading && <p className={styles.status}>Cargando...</p>}
      {error && <p className={styles.status}>Error: {error}</p>}

      {!loading && albums.length === 0 && !error && (
        <p className={styles.status}>Sin discos guardados</p>
      )}

      <div className={styles.grid}>
        {albums.map((album) => (
          <button
            key={album.id}
            className={styles.vinyl}
            onClick={() => onSelectAlbum(album)}
            title={`${album.name} — ${album.artists.map(a => a.name).join(', ')}`}
          >
            {album.images[0] ? (
              <img
                className={styles.cover}
                src={album.images[0].url}
                alt={album.name}
                loading="lazy"
              />
            ) : (
              <div className={styles.coverPlaceholder} />
            )}
            <div className={styles.spine} />
          </button>
        ))}
      </div>
    </div>
  )
}
