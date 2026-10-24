import { expect, test } from 'vitest'

import type { Meta } from './api'
import metaJson from './test/meta.json'
import { parseUrlState, shiftDay, toSearch, type UrlState } from './urlState'

const meta = metaJson as Meta

test('bad or out-of-window values fall back to defaults', () => {
  expect(parseUrlState('?date=2026-03-01&cutoff=25:00&tab=x', meta)).toEqual({
    date: '2026-01-02',
    cutoff: '09:50',
    tab: 'day',
  })
})

test('valid state round-trips through the URL', () => {
  const s: UrlState = { date: '2026-01-20', cutoff: '15:30', tab: 'accuracy' }
  expect(parseUrlState(toSearch(s), meta)).toEqual(s)
})

test('impossible calendar dates fall back too', () => {
  expect(parseUrlState('?date=2026-01-32', meta).date).toBe('2026-01-02')
})

test('shared links keep the cut-off readable', () => {
  expect(toSearch({ date: '2026-01-20', cutoff: '15:30', tab: 'accuracy' })).toBe(
    '?date=2026-01-20&cutoff=15:30&tab=accuracy',
  )
})

test('stepping a day crosses month ends', () => {
  expect(shiftDay('2026-01-31', 1)).toBe('2026-02-01')
  expect(shiftDay('2026-01-02', -1)).toBe('2026-01-01')
})
