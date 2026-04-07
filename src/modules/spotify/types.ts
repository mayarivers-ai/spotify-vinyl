export interface SpotifyAlbum {
  id: string
  name: string
  artists: Array<{ id: string; name: string }>
  images: Array<{ url: string; height: number; width: number }>
  release_date: string
  total_tracks: number
  tracks: {
    items: SpotifyTrack[]
  }
  external_urls: { spotify: string }
}

export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  track_number: number
  disc_number: number
  artists: Array<{ id: string; name: string }>
}

export interface SpotifyPlayerState {
  position: number
  duration: number
  paused: boolean
  track: SpotifyTrack | null
}

export interface SpotifyWebPlaybackTrack {
  uri: string
  id: string
  type: string
  media_type: string
  name: string
  is_playable: boolean
  album: {
    uri: string
    name: string
    images: Array<{ url: string }>
  }
  artists: Array<{ uri: string; name: string }>
}

export interface SpotifyWebPlaybackState {
  context: { uri: string; metadata: Record<string, unknown> }
  disallows: Record<string, boolean>
  paused: boolean
  position: number
  repeat_mode: number
  shuffle: boolean
  track_window: {
    current_track: SpotifyWebPlaybackTrack
    previous_tracks: SpotifyWebPlaybackTrack[]
    next_tracks: SpotifyWebPlaybackTrack[]
  }
}

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady: () => void
  }
}

export interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, cb: (data: unknown) => void): void
  removeListener(event: string, cb?: (data: unknown) => void): void
  getCurrentState(): Promise<SpotifyWebPlaybackState | null>
  setVolume(volume: number): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  seek(position_ms: number): Promise<void>
}
