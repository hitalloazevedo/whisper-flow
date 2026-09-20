import { describe, expect, it, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { JobsController } from './jobs.controller'

function createRequest(userId = 'user-1') {
  return { session: { userId } }
}

describe('JobsController', () => {
  it('lists jobs for the current user', async () => {
    const jobsService = { findJobsForUser: vi.fn().mockResolvedValue([{ id: 'job-1' }]) }
    const controller = new JobsController(jobsService as never)

    const result = await controller.getJobs(createRequest() as never)

    expect(jobsService.findJobsForUser).toHaveBeenCalledWith('user-1')
    expect(result).toEqual({ jobs: [{ id: 'job-1' }] })
  })

  describe('createUploadUrl', () => {
    it('rejects a request missing filename or contentType', async () => {
      const jobsService = { createUploadUrl: vi.fn() }
      const controller = new JobsController(jobsService as never)

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
      const controller = new JobsController(jobsService as never)

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
      const controller = new JobsController(jobsService as never)

      await expect(
        controller.createJob({ filename: 'file.mp3' }, createRequest() as never),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(jobsService.createJobFromUpload).not.toHaveBeenCalled()
    })

    it('rejects a request missing the filename', async () => {
      const jobsService = { createJobFromUpload: vi.fn() }
      const controller = new JobsController(jobsService as never)

      await expect(
        controller.createJob({ key: 'pending-uploads/user-1/file.mp3' }, createRequest() as never),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(jobsService.createJobFromUpload).not.toHaveBeenCalled()
    })

    it('confirms the upload and creates a job for the current user', async () => {
      const jobsService = { createJobFromUpload: vi.fn().mockResolvedValue({ id: 'job-1' }) }
      const controller = new JobsController(jobsService as never)

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
})
