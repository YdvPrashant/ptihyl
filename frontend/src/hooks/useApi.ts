import { useEffect, useEffectEvent, useState } from 'react'

type ApiState<T> = { data?: T; error?: Error; loading: boolean }
type Result<T> = { key: string; data?: T; error?: Error }

/**
 * Run `load` whenever `deps` (plain strings or numbers) change. Each new request aborts the previous one and a stale
 * result is never applied, so a slow (cold-start) response cannot overwrite a newer view. While a new request is in
 * flight the previous data stays visible and `loading` is true.
 */
export function useApi<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]): ApiState<T> {
  const key = JSON.stringify(deps)
  const [result, setResult] = useState<Result<T>>({ key: '' })
  // `load` is a fresh closure on every render; only a change of `key` should start a new request.
  const run = useEffectEvent((signal: AbortSignal) => load(signal))

  useEffect(() => {
    const controller = new AbortController()
    run(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data })
      },
      (error: Error) => {
        if (!controller.signal.aborted) setResult((r) => ({ key, data: r.data, error }))
      },
    )
    return () => controller.abort()
  }, [key])

  return { data: result.data, error: result.key === key ? result.error : undefined, loading: result.key !== key }
}
