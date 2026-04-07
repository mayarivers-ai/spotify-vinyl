import { create } from 'zustand'
import type { SpotifyAlbum, SpotifyTrack } from '../modules/spotify/types'
import type { ResolvedSides } from '../modules/resolver/AlbumResolver'
import type { VinylCondition } from '../modules/audio/VinylAudioEngine'
import { SpotifyController } from '../modules/spotify/SpotifyController'
import { VinylAudioEngine } from '../modules/audio/VinylAudioEngine'
import { resolveAlbumSides } from '../modules/resolver/AlbumResolver'
import { TIMINGS, slowAction } from '../modules/slowness/SlownessSystem'

export type PlayerState =
  | 'idle'
  | 'selecting'
  | 'dropping-needle'
  | 'playing-a'
  | 'flipping'
  | 'playing-b'
  | 'lifting-needle'

interface VinylStore {
  // Auth
  spotifyToken: string | null
  deviceId: string | null

  // Collection
  albums: SpotifyAlbum[]

  // Selected album
  selectedAlbum: SpotifyAlbum | null
  resolvedSides: ResolvedSides | null

  // Player state
  playerState: PlayerState
  currentSide: 'A' | 'B'
  positionMs: number
  durationMs: number

  // Audio
  vinylCondition: VinylCondition
  crackleVolume: number
  isPaused: boolean

  // Singleton engines (not serialized, just stored)
  _controller: SpotifyController | null
  _audioEngine: VinylAudioEngine | null

  // Actions
  setToken: (token: string) => void
  setDeviceId: (deviceId: string) => void
  setAlbums: (albums: SpotifyAlbum[]) => void
  selectAlbum: (album: SpotifyAlbum) => Promise<void>
  startPlayback: () => Promise<void>
  updatePosition: (positionMs: number, durationMs: number) => void
  triggerFlip: () => void
  confirmFlip: () => Promise<void>
  stopPlayback: () => Promise<void>
  togglePause: () => Promise<void>
  setVinylCondition: (condition: VinylCondition) => void
  setCrackleVolume: (volume: number) => void
  initEngines: () => void
}

export const useVinylStore = create<VinylStore>((set, get) => ({
  spotifyToken: null,
  deviceId: null,
  albums: [],
  selectedAlbum: null,
  resolvedSides: null,
  playerState: 'idle',
  currentSide: 'A',
  positionMs: 0,
  durationMs: 0,
  vinylCondition: 'used',
  crackleVolume: 0.7,
  isPaused: false,
  _controller: null,
  _audioEngine: null,

  setToken: (token) => set({ spotifyToken: token }),

  setDeviceId: (deviceId) => set({ deviceId }),

  setAlbums: (albums) => set({ albums }),

  selectAlbum: async (album) => {
    set({ selectedAlbum: album, playerState: 'selecting', resolvedSides: null })
    const resolved = await resolveAlbumSides(album)
    set({ resolvedSides: resolved })
  },

  startPlayback: async () => {
    const { _controller, _audioEngine, resolvedSides, vinylCondition } = get()
    if (!_controller || !resolvedSides) throw new Error('Player no inicializado')

    set({ playerState: 'dropping-needle' })

    try {
      await slowAction(async () => {
        await _audioEngine?.init()
        _audioEngine?.playElectricPop()
        _audioEngine?.playNeedleDrop()
        _audioEngine?.startCrackle(vinylCondition, 1, 800)

        const uris = resolvedSides.sideA.map((t: SpotifyTrack) => t.uri)
        await _controller.play(uris)
      }, TIMINGS.NEEDLE_DROP)
    } catch (e) {
      set({ playerState: 'idle' })
      throw e
    }

    set({ playerState: 'playing-a', currentSide: 'A' })
  },

  updatePosition: (positionMs, durationMs) => {
    const { playerState, resolvedSides } = get()

    set({ positionMs, durationMs })

    // Auto-trigger flip when side A ends
    if (
      playerState === 'playing-a' &&
      resolvedSides &&
      positionMs >= resolvedSides.flipAtMs - 500
    ) {
      get().triggerFlip()
    }
  },

  triggerFlip: () => {
    const { playerState, _controller } = get()
    if (playerState !== 'playing-a') return
    _controller?.pause()
    set({ playerState: 'flipping' })
  },

  confirmFlip: async () => {
    const { _controller, _audioEngine, resolvedSides, vinylCondition } = get()
    if (!_controller || !resolvedSides) return

    set({ playerState: 'dropping-needle' })

    await slowAction(async () => {
      _audioEngine?.playFlipSound()

      const uris = resolvedSides.sideB.map((t: SpotifyTrack) => t.uri)
      await _controller.play(uris)
      _audioEngine?.startCrackle(vinylCondition)
    }, TIMINGS.NEEDLE_DROP)

    set({ playerState: 'playing-b', currentSide: 'B' })
  },

  stopPlayback: async () => {
    const { _controller, _audioEngine } = get()
    if (!_controller) return

    set({ playerState: 'lifting-needle' })

    await slowAction(async () => {
      _audioEngine?.playNeedleLift()
      _audioEngine?.fadeOut(800)
      await _controller.pause()
    }, TIMINGS.NEEDLE_LIFT)

    _controller.stopPolling()
    set({ playerState: 'idle', positionMs: 0, durationMs: 0, currentSide: 'A' })
  },

  togglePause: async () => {
    const { _controller, _audioEngine, isPaused, playerState } = get()
    if (!_controller) return
    const isActive = playerState === 'playing-a' || playerState === 'playing-b' || isPaused
    if (!isActive) return

    if (isPaused) {
      await _controller.resume()
      _audioEngine?.playNeedleDrop()
      _audioEngine?.startCrackle(get().vinylCondition, 1, 300)
      set({ isPaused: false })
    } else {
      _audioEngine?.playNeedleLift()
      _audioEngine?.fadeOut(400)
      await _controller.pause()
      set({ isPaused: true })
    }
  },

  setVinylCondition: (condition) => set({ vinylCondition: condition }),

  setCrackleVolume: (volume) => {
    const { _audioEngine } = get()
    _audioEngine?.setMasterVolume(volume)
    set({ crackleVolume: volume })
  },

  initEngines: () => {
    const { spotifyToken, _controller } = get()
    if (_controller) return

    const audioEngine = new VinylAudioEngine()

    const controller = new SpotifyController(
      () => get().spotifyToken,
      (token) => set({ spotifyToken: token })
    )

    controller.onDeviceReady = (deviceId) => set({ deviceId })
    controller.onStateChange = (state) => {
      get().updatePosition(state.position, state.duration)
    }

    if (spotifyToken) {
      controller.init()
    }

    set({ _controller: controller, _audioEngine: audioEngine })
  },
}))
