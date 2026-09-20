import { describe, expect, it, vi } from 'vitest'
import { LessThan } from 'typeorm'
import { JobsPurgeService } from './jobs-purge.service'

function createService() {
  const jobs = {
    find: vi.fn(),
    delete: vi.fn(),
  }
  const storageService = {
    deleteObject: vi.fn(),
  }
  return {
    service: new JobsPurgeService(jobs as never, storageService as never),
    jobs,
    storageService,
  }
}

describe('JobsPurgeService', () => {
  it('purges jobs soft-deleted more than 60 days ago', async () => {
    const { service, jobs, storageService } = createService()
    jobs.find.mockResolvedValue([
      {
        id: 'job-1',
        inputPath: 'uploads/user-1/job-1.mp3',
        outputPath: 'transcripts/user-1/job-1.txt',
      },
    ])

    const count = await service.purgeExpiredJobs()

    expect(jobs.find).toHaveBeenCalledWith({
      where: { deletedAt: LessThan(expect.any(Date)) },
    })
    expect(storageService.deleteObject).toHaveBeenCalledWith('uploads/user-1/job-1.mp3')
    expect(storageService.deleteObject).toHaveBeenCalledWith('transcripts/user-1/job-1.txt')
    expect(jobs.delete).toHaveBeenCalledWith('job-1')
    expect(count).toBe(1)
  })

  it('skips deleting the output object when the job has none', async () => {
    const { service, jobs, storageService } = createService()
    jobs.find.mockResolvedValue([
      { id: 'job-1', inputPath: 'uploads/user-1/job-1.mp3', outputPath: null },
    ])

    await service.purgeExpiredJobs()

    expect(storageService.deleteObject).toHaveBeenCalledTimes(1)
    expect(storageService.deleteObject).toHaveBeenCalledWith('uploads/user-1/job-1.mp3')
  })

  it('does not delete the row when storage cleanup fails', async () => {
    const { service, jobs, storageService } = createService()
    jobs.find.mockResolvedValue([
      { id: 'job-1', inputPath: 'uploads/user-1/job-1.mp3', outputPath: null },
    ])
    storageService.deleteObject.mockRejectedValue(new Error('S3 unavailable'))

    await service.purgeExpiredJobs()

    expect(jobs.delete).not.toHaveBeenCalled()
  })

  it('returns 0 when there is nothing to purge', async () => {
    const { service, jobs } = createService()
    jobs.find.mockResolvedValue([])

    const count = await service.purgeExpiredJobs()

    expect(count).toBe(0)
  })
})
