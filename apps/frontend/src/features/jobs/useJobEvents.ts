import { useEffect, useRef } from 'react'
import { apiUrl } from '../../config/api'
import type { JobStatusEvent } from '../../types'

export function useJobEvents(
  enabled: boolean,
  onEvent: (event: JobStatusEvent) => void,
  onReconnect?: () => void,
) {
  const onEventRef = useRef(onEvent)
  const onReconnectRef = useRef(onReconnect)

  useEffect(() => {
    onEventRef.current = onEvent
    onReconnectRef.current = onReconnect
  }, [onEvent, onReconnect])

  useEffect(() => {
    if (!enabled) return
    if (typeof EventSource === 'undefined') return

    const source = new EventSource(apiUrl('/api/v1/jobs/events'), { withCredentials: true })

    source.onmessage = (message) => {
      try {
        onEventRef.current(JSON.parse(message.data) as JobStatusEvent)
      } catch {
        // ignore malformed events
      }
    }

    source.onopen = () => {
      onReconnectRef.current?.()
    }

    return () => source.close()
  }, [enabled])
}
