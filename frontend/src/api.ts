import { useCallback, useEffect, useState } from 'react'
import { paths } from './routes'

export class ApiError extends Error {
  status: number
  // Field errors from Django REST framework: { field: ["message"] } or { detail: "message" }.
  fields: Record<string, string[]>

  constructor(status: number, data: unknown) {
    const record = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    super(typeof record.detail === 'string' ? record.detail : `Request failed (${status})`)
    this.status = status
    this.fields = Object.fromEntries(
      Object.entries(record)
        .filter(([key]) => key !== 'detail')
        .map(([key, value]) => [key, Array.isArray(value) ? value.map(String) : [String(value)]]),
    )
  }
}

export function csrfToken() {
  return document.cookie.match(/(?:^|; )csrftoken=([^;]+)/)?.[1] ?? ''
}

type Options = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; json?: unknown; form?: FormData }

/** Calls /api/app/<path>. A 401 means the session ended: go and sign in, then come back here. */
export async function api<T>(path: string, { method = 'GET', json, form }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (method !== 'GET') headers['X-CSRFToken'] = csrfToken()
  if (json !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`/api/app/${path}`, {
    method,
    headers,
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    credentials: 'same-origin',
  })

  if (response.status === 401) {
    const next = window.location.pathname + window.location.search
    window.location.assign(`${paths.signIn}?next=${encodeURIComponent(next)}`)
    return new Promise<T>(() => {}) // the page is leaving; never settle
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, data)
  return data as T
}

/**
 * Loads a GET endpoint (nothing when path is null). Reloading keeps the current data on screen;
 * a different path starts empty, so one room never flashes up while another loads.
 */
export function useApi<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string; data?: T; error?: ApiError }>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (path === null) return
    let live = true
    api<T>(path).then(
      (data) => live && setResult({ path, data }),
      // A failed background reload keeps what's on screen rather than blanking the page.
      (error: ApiError) => live && setResult((prev) => (prev?.path === path && prev.data ? prev : { path, error })),
    )
    return () => {
      live = false
    }
  }, [path, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const current = result?.path === path ? result : undefined
  return { data: current?.data, error: current?.error, reload }
}
