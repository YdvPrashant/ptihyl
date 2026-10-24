import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import type { Accuracy } from '../api'
import accuracyJson from '../test/accuracy-0950.json'
import { AccuracyView } from './AccuracyView'

const accuracy = accuracyJson as Accuracy

test('headline numbers', () => {
  render(<AccuracyView data={accuracy} onPickDay={() => {}} />)
  for (const t of ['2.0 GW', '+1.7 GW', '6.9 GW', '-506 MW to +4,189 MW']) expect(screen.getByText(t)).toBeInTheDocument()
  expect(screen.getByText(/too high in 84% of hours/)).toBeInTheDocument()
  expect(screen.getByText(/from 1,996 MW to 1,648 MW \(17% better\)/)).toBeInTheDocument()
  expect(screen.getByText(/in 72% of hours \(target 80%\)/)).toBeInTheDocument()
})

test('says how many hours a cut-off covers when some had no forecast', () => {
  const { rerender } = render(<AccuracyView data={accuracy} onPickDay={() => {}} />)
  expect(screen.queryByText(/based on/i)).not.toBeInTheDocument()
  rerender(<AccuracyView data={{ ...accuracy, summary: { ...accuracy.summary, hours: 700 } }} onPickDay={() => {}} />)
  expect(screen.getByText(/Based on 700 of 744 hours/)).toBeInTheDocument()
})

test('a delivery day in the numbers table opens that day', async () => {
  const onPickDay = vi.fn()
  render(<AccuracyView data={accuracy} onPickDay={onPickDay} />)
  await userEvent.click(screen.getByRole('button', { name: 'Open 2 Jan' }))
  expect(onPickDay).toHaveBeenCalledWith('2026-01-02')
})
