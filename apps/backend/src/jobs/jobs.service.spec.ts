import { describe, expect, it, vi } from 'vitest'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { JobsService } from './jobs.service'

function createService() {
  const jobs = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'job-1', ...value })),
    find: vi.fn(),
  }
  const storageService = {
    createPresignedUploadUrl: vi.fn(async () => ({
      url: 'https://minio.local/signed',
      expiresInSeconds: 900,
    })),
    getUploadedObjectSize: vi.fn(),
    commitUpload: vi.fn(),
  }
  return {
    service: new JobsService(jobs as never, storageService as never),
    jobs,
    storageService,
  }
}

describe('JobsService', () => {
  describe('createUploadUrl', () => {
    it('rejects unsupported file extensions', async () => {
      const { service } = createService()

      await expect(
        service.createUploadUrl('user-1', 'malware.exe', 'application/octet-stream'),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('returns a presigned URL under a pending-uploads key scoped to the user', async () => {
      const { service, storageService } = createService()

      const result = await service.createUploadUrl('user-1', 'recording.mp3', 'audio/mpeg')

      expect(result.uploadUrl).toBe('https://minio.local/signed')
      expect(result.key).toMatch(/^pending-uploads\/user-1\/.+\.mp3$/)
      expect(storageService.createPresignedUploadUrl).toHaveBeenCalledWith(result.key, 'audio/mpeg')
    })
  })

  describe('createJobFromUpload', () => {
    it('rejects a key that does not belong to the current user', async () => {
      const { service } = createService()

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-2/file.mp3'),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('propagates a not-found error when the object was never uploaded', async () => {
      const { service, storageService } = createService()
      storageService.getUploadedObjectSize.mockRejectedValue(new NotFoundException())

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3'),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rejects an uploaded file that exceeds the size limit', async () => {
      const { service, storageService } = createService()
      storageService.getUploadedObjectSize.mockResolvedValue(200 * 1024 * 1024)

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3'),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(storageService.commitUpload).not.toHaveBeenCalled()
    })

    it('commits the upload and creates a job pointing at the final key', async () => {
      const { service, jobs, storageService } = createService()
      storageService.getUploadedObjectSize.mockResolvedValue(1024)

      const job = await service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3')

      expect(storageService.commitUpload).toHaveBeenCalledWith(
        'pending-uploads/user-1/file.mp3',
        'uploads/user-1/file.mp3',
      )
      expect(jobs.save).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'user-1', inputPath: 'uploads/user-1/file.mp3' }),
      )
      expect(job.id).toBe('job-1')
    })
  })

  describe('findJobsForUser', () => {
    it('lists jobs for a user ordered by most recent', async () => {
      const { service, jobs } = createService()
      jobs.find.mockResolvedValue([{ id: 'job-1' }])

      const result = await service.findJobsForUser('user-1')

      expect(jobs.find).toHaveBeenCalledWith({
        where: { createdBy: 'user-1' },
        order: { createdAt: 'DESC' },
      })
      expect(result).toEqual([{ id: 'job-1' }])
    })
  })
})
