type Props = { label: string; value: string; note?: string }

/** One readout in a row of readouts: plain label, big condensed value, optional one-line explanation. */
export function KpiTile({ label, value, note }: Props) {
  return (
    <div className="flex min-w-40 flex-1 flex-col gap-1 border-l border-rule pl-4 first:border-l-0 first:pl-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="readout text-3xl leading-tight sm:text-4xl">{value}</span>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  )
}
