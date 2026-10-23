/** Axis ticks in clean steps from 0 up to the first step at or above `max` (e.g. 0, 5K, 10K, 15K, 20K). */
export function niceTicks(max: number, step: number): number[] {
  const top = Math.max(step, Math.ceil(max / step) * step)
  return Array.from({ length: top / step + 1 }, (_, i) => i * step)
}
