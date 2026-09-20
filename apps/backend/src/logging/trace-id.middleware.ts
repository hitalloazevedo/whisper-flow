import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { traceStorage } from './trace-context'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function traceIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const headerValue = request.header('X-Trace-Id')
  const traceId = headerValue && UUID_RE.test(headerValue) ? headerValue : randomUUID()
  response.setHeader('X-Trace-Id', traceId)
  traceStorage.run({ traceId }, next)
}
