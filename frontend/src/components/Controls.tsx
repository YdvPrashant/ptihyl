import { useId, useState } from 'react'

import type { Meta } from '../api'
import { shiftDay } from '../urlState'

type Props = {
  meta: Meta
  date: string
  cutoff: string
  onDateChange: (date: string) => void
  onCutoffChange: (cutoff: string) => void
}

const CUSTOM = 'custom'
const field = 'flex flex-col gap-1 text-sm text-muted'
const input =
  'rounded-md border border-rule bg-white px-3 py-2 text-base text-ink tabular-nums focus-visible:outline-2 focus-visible:outline-forecast'
const step = `${input} hover:border-ink disabled:opacity-40 disabled:hover:border-rule`

/**
 * What a native date or time box shows. While someone types, it passes through values the app won't take (typing
 * 01/02/2026 goes via 1 Jan, outside the window); showing `value` then would snap the box back mid-typing. So the
 * box keeps the typed text until `value` changes, or until `reset` puts `value` back.
 */
function useTyped(value: string) {
  const [typed, setTyped] = useState({ value, text: value })
  const text = typed.value === value ? typed.text : value
  return {
    text,
    type: (next: string) => setTyped({ value, text: next }),
    reset: () => setTyped({ value, text: value }),
  }
}

export function Controls({ meta, date, cutoff, onDateChange, onCutoffChange }: Props) {
  const isPreset = meta.presets.some((p) => p.time === cutoff)
  const [customChosen, setCustomChosen] = useState(!isPreset)
  const selected = customChosen || !isPreset ? CUSTOM : cutoff
  const dayId = useId()
  const day = useTyped(date)
  const customTime = useTyped(cutoff)

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className={field}>
        <label htmlFor={dayId}>Delivery day</label>
        <div className="flex gap-1">
          <button
            type="button"
            className={step}
            aria-label="Previous day"
            disabled={date <= meta.delivery_first}
            onClick={() => onDateChange(shiftDay(date, -1))}
          >
            ‹
          </button>
          <input
            id={dayId}
            type="date"
            className={input}
            min={meta.delivery_first}
            max={meta.delivery_last}
            value={day.text}
            onChange={(e) => {
              day.type(e.target.value)
              if (e.target.value) onDateChange(e.target.value)
            }}
            onBlur={day.reset}
          />
          <button
            type="button"
            className={step}
            aria-label="Next day"
            disabled={date >= meta.delivery_last}
            onClick={() => onDateChange(shiftDay(date, 1))}
          >
            ›
          </button>
        </div>
      </div>
      <label className={field}>
        Decision cut-off (day before)
        <select
          className={input}
          value={selected}
          onChange={(e) => {
            const value = e.target.value
            setCustomChosen(value === CUSTOM)
            if (value !== CUSTOM) onCutoffChange(value)
          }}
        >
          {meta.presets.map((p) => (
            <option key={p.id} value={p.time}>
              {p.time} ({p.label})
            </option>
          ))}
          <option value={CUSTOM}>Custom time…</option>
        </select>
      </label>
      {selected === CUSTOM && (
        <label className={field}>
          Custom cut-off
          <input
            type="time"
            className={input}
            value={customTime.text}
            onChange={(e) => {
              customTime.type(e.target.value)
              if (e.target.value) onCutoffChange(e.target.value)
            }}
            onBlur={customTime.reset}
          />
        </label>
      )}
    </div>
  )
}
