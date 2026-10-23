import { expect, test } from 'vitest'

import {
  formatGW,
  formatMW,
  formatNumber,
  formatPct,
  formatSignedGW,
  formatSignedMW,
  formatUkDateTime,
  formatUkTime,
} from './format'

test('times stay in UK time when the browser is in India', () => {
  // Review Focus 1
  expect(new Date('2026-01-15T09:30:00Z').getHours()).toBe(15) // proves TZ=Asia/Kolkata is active
  expect(formatUkTime('2026-01-15T09:30:00Z')).toBe('09:30')
  expect(formatUkDateTime('2026-01-14T09:30:00Z')).toBe('14 Jan, 09:30')
})

test('numbers', () => {
  expect([formatMW(1728), formatSignedMW(1728), formatSignedMW(-506)]).toEqual(['1,728 MW', '+1,728 MW', '-506 MW'])
  expect([formatGW(1996), formatSignedGW(1728), formatPct(0.8427), formatPct(0.7151)]).toEqual([
    '2.0 GW',
    '+1.7 GW',
    '84%',
    '72%',
  ])
})

test('plain numbers for table cells', () => {
  expect([formatNumber(1094), formatNumber(-506), formatNumber(1226, true), formatNumber(0, true)]).toEqual([
    '1,094',
    '-506',
    '+1,226',
    '0',
  ])
})
