import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import type { DayView } from '../api'
import jan15EarlyJson from '../test/day-2026-01-15-0100.json'
import jan15Json from '../test/day-2026-01-15.json'
import { DayAheadView } from './DayAheadView'

const jan15 = jan15Json as DayView
const jan15Early = jan15EarlyJson as DayView

test('explains which forecast run was used', () => {
  render(<DayAheadView day={jan15} />)
  expect(
    screen.getByText(/Forecast for Thursday 15 January, published 14 Jan at 09:30, 20 min before the 09:50 cut-off/),
  ).toBeInTheDocument()
  expect(screen.getByText('1,094 MW')).toBeInTheDocument()
  expect(screen.getByText('Likely range vs forecast')).toBeInTheDocument() // final review I2 wording
})

test('warns about hours with no forecast', () => {
  // Review Focus 2
  render(<DayAheadView day={jan15Early} />)
  expect(screen.getByText(/for 2 hours; they are left blank/)).toBeInTheDocument()
})

test('the bias note counts the hours the forecast was too high', () => {
  render(<DayAheadView day={jan15} />)
  expect(screen.getByText('too high in 24 of 24 hours')).toBeInTheDocument()
})
