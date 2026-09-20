import 'reflect-metadata'
import { ConfigService } from '@nestjs/config'
// These packages expose callable CommonJS exports under the current TypeScript setup.
// eslint-disable-next-line @typescript-eslint/no-require-imports
import connectPgSimple = require('connect-pg-simple')
// eslint-disable-next-line @typescript-eslint/no-require-imports
import session = require('express-session')
import { Pool } from 'pg'
import type { NextFunction, Request, Response } from 'express'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { createAppLogger } from './logging/app-logger'
import { traceIdMiddleware } from './logging/trace-id.middleware'

async function bootstrap() {
  const logger = createAppLogger()
  const app = await NestFactory.create(AppModule, { logger })
  const configService = app.get(ConfigService)
  const frontendUrl = configService.getOrThrow<string>('FRONTEND_URL')
  const databaseUrl = configService.getOrThrow<string>('DATABASE_URL')
  const sessionSecret = configService.getOrThrow<string>('SESSION_SECRET')
  const PgSession = connectPgSimple(session)
  const sessionPool = new Pool({ connectionString: databaseUrl })

  app.enableCors({ origin: frontendUrl, credentials: true })
  if (process.env.NODE_ENV === 'production') {
    app.getHttpAdapter().getInstance().set('trust proxy', 1)
  }
  app.use(traceIdMiddleware)
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now()
    response.on('finish', () => {
      logger.log(
        {
          event: 'http_request',
          method: request.method,
          path: request.path,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        },
        'HTTP',
      )
    })
    next()
  })
  app.use(
    session({
      secret: sessionSecret,
      store: new PgSession({
        pool: sessionPool,
        tableName: 'user_sessions',
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  )

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)
  logger.log(`Whisper Flow API listening on http://localhost:${port}`, 'Bootstrap')

  const shutdown = async (signal: string) => {
    logger.log({ event: 'shutdown_started', signal }, 'Bootstrap')
    try {
      await app.close()
      await sessionPool.end()
    } catch (error) {
      logger.error({ event: 'shutdown_failed', signal, error }, 'Bootstrap')
      process.exitCode = 1
    }
  }
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
  process.once('SIGINT', () => void shutdown('SIGINT'))
}

void bootstrap()
