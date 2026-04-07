import type { SpotifyAlbum, SpotifyTrack } from '../spotify/types'
import catalogData from './catalog.json'
import {
  searchRelease,
  getRelease,
  parseTracklist,
  titleSimilarity,
} from './DiscogsClient'

export interface ResolvedSides {
  sideA: SpotifyTrack[]
  sideB: SpotifyTrack[]
  flipAtMs: number
  source: 'catalog' | 'discogs' | 'auto'
}

interface CatalogEntry {
  spotify_id: string
  sides: { A: string[]; B: string[] }
}

export async function resolveAlbumSides(album: SpotifyAlbum): Promise<ResolvedSides> {
  const tracks = album.tracks.items

  // 1. Local catalog lookup
  const catalogEntry = (catalogData.albums as CatalogEntry[]).find(
    (a) => a.spotify_id === album.id
  )

  if (catalogEntry) {
    const sideA = catalogEntry.sides.A
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as SpotifyTrack[]
    const sideB = catalogEntry.sides.B
      .map((id) => tracks.find((t) => t.id === id))
      .filter(Boolean) as SpotifyTrack[]

    if (sideA.length > 0 && sideB.length > 0) {
      return {
        sideA,
        sideB,
        flipAtMs: sideA.reduce((sum, t) => sum + t.duration_ms, 0),
        source: 'catalog',
      }
    }
  }

  // 2. Discogs lookup
  try {
    const artistName = album.artists[0]?.name ?? ''
    const searchResult = await searchRelease(artistName, album.name)

    if (searchResult) {
      const release = await getRelease(searchResult.id)

      if (release) {
        const sides = parseTracklist(release.tracklist)

        if (sides) {
          const sideA = matchTracks(sides.A, tracks)
          const sideB = matchTracks(sides.B, tracks)

          if (sideA.length > 0 && sideB.length > 0) {
            return {
              sideA,
              sideB,
              flipAtMs: sideA.reduce((sum, t) => sum + t.duration_ms, 0),
              source: 'discogs',
            }
          }
        }
      }
    }
  } catch {
    // Discogs failed, fall through to auto
  }

  // 3. Auto fallback: split by total duration
  return autoSplit(tracks)
}

function matchTracks(titles: string[], spotifyTracks: SpotifyTrack[]): SpotifyTrack[] {
  const used = new Set<string>()
  const result: SpotifyTrack[] = []

  for (const title of titles) {
    let bestMatch: SpotifyTrack | null = null
    let bestScore = 0

    for (const track of spotifyTracks) {
      if (used.has(track.id)) continue
      const score = titleSimilarity(title, track.name)
      if (score > bestScore && score > 0.4) {
        bestScore = score
        bestMatch = track
      }
    }

    if (bestMatch) {
      result.push(bestMatch)
      used.add(bestMatch.id)
    }
  }

  return result
}

function autoSplit(tracks: SpotifyTrack[]): ResolvedSides {
  const total = tracks.reduce((sum, t) => sum + t.duration_ms, 0)
  const half = total / 2

  let accumulated = 0
  let splitIndex = Math.ceil(tracks.length / 2)

  for (let i = 0; i < tracks.length; i++) {
    accumulated += tracks[i].duration_ms
    if (accumulated >= half) {
      splitIndex = i + 1
      break
    }
  }

  const sideA = tracks.slice(0, splitIndex)
  const sideB = tracks.slice(splitIndex)

  return {
    sideA,
    sideB,
    flipAtMs: sideA.reduce((sum, t) => sum + t.duration_ms, 0),
    source: 'auto',
  }
}
