import { useVinylStore } from '../store/useVinylStore'

export function useAlbumSides() {
  return useVinylStore((s) => ({
    resolvedSides: s.resolvedSides,
    selectedAlbum: s.selectedAlbum,
    currentSide: s.currentSide,
    positionMs: s.positionMs,
  }))
}
