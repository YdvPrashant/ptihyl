import { useId, type KeyboardEvent, type ReactNode } from 'react'

import type { Tab } from '../urlState'

const TABS: { id: Tab; label: string }[] = [
  { id: 'day', label: 'Day-ahead view' },
  { id: 'accuracy', label: 'Forecast accuracy' },
]

type Props = { selected: Tab; onSelect: (tab: Tab) => void; children: ReactNode }

/** The two views as tabs, wired the standard way: arrow keys switch view, and only the open tab is a Tab-key stop. */
export function ViewTabs({ selected, onSelect, children }: Props) {
  const id = useId()

  function onKeyDown(e: KeyboardEvent, index: number) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) return
    e.preventDefault()
    const next = TABS[(index + step + TABS.length) % TABS.length].id
    onSelect(next)
    document.getElementById(`${id}-${next}`)?.focus()
  }

  return (
    <>
      <div role="tablist" aria-label="View" className="flex gap-1 border-b border-rule">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            id={`${id}-${t.id}`}
            role="tab"
            aria-selected={selected === t.id}
            aria-controls={`${id}-panel`}
            tabIndex={selected === t.id ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`-mb-px border-b-2 px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-forecast ${
              selected === t.id ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <section role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${selected}`}>
        {children}
      </section>
    </>
  )
}
