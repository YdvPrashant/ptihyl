export function MethodNote() {
  return (
    <section className="flex max-w-3xl flex-col gap-2 border-t border-rule pt-6">
      <h3 className="font-semibold">How these numbers are worked out</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-muted">
        <li>
          Data: national wind output (Elexon FUELHH, wind only) and the national wind forecast (Elexon WINDFOR).
          Nothing else.
        </li>
        <li>
          The forecast that counts: for each hour of a delivery day, the newest forecast published before the cut-off
          on the day before. Anything published later arrived too late to use.
        </li>
        <li>
          Forecasts are hourly, so each one is compared with the actual output for the half-hour starting on that hour.
          Error is forecast minus actual; positive means the forecast was too high.
        </li>
        <li>
          No hindsight: the likely range and the bias adjustment only use errors the team already knew at the cut-off,
          from the 7 days ending two days before delivery. Late-December data is included so early-January days have
          that history too.
        </li>
        <li>Times are UK time (GMT, which equals UTC in January).</li>
      </ul>
    </section>
  )
}
