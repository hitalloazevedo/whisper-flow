import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { Job, JobStatus } from './job.entity'
import { MAX_JOB_ATTEMPTS } from './retry-policy'

export const STALE_PROCESSING_THRESHOLD_MINUTES = 30

@Injectable()
export class JobsStaleSweepService {
  private readonly logger = new Logger(JobsStaleSweepService.name)

  constructor(@InjectRepository(Job) private readonly jobs: Repository<Job>) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reclaimStaleJobs() {
    this.logger.log('reclaimStaleJobs -> ATTEMPTING', {})
    try {
      const cutoff = new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MINUTES * 60 * 1000)
      const staleJobs = await this.jobs.find({
        where: { status: JobStatus.Processing, updatedAt: LessThan(cutoff) },
      })

      for (const job of staleJobs) {
        job.retryCount += 1
        // No backoff here: the 30-minute staleness window already acted as the
        // cooldown, unlike an explicit failure where we retry immediately after
        // detecting it and need the delay in mark_failed instead.
        job.nextAttemptAt = null
        if (job.retryCount >= MAX_JOB_ATTEMPTS) {
          job.status = JobStatus.Failed
          job.errorMessage = 'Job timed out while processing and exceeded the retry limit'
        } else {
          job.status = JobStatus.Pending
          job.errorMessage = 'Job timed out while processing and was requeued'
        }
      }

      if (staleJobs.length > 0) {
        await this.jobs.save(staleJobs)
      }

      this.logger.log('reclaimStaleJobs -> SUCCESS', { count: staleJobs.length })
      return staleJobs.length
    } catch (error) {
      this.logger.error('reclaimStaleJobs -> ERROR', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
