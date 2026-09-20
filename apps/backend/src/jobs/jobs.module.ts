import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StorageModule } from '../storage/storage.module'
import { JobEventsService } from './job-events.service'
import { Job } from './job.entity'
import { JobsController } from './jobs.controller'
import { JobsPurgeService } from './jobs-purge.service'
import { JobsStaleSweepService } from './jobs-stale-sweep.service'
import { JobsService } from './jobs.service'

@Module({
  imports: [TypeOrmModule.forFeature([Job]), StorageModule],
  controllers: [JobsController],
  providers: [JobsService, JobEventsService, JobsPurgeService, JobsStaleSweepService],
})
export class JobsModule {}
