import { useVinylStore } from '../store/useVinylStore'

export function useVinylAudio() {
  return useVinylStore((s) => ({
    vinylCondition: s.vinylCondition,
    crackleVolume: s.crackleVolume,
    setVinylCondition: s.setVinylCondition,
    setCrackleVolume: s.setCrackleVolume,
  }))
}
