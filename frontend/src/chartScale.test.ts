import { expect, test } from 'vitest'

import { niceTicks } from './chartScale'

test('ticks run from 0 to the first clean step at or above the max', () => {
  expect(niceTicks(19840, 5000)).toEqual([0, 5000, 10000, 15000, 20000])
  expect(niceTicks(2307, 500)).toEqual([0, 500, 1000, 1500, 2000, 2500])
  expect(niceTicks(0, 1000)).toEqual([0, 1000])
})
