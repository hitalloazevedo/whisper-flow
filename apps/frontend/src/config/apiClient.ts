import { apiUrl } from './api'

export interface ApiRequestOptions extends RequestInit {
  traceId?: string
}

export function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { traceId, ...init } = options
  const headers = new Headers(init.headers)
  if (traceId) headers.set('X-Trace-Id', traceId)
  return fetch(apiUrl(path), { ...init, headers })
}
