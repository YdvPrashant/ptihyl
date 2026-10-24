import { renderHook, waitFor } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useApi } from './useApi'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

test('a slow older response never overwrites a newer one', async () => {
  const slow = deferred<string>()
  const fast = deferred<string>()
  const { result, rerender } = renderHook(({ k }) => useApi(() => (k === 1 ? slow.promise : fast.promise), [k]), {
    initialProps: { k: 1 },
  })
  rerender({ k: 2 })
  fast.resolve('new')
  await waitFor(() => expect(result.current.data).toBe('new'))
  slow.resolve('old')
  await new Promise((r) => setTimeout(r, 0))
  expect(result.current.data).toBe('new')
})
