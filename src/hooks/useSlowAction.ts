import { useState, useCallback, useRef } from 'react'
import { slowAction } from '../modules/slowness/SlownessSystem'

interface SlowActionState {
  isPending: boolean
  execute: <T>(action: () => Promise<T> | T) => Promise<T | undefined>
}

export function useSlowAction(minDurationMs: number): SlowActionState {
  const [isPending, setIsPending] = useState(false)
  const pendingRef = useRef(false)

  const execute = useCallback(
    async <T>(action: () => Promise<T> | T): Promise<T | undefined> => {
      if (pendingRef.current) return undefined

      pendingRef.current = true
      setIsPending(true)

      try {
        return await slowAction(action, minDurationMs)
      } finally {
        pendingRef.current = false
        setIsPending(false)
      }
    },
    [minDurationMs]
  )

  return { isPending, execute }
}
