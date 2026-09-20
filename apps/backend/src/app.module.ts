import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { HealthController } from './health.controller'
import { UploadLimitsController } from './upload-limits.controller'
import { AuthModule } from './auth/auth.module'
import { JobsModule } from './jobs/jobs.module'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        const required = [
          'DATABASE_URL',
          'FRONTEND_URL',
          'SESSION_SECRET',
          'GOOGLE_CLIENT_ID',
          'GOOGLE_CLIENT_SECRET',
          'GOOGLE_CALLBACK_URL',
          'S3_ENDPOINT',
          'S3_REGION',
          'S3_BUCKET',
          'S3_ACCESS_KEY_ID',
          'S3_SECRET_ACCESS_KEY',
        ]
        const missing = required.filter((key) => !config[key])
        if (missing.length > 0)
          throw new Error(`Missing environment variables: ${missing.join(', ')}`)
        if (
          config.NODE_ENV === 'production' &&
          (!config.FRONTEND_URL.startsWith('https://') ||
            !config.GOOGLE_CALLBACK_URL.startsWith('https://'))
        ) {
          throw new Error('Production frontend and Google callback URLs must use HTTPS')
        }
        return config
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    AuthModule,
    JobsModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: false,
      }),
    }),
  ],
  controllers: [HealthController, UploadLimitsController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
