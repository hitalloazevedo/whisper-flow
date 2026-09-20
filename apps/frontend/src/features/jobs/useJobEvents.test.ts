import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useJobEvents } from './useJobEvents'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  onmessage: ((event: { data: string }) => void) | null = null
  onopen: (() => void) | null = null
  close = vi.fn()

  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }
}

afterEach(() => {
  FakeEventSource.instances = []
  vi.unstubAllGlobals()
})

describe('useJobEvents', () => {
  it('does not construct an EventSource when disabled', () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    renderHook(() => useJobEvents(false, vi.fn()))

    expect(FakeEventSource.instances).toHaveLength(0)
  })

  it('opens an EventSource against the jobs events endpoint when enabled', () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    renderHook(() => useJobEvents(true, vi.fn()))

    expect(FakeEventSource.instances).toHaveLength(1)
    expect(FakeEventSource.instances[0].url).toContain('/api/v1/jobs/events')
  })

  it('parses incoming messages and forwards them to onEvent', () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const onEvent = vi.fn()
    renderHook(() => useJobEvents(true, onEvent))

    const instance = FakeEventSource.instances[0]
    instance.onmessage?.({ data: JSON.stringify({ id: 'job-1', status: 'completed' }) })

    expect(onEvent).toHaveBeenCalledWith({ id: 'job-1', status: 'completed' })
  })

  it('calls onReconnect when the connection opens', () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const onReconnect = vi.fn()
    renderHook(() => useJobEvents(true, vi.fn(), onReconnect))

    FakeEventSource.instances[0].onopen?.()

    expect(onReconnect).toHaveBeenCalled()
  })

  it('closes the connection on unmount', () => {
    vi.stubGlobal('EventSource', FakeEventSource)
    const { unmount } = renderHook(() => useJobEvents(true, vi.fn()))

    unmount()

    expect(FakeEventSource.instances[0].close).toHaveBeenCalled()
  })

  it('does nothing when EventSource is unavailable', () => {
    vi.stubGlobal('EventSource', undefined)

    expect(() => renderHook(() => useJobEvents(true, vi.fn()))).not.toThrow()
  })
})
