import { describe, expect, it, vi } from 'vitest'
import { Subject, firstValueFrom, take, toArray } from 'rxjs'
import { BadRequestException } from '@nestjs/common'
import { JobsController } from './jobs.controller'
import { JobStatus } from './job.entity'
import type { JobEventPayload } from './job-events.service'

function createRequest(userId = 'user-1') {
  return { session: { userId } }
}

function createController(jobsService: unknown, jobEventsService: unknown = {}) {
  return new JobsController(jobsService as never, jobEventsService as never)
}

describe('JobsController', () => {
  it('lists jobs for the current user', async () => {
    const jobsService = { findJobsForUser: vi.fn().mockResolvedValue([{ id: 'job-1' }]) }
    const controller = createController(jobsService)

    const result = await controller.getJobs(createRequest() as never)

    expect(jobsService.findJobsForUser).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ jobs: [{ id: 'job-1' }] })
  })

  describe('jobEvents', () => {
    it('only forwards events belonging to the requesting user', async () => {
      const events$ = new Subject<JobEventPayload>()
      const jobEventsService = { events$ }
      const controller = createController({}, jobEventsService)

      const resultPromise = firstValueFrom(
        controller.jobEvents(createRequest('user-1') as never).pipe(take(1), toArray()),
      )

      events$.next({
        event: 'update',
        id: 'job-other',
        status: JobStatus.Completed,
        createdBy: 'user-2',
      })
      events$.next({
        event: 'update',
        id: 'job-1',
        status: JobStatus.Completed,
        createdBy: 'user-1',
      })

      const result = await resultPromise
      expect(result).toEqual([{ data: { id: 'job-1', status: 'completed' } }])
    })
  })

  describe('createUploadUrl', () => {
    it('rejects a request missing filename or contentType', async () => {
      const jobsService = { createUploadUrl: vi.fn() }
      const controller = createController(jobsService)

      await expect(
        controller.createUploadUrl({ filename: 'recording.mp3' }, createRequest() as never),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(jobsService.createUploadUrl).not.toHaveBeenCalled()
    })

    it('returns a presigned upload URL for the current user', async () => {
      const jobsService = {
        createUploadUrl: vi
          .fn()
          .mockResolvedValue({ uploadUrl: 'https://minio.local/signed', key: 'k' }),
      }
      const controller = createController(jobsService)

      const result = await controller.createUploadUrl(
        { filename: 'recording.mp3', contentType: 'audio/mpeg' },
        createRequest() as never,
      )

      expect(jobsService.createUploadUrl).toHaveBeenCalledWith(
        'user-1',
        'recording.mp3',
        'audio/mpeg',
      )
      expect(result).toEqual({ uploadUrl: 'https://minio.local/signed', key: 'k' })
    })
  })

  describe('createJob', () => {
    it('rejects a request missing the key', async () => {
      const jobsService = { createJobFromUpload: vi.fn() }
      const controller = createController(jobsService)

      await expect(
        controller.createJob({ filename: 'file.mp3' }, createRequest() as never),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(jobsService.createJobFromUpload).not.toHaveBeenCalled()
    })

    it('rejects a request missing the filename', async () => {
      const jobsService = { createJobFromUpload: vi.fn() }
      const controller = createController(jobsService)

      await expect(
        controller.createJob({ key: 'pending-uploads/user-1/file.mp3' }, createRequest() as never),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(jobsService.createJobFromUpload).not.toHaveBeenCalled()
    })

    it('confirms the upload and creates a job for the current user', async () => {
      const jobsService = { createJobFromUpload: vi.fn().mockResolvedValue({ id: 'job-1' }) }
      const controller = createController(jobsService)

      const result = await controller.createJob(
        { key: 'pending-uploads/user-1/file.mp3', filename: 'file.mp3' },
        createRequest() as never,
      )

      expect(jobsService.createJobFromUpload).toHaveBeenCalledWith(
        'user-1',
        'pending-uploads/user-1/file.mp3',
        'file.mp3',
      )
      expect(result).toEqual({ job: { id: 'job-1' } })
    })
  })

  describe('getTranscriptUrl', () => {
    it('returns a presigned download URL for the current user', async () => {
      const jobsService = {
        getTranscriptDownloadUrl: vi
          .fn()
          .mockResolvedValue({ url: 'https://minio.local/signed', expiresInSeconds: 300 }),
      }
      const controller = createController(jobsService)

      const result = await controller.getTranscriptUrl('job-1', createRequest() as never)

      expect(jobsService.getTranscriptDownloadUrl).toHaveBeenCalledWith('user-1', 'job-1')
      expect(result).toEqual({ url: 'https://minio.local/signed', expiresInSeconds: 300 })
    })
  })
})
