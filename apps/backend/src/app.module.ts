import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { JobsController } from './jobs.controller'
import { UploadLimitsController } from './upload-limits.controller'

@Module({
  controllers: [HealthController, JobsController, UploadLimitsController],
})
export class AppModule {}
