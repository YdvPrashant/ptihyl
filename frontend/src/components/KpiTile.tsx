import type { ReactNode } from 'react'

type Props = { label: string; value: string; note?: string; wide?: boolean }

/** One readout in a row of readouts: plain label, big condensed value, optional one-line explanation.
 * `wide` gives ranges like "-506 MW to +4,189 MW" room to stay on one line. */
export function KpiTile({ label, value, note, wide = false }: Props) {
  return (
    <div className={`flex min-w-40 flex-col gap-1 border-l border-rule pl-4 ${wide ? 'flex-[1.7]' : 'flex-1'}`}>
      <span className="text-sm text-muted">{label}</span>
      <span className="readout text-3xl leading-tight sm:text-4xl">{value}</span>
      {note && <span className="text-sm text-muted">{note}</span>}
    </div>
  )
}

/** Readouts side by side with a rule between them. The row starts 17px further left (one tile's rule and padding)
 * and the wrapper clips that strip, so whichever tile starts a line, also after wrapping on a phone, sits flush. */
export function KpiRow({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden">
      <div className="-ml-[17px] flex flex-wrap gap-y-6">{children}</div>
    </div>
  )
}
