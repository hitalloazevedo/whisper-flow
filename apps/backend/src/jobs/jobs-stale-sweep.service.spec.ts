import { describe, expect, it, vi } from 'vitest'
import { LessThan } from 'typeorm'
import { JobsStaleSweepService } from './jobs-stale-sweep.service'
import { JobStatus } from './job.entity'

function createService() {
  const jobs = {
    find: vi.fn(),
    save: vi.fn(async (value) => value),
  }
  return {
    service: new JobsStaleSweepService(jobs as never),
    jobs,
  }
}

describe('JobsStaleSweepService', () => {
  it('queries for processing jobs stale past the 30-minute threshold', async () => {
    const { service, jobs } = createService()
    jobs.find.mockResolvedValue([])

    await service.reclaimStaleJobs()

    expect(jobs.find).toHaveBeenCalledWith({
      where: { status: JobStatus.Processing, updatedAt: LessThan(expect.any(Date)) },
    })
  })

  it('requeues a stale job immediately, with no backoff, when retries remain', async () => {
    const { service, jobs } = createService()
    const job = {
      id: 'job-1',
      status: JobStatus.Processing,
      retryCount: 0,
      nextAttemptAt: null,
      errorMessage: null,
    }
    jobs.find.mockResolvedValue([job])

    const count = await service.reclaimStaleJobs()

    expect(job.status).toBe(JobStatus.Pending)
    expect(job.retryCount).toBe(1)
    expect(job.nextAttemptAt).toBeNull()
    expect(job.errorMessage).toBe('Job timed out while processing and was requeued')
    expect(jobs.save).toHaveBeenCalledWith([job])
    expect(count).toBe(1)
  })

  it('marks the job permanently failed once retries are exhausted', async () => {
    const { service, jobs } = createService()
    const job = {
      id: 'job-1',
      status: JobStatus.Processing,
      retryCount: 2,
      nextAttemptAt: null,
      errorMessage: null,
    }
    jobs.find.mockResolvedValue([job])

    await service.reclaimStaleJobs()

    expect(job.status).toBe(JobStatus.Failed)
    expect(job.retryCount).toBe(3)
    expect(job.errorMessage).toBe('Job timed out while processing and exceeded the retry limit')
  })

  it('does nothing when there are no stale jobs', async () => {
    const { service, jobs } = createService()
    jobs.find.mockResolvedValue([])

    const count = await service.reclaimStaleJobs()

    expect(jobs.save).not.toHaveBeenCalled()
    expect(count).toBe(0)
  })
})
