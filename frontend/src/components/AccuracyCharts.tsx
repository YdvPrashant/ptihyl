import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Accuracy } from '../api'
import { niceTicks } from '../chartScale'
import { formatCompactMW, formatMW, formatNumber, formatUkDate } from '../format'
import { theme } from '../theme'

const axis = { tick: { fill: theme.muted, fontSize: 12 }, tickLine: false } as const
const bar = { radius: [4, 4, 0, 0] as [number, number, number, number], maxBarSize: 24, isAnimationActive: false }

function ChartFrame({ title, caption, children }: { title: string; caption: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted">{caption}</p>
      </figcaption>
      <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 800, height: 240 }}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </figure>
  )
}

function BarTooltip({ active, payload, describe }: { active?: boolean; payload?: { payload: object }[]; describe: (row: never) => string }) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null
  return <div className="rounded-md border border-rule bg-white px-3 py-2 text-sm shadow-sm">{describe(row as never)}</div>
}

type Lead = Accuracy['by_lead_time'][number]
type Day = Accuracy['daily'][number]
type Bin = Accuracy['histogram'][number]

export function LeadTimeChart({ data }: { data: Accuracy['by_lead_time'] }) {
  const leadTicks = niceTicks(Math.max(...data.map((b) => b.mae)), 500)
  return (
    <ChartFrame
      title="Typical miss by how far ahead the forecast was made"
      caption="Uses every forecast run for the pilot's hours, so it is the same for every cut-off."
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.rule} />
        <XAxis dataKey="label" {...axis} stroke={theme.rule} />
        <YAxis ticks={leadTicks} domain={[0, leadTicks.at(-1) ?? 0]} tickFormatter={formatCompactMW} {...axis} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: theme.rule, opacity: 0.4 }}
          content={<BarTooltip describe={(r: Lead) => `${r.label} ahead: typical miss ${formatMW(r.mae)} (${formatNumber(r.n)} forecasts)`} />}
        />
        <Bar dataKey="mae" fill={theme.forecast} {...bar} />
      </BarChart>
    </ChartFrame>
  )
}

export function ErrorHistogram({ data, p10, p90 }: { data: Accuracy['histogram']; p10: number; p90: number }) {
  return (
    <ChartFrame
      title="How big the errors were"
      caption="Hours by error size, in 500 MW steps. Right of 0 means the forecast was too high. The darker bars hold the middle 80% of hours."
    >
      <BarChart data={data} barCategoryGap={2} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.rule} />
        <XAxis dataKey="lo" tickFormatter={formatCompactMW} {...axis} stroke={theme.rule} interval={1} />
        <YAxis {...axis} axisLine={false} width={40} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: theme.rule, opacity: 0.4 }}
          content={<BarTooltip describe={(r: Bin) => `${formatNumber(r.lo, true)} to ${formatNumber(r.hi, true)} MW: ${r.count} hours`} />}
        />
        <Bar dataKey="count" {...bar}>
          {data.map((b) => (
            <Cell key={b.lo} fill={b.hi > p10 && b.lo <= p90 ? theme.forecast : theme.rule} />
          ))}
        </Bar>
        {/* Bins are categories, so the line for an error of 0 sits at the left edge of the bin that starts at 0. */}
        <ReferenceLine x={0} position="start" stroke={theme.ink} />
      </BarChart>
    </ChartFrame>
  )
}

export function DailyChart({ data, onPickDay }: { data: Accuracy['daily']; onPickDay: (date: string) => void }) {
  const dayTicks = niceTicks(Math.max(...data.map((d) => d.mae)), 1000)
  return (
    <ChartFrame title="Typical miss on each delivery day" caption="Average size of the hourly error, per day. Click a day to open it.">
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        className="cursor-pointer"
        onClick={(state) => {
          const date = data[Number(state.activeTooltipIndex)]?.date
          if (date) onPickDay(date)
        }}
      >
        <CartesianGrid vertical={false} stroke={theme.rule} />
        <XAxis dataKey="date" tickFormatter={formatUkDate} {...axis} stroke={theme.rule} interval={4} />
        <YAxis ticks={dayTicks} domain={[0, dayTicks.at(-1) ?? 0]} tickFormatter={formatCompactMW} {...axis} axisLine={false} width={40} />
        <Tooltip
          cursor={{ fill: theme.rule, opacity: 0.4 }}
          content={<BarTooltip describe={(r: Day) => `${formatUkDate(r.date)}: typical miss ${formatMW(r.mae)}, bias ${formatNumber(r.bias, true)} MW`} />}
        />
        <Bar dataKey="mae" fill={theme.forecast} {...bar} />
      </BarChart>
    </ChartFrame>
  )
}
