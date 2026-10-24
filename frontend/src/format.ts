// Everything is shown in UK time. In January that equals UTC, so formatting pins the zone to UTC
// instead of trusting the viewer's browser (a reviewer in another country would otherwise see shifted hours).
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' })
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDateFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
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

/** 20 -> "20 min", 150 -> "2 h 30 min" */
export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

/** 0.8427 -> "84%" */
export function formatPct(share: number): string {
  return `${Math.round(share * 100)}%`
}

/** Axis ticks: 0, 5K, -2K, 2.5K */
export function formatCompactMW(mw: number): string {
  return mw === 0 ? '0' : `${mw / 1000}K`
}

/** "2026-01-02" -> "2 Jan" */
export function formatUkDate(isoDate: string): string {
  return dateFormat.format(new Date(isoDate))
}

/** "2026-01-15" -> "Thursday 15 January" */
export function formatUkLongDate(isoDate: string): string {
  return longDateFormat.format(new Date(isoDate))
}
