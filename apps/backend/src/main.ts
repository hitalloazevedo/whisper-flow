import 'reflect-metadata'
import { ConfigService } from '@nestjs/config'
import connectPgSimple from 'connect-pg-simple'
import session from 'express-session'
import { Pool } from 'pg'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
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
  app.use(
    session({
      secret: sessionSecret,
      store: new PgSession({
        pool: sessionPool,
        tableName: 'user_sessions',
        createTableIfMissing: true,
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
  console.log(`Whisper Flow API listening on http://localhost:${port}`)
}

void bootstrap()
