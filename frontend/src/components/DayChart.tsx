import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Hour } from '../api'
import { formatMW, formatUkTime } from '../format'
import { theme } from '../theme'

type Row = {
  hour: string
  forecast: number | null
  actual: number | null
  adjusted: number | null
  range: [number, number] | null
}

const compactMW = (v: number) => (v === 0 ? '0' : `${v / 1000}K`)

export function DayChart({ hours, showAdjusted }: { hours: Hour[]; showAdjusted: boolean }) {
  const rows: Row[] = hours.map((h) => ({
    hour: formatUkTime(h.time),
    forecast: h.forecast,
    actual: h.actual,
    adjusted: h.adjusted,
    range: h.low !== null && h.high !== null ? [h.low, h.high] : null,
  }))
  const line = { type: 'monotone', strokeWidth: 2, dot: false, connectNulls: false, isAnimationActive: false } as const
  const activeDot = { r: 4, strokeWidth: 2, stroke: theme.paper }

  return (
    <ResponsiveContainer width="100%" height={340} initialDimension={{ width: 800, height: 340 }}>
      <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.rule} />
        <XAxis dataKey="hour" interval={2} tick={{ fill: theme.muted, fontSize: 12 }} tickLine={false} stroke={theme.rule} />
        <YAxis
          tickFormatter={compactMW}
          tick={{ fill: theme.muted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={40}
          label={{ value: 'MW', position: 'insideTopLeft', dy: -8, fill: theme.muted, fontSize: 12 }}
        />
        <Tooltip content={<DayTooltip showAdjusted={showAdjusted} />} cursor={{ stroke: theme.muted, strokeWidth: 1 }} />
        <Area
          dataKey="range"
          fill={theme.forecast}
          fillOpacity={0.12}
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
          activeDot={false}
        />
        <Line {...line} dataKey="forecast" stroke={theme.forecast} activeDot={activeDot} />
        <Line {...line} dataKey="actual" stroke={theme.actual} activeDot={activeDot} />
        {showAdjusted && <Line {...line} dataKey="adjusted" stroke={theme.ink} strokeDasharray="6 4" activeDot={activeDot} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

type TooltipProps = { active?: boolean; payload?: { payload: Row }[]; showAdjusted: boolean }

function DayTooltip({ active, payload, showAdjusted }: TooltipProps) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  const lines: [string, string, string][] = [
    [theme.forecast, 'Forecast', row.forecast === null ? 'none before cut-off' : formatMW(row.forecast)],
    [theme.forecast, 'Likely range', row.range ? `${formatMW(row.range[0])} to ${formatMW(row.range[1])}` : 'n/a'],
    [theme.actual, 'Actual', row.actual === null ? 'not available' : formatMW(row.actual)],
  ]
  if (showAdjusted && row.adjusted !== null) lines.push([theme.ink, 'Bias-adjusted', formatMW(row.adjusted)])
  return (
    <div className="rounded-md border border-rule bg-white px-3 py-2 text-sm shadow-sm">
      <p className="mb-1 font-semibold">{row.hour}</p>
      {lines.map(([color, label, value]) => (
        <p key={label} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3" style={{ background: color }} aria-hidden />
          <span className="text-muted">{label}</span>
          <span className="ml-auto pl-3 tabular-nums">{value}</span>
        </p>
      ))}
    </div>
  )
}
