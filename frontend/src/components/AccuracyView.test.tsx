import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import type { Accuracy } from '../api'
import accuracyJson from '../test/accuracy-0950.json'
import { AccuracyView } from './AccuracyView'

const accuracy = accuracyJson as Accuracy

test('headline numbers', () => {
  render(<AccuracyView data={accuracy} />)
  for (const t of ['2.0 GW', '+1.7 GW', '6.9 GW', '-506 MW to +4,189 MW']) expect(screen.getByText(t)).toBeInTheDocument()
  expect(screen.getByText(/too high in 84% of hours/)).toBeInTheDocument()
  expect(screen.getByText(/from 1,996 MW to 1,648 MW \(17% better\)/)).toBeInTheDocument()
  expect(screen.getByText(/in 72% of hours \(target 80%\)/)).toBeInTheDocument()
})
