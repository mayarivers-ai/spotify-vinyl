export const TIMINGS = {
  SHELF_TO_ALBUM: 600,
  ALBUM_READ_MIN: 4000,
  NEEDLE_DROP: 2800,
  NEEDLE_LIFT: 1400,
  FLIP_TOTAL: 5000,
} as const

export type TimingKey = keyof typeof TIMINGS

/**
 * Executes `action` immediately and returns a Promise that resolves
 * only after at least `minDurationMs` has elapsed.
 */
export async function slowAction<T>(
  action: () => Promise<T> | T,
  minDurationMs: number
): Promise<T> {
  const start = Date.now()
  const result = await action()
  const elapsed = Date.now() - start
  const remaining = minDurationMs - elapsed

  if (remaining > 0) {
    await delay(remaining)
  }

  return result
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
