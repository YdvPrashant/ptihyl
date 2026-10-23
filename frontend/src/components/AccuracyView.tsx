import type { Accuracy } from '../api'
import { formatGW, formatMW, formatNumber, formatPct, formatSignedGW, formatSignedMW, formatUkDate } from '../format'
import { DailyChart, ErrorHistogram, LeadTimeChart } from './AccuracyCharts'
import { KpiTile } from './KpiTile'
import { MethodNote } from './MethodNote'

export function AccuracyView({ data }: { data: Accuracy }) {
  const s = data.summary

  return (
    <div className="flex flex-col gap-8">
      <p className="text-lg">
        Day-ahead forecasts for delivery from {formatUkDate(data.window_first)} to {formatUkDate(data.window_last)} 2026,
        using the newest run published before the {data.cutoff} cut-off.
      </p>

      <div className="flex flex-wrap gap-y-6">
        <KpiTile label="Typical miss" value={formatGW(s.mae)} note={`${formatPct(s.mae_pct)} of average output`} />
        <KpiTile
          label={s.bias >= 0 ? 'Leans high' : 'Leans low'}
          value={formatSignedGW(s.bias)}
          note={`forecast too high in ${formatPct(s.share_over)} of hours`}
        />
        <KpiTile
          label="8 in 10 hours"
          wide
          value={`${formatSignedMW(s.p10)} to ${formatSignedMW(s.p90)}`}
          note="range of the error in the middle 80% of hours"
        />
        <KpiTile label="Worst miss" value={formatGW(s.worst)} note="largest single-hour error" />
      </div>

      <div className="flex max-w-3xl flex-col gap-1 border-l-2 border-forecast pl-4">
        <p>
          Subtracting last week's average error would have cut the typical miss from {formatMW(s.mae)} to{' '}
          {formatMW(data.adjusted.mae)} ({formatPct(data.adjusted.improvement)} better).
        </p>
        <p className="text-muted">
          The likely-range band contained the actual output in {formatPct(data.band_coverage)} of hours (target 80%).
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <LeadTimeChart data={data.by_lead_time} />
        <ErrorHistogram data={data.histogram} p10={s.p10} p90={s.p90} />
      </div>
      <DailyChart data={data.daily} />

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show the numbers behind the charts</summary>
        <div className="mt-3 grid gap-6 tabular-nums md:grid-cols-3">
          <SmallTable
            caption="By lead time"
            head={['Ahead', 'Typical miss (MW)', 'Forecasts']}
            rows={data.by_lead_time.map((b) => [b.label, formatNumber(b.mae), formatNumber(b.n)])}
          />
          <SmallTable
            caption="By error size"
            head={['Error (MW)', 'Hours']}
            rows={data.histogram.map((b) => [`${formatNumber(b.lo, true)} to ${formatNumber(b.hi, true)}`, String(b.count)])}
          />
          <SmallTable
            caption="By delivery day"
            head={['Day', 'Typical miss (MW)', 'Bias (MW)']}
            rows={data.daily.map((d) => [formatUkDate(d.date), formatNumber(d.mae), formatNumber(d.bias, true)])}
          />
        </div>
      </details>

      <MethodNote />
    </div>
  )
}

function SmallTable({ caption, head, rows }: { caption: string; head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-left">
      <caption className="mb-1 text-left font-semibold">{caption}</caption>
      <thead className="text-muted">
        <tr>
          {head.map((h) => (
            <th key={h} className="py-1 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]} className="border-t border-rule">
            {r.map((cell, i) => (
              <td key={i} className="py-1">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
