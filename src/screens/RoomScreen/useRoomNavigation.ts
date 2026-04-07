import { useState, useCallback, useRef, useEffect } from 'react'

export type RoomView = 'full' | 'shelf' | 'turntable'

export const WALK_DURATION = 1200 // ms

// Where on screen each zone is (for zoom anchor)
export const ZONE_FOCUS: Record<RoomView, { x: number; y: number }> = {
  full:       { x: 0.5, y: 0.5 },
  shelf:      { x: 0.22, y: 0.45 },
  turntable:  { x: 0.75, y: 0.55 },
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export interface RoomNavState {
  view: RoomView          // current destination (after animation completes)
  fromView: RoomView      // where we came from
  animating: boolean
  easedProgress: number   // 0-1, eased
}

export function useRoomNavigation() {
  const [nav, setNav] = useState<RoomNavState>({
    view: 'full',
    fromView: 'full',
    animating: false,
    easedProgress: 1,
  })

  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(0)
  const targetRef = useRef<RoomView>('full')
  const fromRef = useRef<RoomView>('full')

  const cancelAnim = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const navigateTo = useCallback((target: RoomView) => {
    setNav((prev) => {
      if (prev.view === target && !prev.animating) return prev
      return prev
    })

    // Read current view synchronously via ref
    targetRef.current = target
    cancelAnim()
    startRef.current = performance.now()

    setNav((prev) => {
      fromRef.current = prev.view
      return {
        view: target,
        fromView: prev.view,
        animating: true,
        easedProgress: 0,
      }
    })

    const tick = (now: number) => {
      const raw = Math.min((now - startRef.current) / WALK_DURATION, 1)
      const eased = easeInOut(raw)

      if (raw < 1) {
        setNav((prev) => ({ ...prev, easedProgress: eased }))
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setNav({
          view: targetRef.current,
          fromView: fromRef.current,
          animating: false,
          easedProgress: 1,
        })
        rafRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => () => cancelAnim(), [])

  return { nav, navigateTo }
}
