import { WinstonModule } from 'nest-winston'
import winston from 'winston'
import { getCurrentTraceId } from './trace-context'

const traceIdFormat = winston.format((info) => {
  const traceId = getCurrentTraceId()
  if (traceId) info.traceId = traceId
  return info
})

export function createAppLogger() {
  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston.format.combine(
      traceIdFormat(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
  })
}
