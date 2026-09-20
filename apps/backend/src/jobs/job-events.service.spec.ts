import { describe, expect, it, vi, beforeEach } from 'vitest'
import { JobEventsService } from './job-events.service'

const connect = vi.fn()
const query = vi.fn()
const end = vi.fn()
const handlers: Record<string, (arg?: unknown) => void> = {}

vi.mock('pg', () => ({
  Client: vi.fn().mockImplementation(function () {
    return {
      connect,
      query,
      end,
      on: vi.fn((event: string, handler: (arg?: unknown) => void) => {
        handlers[event] = handler
      }),
    }
  }),
}))

function createService() {
  const configService = { getOrThrow: vi.fn(() => 'postgres://localhost/test') }
  return new JobEventsService(configService as never)
}

describe('JobEventsService', () => {
  beforeEach(() => {
    connect.mockReset().mockResolvedValue(undefined)
    query.mockReset().mockResolvedValue(undefined)
    end.mockReset().mockResolvedValue(undefined)
    for (const key of Object.keys(handlers)) delete handlers[key]
  })

  it('listens on the new_job channel on init', async () => {
    const service = createService()

    await service.onModuleInit()

    expect(connect).toHaveBeenCalled()
    expect(query).toHaveBeenCalledWith('LISTEN new_job')
  })

  it('publishes a valid notification payload to events$', async () => {
    const service = createService()
    await service.onModuleInit()

    const received: unknown[] = []
    service.events$.subscribe((event) => received.push(event))

    handlers.notification({
      payload: JSON.stringify({
        event: 'update',
        id: 'job-1',
        status: 'completed',
        createdBy: 'user-1',
      }),
    })

    expect(received).toEqual([
      { event: 'update', id: 'job-1', status: 'completed', createdBy: 'user-1' },
    ])
  })

  it('discards a malformed notification payload without throwing', async () => {
    const service = createService()
    await service.onModuleInit()

    const received: unknown[] = []
    service.events$.subscribe((event) => received.push(event))

    expect(() => handlers.notification({ payload: 'not-json' })).not.toThrow()
    expect(received).toEqual([])
  })

  it('closes the client on module destroy', async () => {
    const service = createService()
    await service.onModuleInit()

    await service.onModuleDestroy()

    expect(end).toHaveBeenCalled()
  })
})
