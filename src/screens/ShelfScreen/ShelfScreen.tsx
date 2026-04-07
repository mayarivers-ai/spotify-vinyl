import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyAlbum } from '../../modules/spotify/types'
import styles from './ShelfScreen.module.css'

async function fetchSavedAlbums(token: string): Promise<SpotifyAlbum[]> {
  const response = await fetch(
    'https://api.spotify.com/v1/me/albums?limit=50',
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!response.ok) throw new Error('Failed to fetch albums')
  const data = await response.json()
  return data.items.map((item: { album: SpotifyAlbum }) => item.album)
}

export function ShelfScreen() {
  const navigate = useNavigate()
  const { spotifyToken, albums, setAlbums, selectAlbum } = useVinylStore()
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

  const handleSelect = async (album: SpotifyAlbum) => {
    await selectAlbum(album)
    navigate('/album')
  }

  if (!spotifyToken) {
    navigate('/')
    return null
  }

  return (
    <div className={styles.shelf}>
      <div className={styles.header}>
        <h1 className={styles.title}>Tu colección</h1>
        {albums.length > 0 && (
          <span className={styles.count}>{albums.length} discos</span>
        )}
      </div>

      {loading && <p className={styles.loading}>Cargando colección...</p>}
      {error && <p className={styles.loading}>Error: {error}</p>}

      {!loading && albums.length === 0 && !error && (
        <p className={styles.empty}>No hay álbumes guardados en tu biblioteca</p>
      )}

      <div className={styles.grid}>
        {albums.map((album) => (
          <div
            key={album.id}
            className={styles.albumCard}
            onClick={() => handleSelect(album)}
          >
            {album.images[0] ? (
              <img
                className={styles.cover}
                src={album.images[0].url}
                alt={album.name}
                loading="lazy"
              />
            ) : (
              <div className={styles.coverPlaceholder}>SIN PORTADA</div>
            )}
            <div className={styles.albumInfo}>
              <div className={styles.albumName}>{album.name}</div>
              <div className={styles.artistName}>
                {album.artists.map((a) => a.name).join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
