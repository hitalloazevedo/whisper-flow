import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { StorageService } from '../storage/storage.service'
import { Job } from './job.entity'

export const DELETED_JOB_RETENTION_DAYS = 60

@Injectable()
export class JobsPurgeService {
  private readonly logger = new Logger(JobsPurgeService.name)

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @Inject(StorageService) private readonly storageService: StorageService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredJobs() {
    this.logger.log('purgeExpiredJobs -> ATTEMPTING', {})
    const cutoff = new Date(Date.now() - DELETED_JOB_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const expiredJobs = await this.jobs.find({ where: { deletedAt: LessThan(cutoff) } })

    for (const job of expiredJobs) {
      await this.purgeJob(job)
    }

    this.logger.log('purgeExpiredJobs -> SUCCESS', { count: expiredJobs.length })
    return expiredJobs.length
  }

  private async purgeJob(job: Job) {
    this.logger.log('purgeJob -> ATTEMPTING', { jobId: job.id })
    try {
      await this.storageService.deleteObject(job.inputPath)
      if (job.outputPath) {
        await this.storageService.deleteObject(job.outputPath)
      }
      await this.jobs.delete(job.id)
      this.logger.log('purgeJob -> SUCCESS', { jobId: job.id })
    } catch (error) {
      this.logger.error('purgeJob -> ERROR', {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
