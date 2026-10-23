type Props = { label: string; value: string; note?: string; wide?: boolean }

/** One readout in a row of readouts: plain label, big condensed value, optional one-line explanation.
 * `wide` gives ranges like "-506 MW to +4,189 MW" room to stay on one line. */
export function KpiTile({ label, value, note, wide = false }: Props) {
  return (
    <div
      className={`flex min-w-40 flex-col gap-1 border-l border-rule pl-4 first:border-l-0 first:pl-0 ${wide ? 'flex-[1.7]' : 'flex-1'}`}
    >
      <span className="text-sm text-muted">{label}</span>
      <span className="readout text-3xl leading-tight sm:text-4xl">{value}</span>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  )
}
