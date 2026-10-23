// Field-for-field mirror of backend/app/schemas.py. MW values are whole numbers; shares are 0..1 fractions.

export type Preset = { id: string; label: string; time: string }

export type Meta = {
  delivery_first: string
  delivery_last: string
  default_cutoff: string
  presets: Preset[]
  fetched_at: string
  source: string
}

export type Summary = {
  hours: number
  mean_actual: number
  mae: number
  mae_pct: number
  bias: number
  rmse: number
  share_over: number
  p10: number
  p90: number
  worst: number
}

export type Accuracy = {
  cutoff: string
  window_first: string
  window_last: string
  summary: Summary
  adjusted: { mae: number; improvement: number }
  band_coverage: number
  daily: { date: string; mae: number; bias: number }[]
  by_lead_time: { label: string; lo: number; hi: number; mae: number; n: number }[]
  histogram: { lo: number; hi: number; count: number }[]
}

export type Hour = {
  time: string
  forecast: number | null
  actual: number | null
  low: number | null
  high: number | null
  adjusted: number | null
  lead_hours: number | null
  published: string | null
}

export type DayStats = { hours_with_forecast: number; mae: number | null; bias: number | null; worst: number | null }

export type Band = { p10: number; p90: number; bias: number; days_of_history: number }

export type DayView = {
  date: string
  cutoff: string
  runs_used: string[]
  hours: Hour[]
  stats: DayStats
  band: Band | null
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new ApiError(response.status, typeof body?.detail === 'string' ? body.detail : `Request failed (${response.status})`)
  }
  return (await response.json()) as T
}

export const getMeta = (signal?: AbortSignal) => get<Meta>('/api/meta', signal)

export const getAccuracy = (cutoff: string, signal?: AbortSignal) =>
  get<Accuracy>(`/api/accuracy?${new URLSearchParams({ cutoff })}`, signal)

export const getDay = (date: string, cutoff: string, signal?: AbortSignal) =>
  get<DayView>(`/api/day?${new URLSearchParams({ date, cutoff })}`, signal)
