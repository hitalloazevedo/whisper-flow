import { useEffect, useState } from 'react'
import { apiUrl } from '../config/api'
import type { HealthResponse } from '../types'

const REFRESH_INTERVAL_MS = 10_000

function formatLastSeen(iso: string) {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString()
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status}`}>{status}</span>
}

function isHealthResponse(body: unknown): body is HealthResponse {
  if (typeof body !== 'object' || body === null) return false
  const checks = (body as { checks?: unknown }).checks
  if (typeof checks !== 'object' || checks === null) return false
  const { database, storage, workers } = checks as Record<string, unknown>
  return typeof database === 'object' && typeof storage === 'object' && typeof workers === 'object'
}

export function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(apiUrl('/api/v1/health'), { signal: controller.signal })
        const body: unknown = await response.json()
        if (cancelled) return
        if (!isHealthResponse(body)) throw new Error('Unexpected health response shape')
        setHealth(body)
        setError(null)
        setLastCheckedAt(new Date())
      } catch (cause: unknown) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cancelled) return
        setError('Could not reach the API, or it returned an unexpected response')
        setLastCheckedAt(new Date())
      }
    }

    void load()
    const interval = setInterval(() => void load(), REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  return (
    <main className="health-page">
      <header className="health-page-header">
        <h1>whisper flow status</h1>
        {health && <StatusBadge status={health.status} />}
      </header>

      {error && <p className="health-error">{error}</p>}

      {health && (
        <div className="health-grid">
          <section className="health-card health-card-wide">
            <h2>
              Workers
              <span className="health-card-subtitle">
                {health.checks.workers.online} / {health.checks.workers.total} online
              </span>
            </h2>
            {health.checks.workers.workers.length === 0 ? (
              <p className="health-empty">No workers have reported in yet.</p>
            ) : (
              <table className="worker-table">
                <thead>
                  <tr>
                    <th>Host</th>
                    <th>PID</th>
                    <th>Status</th>
                    <th>Current job</th>
                    <th>Last seen</th>
                    <th>Online</th>
                  </tr>
                </thead>
                <tbody>
                  {health.checks.workers.workers.map((worker) => (
                    <tr key={`${worker.hostname}-${worker.pid}`}>
                      <td>{worker.hostname}</td>
                      <td>{worker.pid}</td>
                      <td>{worker.status}</td>
                      <td>{worker.currentJobId ?? '—'}</td>
                      <td>{formatLastSeen(worker.lastSeenAt)}</td>
                      <td>
                        <StatusBadge status={worker.online ? 'ok' : 'down'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="health-card">
            <h2>Backend</h2>
            <StatusBadge status="ok" />
            <p className="health-card-detail">{health.service}</p>
          </section>

          <section className="health-card">
            <h2>Database</h2>
            <StatusBadge status={health.checks.database.status} />
          </section>

          <section className="health-card">
            <h2>Storage</h2>
            <StatusBadge status={health.checks.storage.status} />
          </section>
        </div>
      )}

      {lastCheckedAt && (
        <p className="health-footer">Last checked {lastCheckedAt.toLocaleTimeString()}</p>
      )}
    </main>
  )
}
