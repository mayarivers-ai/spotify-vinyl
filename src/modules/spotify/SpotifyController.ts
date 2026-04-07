import { refreshAccessToken, isTokenExpiringSoon } from './SpotifyAuth'
import type { SpotifyPlayer, SpotifyPlayerState, SpotifyWebPlaybackState } from './types'

type TokenGetter = () => string | null
type TokenSetter = (token: string) => void

export class SpotifyController {
  private player: SpotifyPlayer | null = null
  private deviceId: string | null = null
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private refreshTimeout: ReturnType<typeof setTimeout> | null = null
  private getToken: TokenGetter
  private setToken: TokenSetter

  onDeviceReady: ((deviceId: string) => void) | null = null
  onStateChange: ((state: SpotifyPlayerState) => void) | null = null
  onError: ((error: string) => void) | null = null

  constructor(getToken: TokenGetter, setToken: TokenSetter) {
    this.getToken = getToken
    this.setToken = setToken
  }

  async init(): Promise<void> {
    await this.loadSDK()
    this.scheduleTokenRefresh()
  }

  private loadSDK(): Promise<void> {
    return new Promise((resolve) => {
      if (window.Spotify) {
        this.createPlayer()
        resolve()
        return
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        this.createPlayer()
        resolve()
      }

      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.head.appendChild(script)
    })
  }

  private createPlayer(): void {
    const player = new window.Spotify.Player({
      name: 'The Vinyl Room',
      getOAuthToken: async (cb) => {
        let token = this.getToken()
        if (!token || isTokenExpiringSoon()) {
          try {
            token = await refreshAccessToken()
            this.setToken(token)
          } catch {
            this.onError?.('Token refresh failed')
            return
          }
        }
        cb(token!)
      },
      volume: 0.8,
    })

    player.addListener('ready', (data) => {
      const { device_id } = data as { device_id: string }
      this.deviceId = device_id
      this.transferPlayback(device_id)
      this.onDeviceReady?.(device_id)
    })

    player.addListener('not_ready', () => {
      this.deviceId = null
    })

    player.addListener('player_state_changed', (state) => {
      if (!state) return
      this.onStateChange?.(this.mapState(state as SpotifyWebPlaybackState))
    })

    player.addListener('initialization_error', (data: unknown) => {
      const { message } = data as { message: string }
      this.onError?.(`Initialization error: ${message}`)
    })

    player.addListener('authentication_error', (data: unknown) => {
      const { message } = data as { message: string }
      this.onError?.(`Auth error: ${message}`)
    })

    player.addListener('account_error', (data: unknown) => {
      const { message } = data as { message: string }
      this.onError?.(`Account error (Spotify Premium required): ${message}`)
    })

    player.connect()
    this.player = player
  }

  private async transferPlayback(deviceId: string): Promise<void> {
    const token = this.getToken()
    if (!token) return

    await fetch('https://api.spotify.com/v1/me/player', {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_ids: [deviceId], play: false }),
    })
  }

  private mapState(state: SpotifyWebPlaybackState): SpotifyPlayerState {
    const track = state.track_window?.current_track
    return {
      position: state.position,
      duration: 0,
      paused: state.paused,
      track: track
        ? {
            id: track.id,
            uri: track.uri,
            name: track.name,
            duration_ms: 0,
            track_number: 0,
            disc_number: 0,
            artists: track.artists.map((a) => ({ id: '', name: a.name })),
          }
        : null,
    }
  }

  async waitForDevice(timeoutMs = 10_000): Promise<void> {
    if (this.deviceId) return
    const start = Date.now()
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (this.deviceId) {
          clearInterval(check)
          resolve()
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(check)
          reject(new Error('Spotify player not ready — make sure you have Spotify Premium'))
        }
      }, 200)
    })
  }

  async play(trackUris: string[], offsetIndex = 0): Promise<void> {
    const token = this.getToken()
    if (!token) throw new Error('No Spotify token')

    await this.waitForDevice()

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: trackUris,
          offset: { position: offsetIndex },
        }),
      }
    )

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Spotify play failed (${response.status}): ${body}`)
    }

    this.startPolling()
  }

  async pause(): Promise<void> {
    await this.player?.pause()
  }

  async resume(): Promise<void> {
    await this.player?.resume()
  }

  async seekTo(ms: number): Promise<void> {
    await this.player?.seek(ms)
  }

  async setVolume(volume: number): Promise<void> {
    await this.player?.setVolume(Math.max(0, Math.min(1, volume)))
  }

  async getCurrentState(): Promise<SpotifyPlayerState | null> {
    const state = await this.player?.getCurrentState()
    if (!state) return null
    return this.mapState(state)
  }

  private startPolling(): void {
    if (this.pollInterval) return
    this.pollInterval = setInterval(async () => {
      const state = await this.getCurrentState()
      if (state) this.onStateChange?.(state)
    }, 500)
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  private scheduleTokenRefresh(): void {
    // Refresh every 55 minutes
    this.refreshTimeout = setTimeout(async () => {
      try {
        const newToken = await refreshAccessToken()
        this.setToken(newToken)
      } finally {
        this.scheduleTokenRefresh()
      }
    }, 55 * 60 * 1000)
  }

  destroy(): void {
    this.stopPolling()
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
    this.player?.disconnect()
  }
}
