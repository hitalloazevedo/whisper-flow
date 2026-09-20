import { WinstonModule } from 'nest-winston'
import winston from 'winston'

export function createAppLogger() {
  return WinstonModule.createLogger({
    level: process.env.LOG_LEVEL ?? 'info',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [new winston.transports.Console()],
  })
}
