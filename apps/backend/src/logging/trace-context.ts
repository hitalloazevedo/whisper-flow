import { AsyncLocalStorage } from 'node:async_hooks'

export interface TraceStore {
  traceId: string
}

export const traceStorage = new AsyncLocalStorage<TraceStore>()

export function getCurrentTraceId(): string | undefined {
  return traceStorage.getStore()?.traceId
}
