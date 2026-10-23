import { expect, test } from 'vitest'

import type { Meta } from './api'
import metaJson from './test/meta.json'
import { parseUrlState, toSearch, type UrlState } from './urlState'

const meta = metaJson as Meta

test('bad or out-of-window values fall back to defaults', () => {
  // Review Focus 3
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
