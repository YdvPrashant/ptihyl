import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ViewTabs } from './ViewTabs'

test('arrow keys move to the other view and take the focus with them', async () => {
  const onSelect = vi.fn()
  render(
    <ViewTabs selected="day" onSelect={onSelect}>
      panel
    </ViewTabs>,
  )
  screen.getByRole('tab', { name: 'Day-ahead view' }).focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(onSelect).toHaveBeenLastCalledWith('accuracy')
  expect(screen.getByRole('tab', { name: 'Forecast accuracy' })).toHaveFocus()
  await userEvent.keyboard('{ArrowRight}')
  expect(onSelect).toHaveBeenLastCalledWith('day')
})

test('only the open view is a tab stop, and the panel is named after it', () => {
  render(
    <ViewTabs selected="accuracy" onSelect={() => {}}>
      panel
    </ViewTabs>,
  )
  expect(screen.getByRole('tab', { name: 'Forecast accuracy' })).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('tab', { name: 'Day-ahead view' })).toHaveAttribute('tabindex', '-1')
  expect(screen.getByRole('tabpanel', { name: 'Forecast accuracy' })).toHaveTextContent('panel')
})
