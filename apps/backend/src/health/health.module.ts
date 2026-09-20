import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageModule } from '../storage/storage.module'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'
import { WorkerHeartbeat } from './worker-heartbeat.entity'

@Module({
  imports: [TypeOrmModule.forFeature([WorkerHeartbeat]), StorageModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
