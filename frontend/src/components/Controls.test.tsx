import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import type { Meta } from '../api'
import metaJson from '../test/meta.json'
import { Controls } from './Controls'

const meta = metaJson as Meta
const noop = () => {}

test('limits the date picker to the pilot window and defaults to 09:50', () => {
  render(<Controls meta={meta} date="2026-01-02" cutoff="09:50" onDateChange={noop} onCutoffChange={noop} />)
  const day = screen.getByLabelText(/delivery day/i)
  expect(day).toHaveAttribute('min', '2026-01-02')
  expect(day).toHaveAttribute('max', '2026-02-01')
  expect(screen.getByLabelText(/decision cut-off/i)).toHaveValue('09:50')
})

test('choosing a preset reports the new cut-off', async () => {
  const onCutoffChange = vi.fn()
  render(<Controls meta={meta} date="2026-01-02" cutoff="09:50" onDateChange={noop} onCutoffChange={onCutoffChange} />)
  await userEvent.selectOptions(screen.getByLabelText(/decision cut-off/i), '15:30')
  expect(onCutoffChange).toHaveBeenCalledWith('15:30')
})

test('previous and next buttons step one day and stop at the window edges', async () => {
  const onDateChange = vi.fn()
  render(<Controls meta={meta} date="2026-01-02" cutoff="09:50" onDateChange={onDateChange} onCutoffChange={noop} />)
  expect(screen.getByRole('button', { name: 'Previous day' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
  expect(onDateChange).toHaveBeenCalledWith('2026-01-03')
})

test('typing a day keeps a half-typed value that is outside the window', () => {
  // Typing 01/02/2026 passes through 1 Jan, outside the window, on its way to 1 Feb.
  const onDateChange = vi.fn()
  render(<Controls meta={meta} date="2026-01-20" cutoff="09:50" onDateChange={onDateChange} onCutoffChange={noop} />)
  const day = screen.getByLabelText(/delivery day/i)
  fireEvent.change(day, { target: { value: '2026-01-01' } })
  expect(day).toHaveValue('2026-01-01')
  fireEvent.change(day, { target: { value: '2026-02-01' } })
  expect(onDateChange).toHaveBeenLastCalledWith('2026-02-01')
})

test('leaving the day box with an unusable day shows the chosen day again', () => {
  render(<Controls meta={meta} date="2026-01-20" cutoff="09:50" onDateChange={noop} onCutoffChange={noop} />)
  const day = screen.getByLabelText(/delivery day/i)
  fireEvent.change(day, { target: { value: '2026-01-01' } })
  fireEvent.blur(day)
  expect(day).toHaveValue('2026-01-20')
})
