import type { Meta } from './api'

export type Tab = 'day' | 'accuracy'
export type UrlState = { date: string; cutoff: string; tab: Tab }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const CUTOFF = /^([01]\d|2[0-3]):[0-5]\d$/

/** "2026-01-32" has the right shape but is not a real day; parsing and re-printing it exposes that. */
function isCalendarDate(date: string): boolean {
  const d = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date
}

export function isDeliveryDay(date: string, meta: Meta): boolean {
  return DATE.test(date) && isCalendarDate(date) && date >= meta.delivery_first && date <= meta.delivery_last
}

/** "2026-01-31", 1 -> "2026-02-01" */
export function shiftDay(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function isCutoff(cutoff: string): boolean {
  return CUTOFF.test(cutoff)
}

/** Read the shareable view state from a query string, falling back to defaults for anything invalid. */
export function parseUrlState(search: string, meta: Meta): UrlState {
  const params = new URLSearchParams(search)
  const date = params.get('date') ?? ''
  const cutoff = params.get('cutoff') ?? ''
  return {
    date: isDeliveryDay(date, meta) ? date : meta.delivery_first,
    cutoff: isCutoff(cutoff) ? cutoff : meta.default_cutoff,
    tab: params.get('tab') === 'accuracy' ? 'accuracy' : 'day',
  }
}

/** "?date=2026-01-20&cutoff=15:30&tab=accuracy": the colon is legal in a query, so links stay readable. */
export function toSearch(state: UrlState): string {
  return `?${new URLSearchParams(state)}`.replaceAll('%3A', ':')
}
