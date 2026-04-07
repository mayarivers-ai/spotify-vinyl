const DISCOGS_BASE = 'https://api.discogs.com'
const TOKEN = import.meta.env.VITE_DISCOGS_TOKEN as string | undefined

interface DiscogsSearchResult {
  results: Array<{
    id: number
    title: string
    year: string
    label: string[]
    country: string
    type: string
  }>
}

interface DiscogsTracklist {
  position: string
  title: string
  duration: string
  type_: string
}

interface DiscogsRelease {
  id: number
  title: string
  year: number
  labels: Array<{ name: string }>
  country: string
  tracklist: DiscogsTracklist[]
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'User-Agent': 'VinylStream/1.0',
  }
  if (TOKEN) h['Authorization'] = `Discogs token=${TOKEN}`
  return h
}

export async function searchRelease(
  artist: string,
  album: string
): Promise<DiscogsSearchResult['results'][0] | null> {
  const q = encodeURIComponent(`${artist} ${album}`)
  const url = `${DISCOGS_BASE}/database/search?q=${q}&type=release&per_page=5`

  const response = await fetch(url, { headers: headers() })
  if (!response.ok) return null

  const data: DiscogsSearchResult = await response.json()
  return data.results[0] ?? null
}

export async function getRelease(releaseId: number): Promise<DiscogsRelease | null> {
  const url = `${DISCOGS_BASE}/releases/${releaseId}`
  const response = await fetch(url, { headers: headers() })
  if (!response.ok) return null
  return response.json()
}

export interface ParsedSides {
  A: string[]  // track titles
  B: string[]
}

export function parseTracklist(tracklist: DiscogsTracklist[]): ParsedSides | null {
  const sides: ParsedSides = { A: [], B: [] }
  let hasSideData = false

  for (const track of tracklist) {
    if (track.type_ === 'heading') continue
    const pos = track.position.toUpperCase()

    if (pos.startsWith('A')) {
      sides.A.push(track.title)
      hasSideData = true
    } else if (pos.startsWith('B')) {
      sides.B.push(track.title)
      hasSideData = true
    }
  }

  return hasSideData ? sides : null
}

// Fuzzy title match: returns similarity 0-1
export function titleSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

  const na = normalize(a)
  const nb = normalize(b)

  if (na === nb) return 1

  // Intersection of words
  const wa = new Set(na.split(/\s+/))
  const wb = new Set(nb.split(/\s+/))
  const intersection = [...wa].filter((w) => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size

  return intersection / union
}
