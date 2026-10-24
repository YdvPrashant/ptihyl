import { useState } from 'react'

import type { DayView } from '../api'
import { formatMW, formatNumber, formatSignedMW, formatUkDate, formatUkLongDate, formatUkTime } from '../format'
import { theme } from '../theme'
import { DayChart } from './DayChart'
import { KpiTile } from './KpiTile'

export function DayAheadView({ day }: { day: DayView }) {
  const [showAdjusted, setShowAdjusted] = useState(false)
  const cutoff = formatUkTime(day.cutoff)
  const latestRun = day.runs_used.at(-1)
  const missing = 24 - day.stats.hours_with_forecast
  const delivery = formatUkLongDate(day.date)

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg">
        {latestRun
          ? `Forecast for ${delivery}, published ${formatUkDate(latestRun)} at ${formatUkTime(latestRun)}, ${minutesBetween(latestRun, day.cutoff)} min before the ${cutoff} cut-off.`
          : `No forecast for ${delivery} was published before the ${cutoff} cut-off.`}
      </p>

      <div className="flex flex-wrap gap-y-6">
        <KpiTile
          label="Typical miss"
          value={day.stats.mae === null ? 'n/a' : formatMW(day.stats.mae)}
          note="average size of the error this day"
        />
        <KpiTile
          label="Bias"
          value={day.stats.bias === null ? 'n/a' : formatSignedMW(day.stats.bias)}
          note={leanNote(day)}
        />
        <KpiTile
          label="Worst hour"
          value={day.stats.worst === null ? 'n/a' : formatMW(day.stats.worst)}
          note="largest single-hour miss"
        />
        <KpiTile
          label="Likely range vs forecast"
          wide
          value={day.band ? `${formatSignedMW(-day.band.p90)} to ${formatSignedMW(-day.band.p10)}` : 'n/a'}
          note="how far the actual usually lands from the forecast, based on the last 7 days of errors"
        />
      </div>

      {missing > 0 && (
        <p role="status" className="border-l-2 border-actual pl-3">
          No forecast was published before the cut-off for {missing} hours; they are left blank.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legend">
          <LegendItem swatch={<span className="block h-0.5 w-5" style={{ background: theme.forecast }} />} label="Day-ahead forecast" />
          <LegendItem swatch={<span className="block h-3 w-5" style={{ background: theme.forecast, opacity: 0.12 }} />} label="Likely range" />
          <LegendItem swatch={<span className="block h-0.5 w-5" style={{ background: theme.actual }} />} label="Actual output" />
          {showAdjusted && (
            <LegendItem
              swatch={<span className="block w-5 border-t-2 border-dashed" style={{ borderColor: theme.ink }} />}
              label="Bias-adjusted forecast"
            />
          )}
        </ul>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showAdjusted} onChange={(e) => setShowAdjusted(e.target.checked)} />
          Show bias-adjusted forecast
        </label>
      </div>

      <DayChart hours={day.hours} showAdjusted={showAdjusted} />

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show the hourly numbers</summary>
        <table className="mt-3 w-full text-left tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 font-medium">Hour</th>
              <th className="py-1 font-medium">Forecast (MW)</th>
              <th className="py-1 font-medium">Likely range (MW)</th>
              <th className="py-1 font-medium">Actual (MW)</th>
              <th className="py-1 font-medium">Error (MW)</th>
            </tr>
          </thead>
          <tbody>
            {day.hours.map((h) => (
              <tr key={h.time} className="border-t border-rule">
                <td className="py-1">{formatUkTime(h.time)}</td>
                <td className="py-1">{h.forecast === null ? '–' : formatNumber(h.forecast)}</td>
                <td className="py-1">
                  {h.low === null || h.high === null ? '–' : `${formatNumber(h.low)} to ${formatNumber(h.high)}`}
                </td>
                <td className="py-1">{h.actual === null ? '–' : formatNumber(h.actual)}</td>
                <td className="py-1">
                  {h.forecast === null || h.actual === null ? '–' : formatNumber(h.forecast - h.actual, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function LegendItem({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden>{swatch}</span>
      {label}
    </li>
  )
}

/** "too high in 24 of 24 hours": how many hours landed on the side the day's bias leans to. */
function leanNote(day: DayView): string | undefined {
  const errors = day.hours.flatMap((h) => (h.forecast === null || h.actual === null ? [] : [h.forecast - h.actual]))
  if (day.stats.bias === null || errors.length === 0) return undefined
  const high = day.stats.bias >= 0
  const count = errors.filter((e) => (high ? e > 0 : e < 0)).length
  return `too ${high ? 'high' : 'low'} in ${count} of ${errors.length} hours`
}

function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 60000)
}
