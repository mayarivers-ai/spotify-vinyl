import { useState, useEffect, useCallback, useRef } from 'react'
import { useVinylStore } from '../../store/useVinylStore'
import type { SpotifyAlbum } from '../../modules/spotify/types'
import { useRoomNavigation } from './useRoomNavigation'
import type { RoomView } from './useRoomNavigation'
import { RoomCanvas } from './RoomCanvas'
import { CoverFlow } from './CoverFlow'
import { AlbumDetailOverlay } from './AlbumDetailOverlay'
import { TurntableOverlay } from './TurntableOverlay'
import { FlipModal } from './FlipModal'
import { OnboardingTour, hasSeenOnboarding } from './OnboardingTour'
import styles from './RoomScreen.module.css'

export function RoomScreen() {
  const { nav, navigateTo } = useRoomNavigation()
  const {
    selectAlbum,
    startPlayback,
    triggerFlip,
    confirmFlip,
    stopPlayback,
    playerState,
    _audioEngine,
  } = useVinylStore()

  const handleNavigate = useCallback((view: RoomView) => {
    _audioEngine?.playFootsteps(2)
    navigateTo(view)
  }, [_audioEngine, navigateTo])

  const [detailAlbum, setDetailAlbum] = useState<SpotifyAlbum | null>(null)
  const [showFlip, setShowFlip] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding())

  // Auto-show flip modal when side A ends
  useEffect(() => {
    if (playerState === 'flipping') {
      setShowFlip(true)
    }
  }, [playerState])

  // Navigate to turntable only when playback first starts (not on every render)
  const prevPlayerState = useRef<string | null>(null)
  useEffect(() => {
    const wasIdle = prevPlayerState.current === null || prevPlayerState.current === 'idle' || prevPlayerState.current === 'flipping'
    const isPlaying = playerState === 'playing-a' || playerState === 'playing-b'
    if (isPlaying && wasIdle) {
      navigateTo('turntable')
    }
    prevPlayerState.current = playerState
  }, [playerState, navigateTo])

  const handleSelectAlbum = async (album: SpotifyAlbum) => {
    await selectAlbum(album)
    setDetailAlbum(album)
  }

  const handlePlay = async () => {
    await startPlayback()
    setDetailAlbum(null)
  }

  const handleStop = async () => {
    await stopPlayback()
  }

  const handleConfirmFlip = async () => {
    setShowFlip(false)
    await confirmFlip()
  }

  const handleCancelFlip = () => {
    setShowFlip(false)
  }

  const handleTriggerFlip = () => {
    triggerFlip()
  }

  // Hotspot cursor hints
  const getCursor = () => {
    if (nav.animating) return 'default'
    if (nav.view === 'full') return 'pointer'
    return 'default'
  }

  return (
    <div className={styles.room} style={{ cursor: getCursor() }}>
      {/* Pixel art room background */}
      <RoomCanvas nav={nav} onClick={navigateTo} />

      {/* Back button when not in full view */}
      {!nav.animating && nav.view !== 'full' && (
        <button
          className={styles.backBtn}
          onClick={() => handleNavigate('full')}
        >
          ← SALA
        </button>
      )}

      {/* Hotspot hints in full view */}
      {!nav.animating && nav.view === 'full' && (
        <>
          <div className={`${styles.hotspot} ${styles.hotspotLeft}`} onClick={() => handleNavigate('shelf')}>
            <span className={styles.hotspotLabel}>ESTANTERÍA</span>
          </div>
          <div className={`${styles.hotspot} ${styles.hotspotRight}`} onClick={() => handleNavigate('turntable')}>
            <span className={styles.hotspotLabel}>TOCADISCOS</span>
          </div>
        </>
      )}

      {/* CoverFlow shelf */}
      {!nav.animating && nav.view === 'shelf' && (
        <CoverFlow onSelectAlbum={handleSelectAlbum} />
      )}

      {/* Turntable overlay */}
      {!nav.animating && nav.view === 'turntable' && (
        <TurntableOverlay
          onTriggerFlip={handleTriggerFlip}
          onStop={handleStop}
        />
      )}

      {/* Album detail panel */}
      {detailAlbum && (
        <AlbumDetailOverlay
          album={detailAlbum}
          onClose={() => setDetailAlbum(null)}
          onPlay={handlePlay}
        />
      )}

      {/* Flip modal */}
      {showFlip && (
        <FlipModal
          onConfirm={handleConfirmFlip}
          onCancel={handleCancelFlip}
        />
      )}

      {/* First-time onboarding tour */}
      {showOnboarding && (
        <OnboardingTour onDone={() => setShowOnboarding(false)} />
      )}
    </div>
  )
}
