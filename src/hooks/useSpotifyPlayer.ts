import { useEffect } from 'react'
import { useVinylStore } from '../store/useVinylStore'

export function useSpotifyPlayer() {
  const { spotifyToken, initEngines, _controller } = useVinylStore()

  useEffect(() => {
    if (spotifyToken && !_controller) {
      initEngines()
    }
  }, [spotifyToken, _controller, initEngines])

  useEffect(() => {
    if (spotifyToken && _controller) {
      _controller.init()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotifyToken])

  return useVinylStore((s) => ({
    playerState: s.playerState,
    currentSide: s.currentSide,
    positionMs: s.positionMs,
    durationMs: s.durationMs,
    deviceId: s.deviceId,
  }))
}
