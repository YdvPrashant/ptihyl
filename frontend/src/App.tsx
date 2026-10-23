import { useEffect, useState, type ReactNode } from 'react'

import { getMeta, type Meta } from './api'
import { Controls } from './components/Controls'
import { useApi } from './hooks/useApi'
import { isCutoff, isDeliveryDay, parseUrlState, toSearch, type Tab, type UrlState } from './urlState'

const TABS: { id: Tab; label: string }[] = [
  { id: 'day', label: 'Day-ahead view' },
  { id: 'accuracy', label: 'Forecast accuracy' },
]

export default function App() {
  const meta = useApi((signal) => getMeta(signal), [])

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-8">
      <header>
        <h1 className="readout text-5xl leading-none sm:text-6xl">Wind Desk</h1>
        <p className="mt-2 text-muted">Day-ahead wind forecasts for the GB market, January 2026 pilot</p>
      </header>
      <main className="flex flex-1 flex-col gap-6">
        {meta.error ? (
          <p role="alert" className="text-actual">
            The forecast data could not be loaded ({meta.error.message}). Check your connection and reload the page.
          </p>
        ) : meta.data ? (
          <Desk meta={meta.data} />
        ) : (
          <p className="text-muted">Loading the January data…</p>
        )}
      </main>
      <footer className="border-t border-rule pt-4 text-sm text-muted">
        Data: Elexon BMRS (FUELHH, WINDFOR). Times are UK time (GMT, equal to UTC in January).
      </footer>
    </div>
  )
}

function Desk({ meta }: { meta: Meta }) {
  const [state, setState] = useState<UrlState>(() => parseUrlState(window.location.search, meta))
  useEffect(() => window.history.replaceState(null, '', toSearch(state)), [state])
  const update = (patch: Partial<UrlState>) => setState((s) => ({ ...s, ...patch }))

  return (
    <>
      <Controls
        meta={meta}
        date={state.date}
        cutoff={state.cutoff}
        onDateChange={(date) => isDeliveryDay(date, meta) && update({ date })}
        onCutoffChange={(cutoff) => isCutoff(cutoff) && update({ cutoff })}
      />
      <div role="tablist" aria-label="View" className="flex gap-1 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={state.tab === t.id}
            onClick={() => update({ tab: t.id })}
            className={`-mb-px border-b-2 px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-forecast ${
              state.tab === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <TabPanel>{state.tab === 'day' ? 'Day-ahead view' : 'Forecast accuracy'}</TabPanel>
    </>
  )
}

function TabPanel({ children }: { children: ReactNode }) {
  return (
    <section role="tabpanel" className="text-muted">
      {children}
    </section>
  )
}
