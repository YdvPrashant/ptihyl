// Everything is shown in UK time. In January that equals UTC, so formatting pins the zone to UTC
// instead of trusting the viewer's browser (a reviewer in another country would otherwise see shifted hours).
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const wholeNumber = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '')

/** "09:30" */
export function formatUkTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** "14 Jan, 09:30" */
export function formatUkDateTime(iso: string): string {
  return `${dateFormat.format(new Date(iso))}, ${formatUkTime(iso)}`
}

/** "1,094", or "+1,226" when `signed` (table cells, where the unit sits in the column header) */
export function formatNumber(n: number, signed = false): string {
  return `${signed ? sign(n) : n < 0 ? '-' : ''}${wholeNumber.format(Math.abs(n))}`
}

/** "1,728 MW" */
export function formatMW(mw: number): string {
  return `${formatNumber(mw)} MW`
}

/** "+1,728 MW" / "-506 MW" */
export function formatSignedMW(mw: number): string {
  return `${formatNumber(mw, true)} MW`
}

/** "2.0 GW" */
export function formatGW(mw: number): string {
  return `${mw < 0 ? '-' : ''}${(Math.abs(mw) / 1000).toFixed(1)} GW`
}

/** "+1.7 GW" */
export function formatSignedGW(mw: number): string {
  return `${sign(mw)}${(Math.abs(mw) / 1000).toFixed(1)} GW`
}

/** 0.8427 -> "84%" */
export function formatPct(share: number): string {
  return `${Math.round(share * 100)}%`
}
