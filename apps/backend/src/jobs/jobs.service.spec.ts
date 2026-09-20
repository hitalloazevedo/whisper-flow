import { describe, expect, it, vi } from 'vitest'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { IsNull } from 'typeorm'
import { JobsService } from './jobs.service'
import { JobStatus } from './job.entity'

function createService() {
  const jobs = {
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'job-1', ...value })),
    find: vi.fn(),
    findOne: vi.fn(),
  }
  const storageService = {
    createPresignedUploadUrl: vi.fn(async () => ({
      url: 'https://minio.local/signed',
      expiresInSeconds: 900,
    })),
    createPresignedDownloadUrl: vi.fn(async () => ({
      url: 'https://minio.local/download-signed',
      expiresInSeconds: 300,
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
        service.createJobFromUpload('user-1', 'pending-uploads/user-2/file.mp3', 'file.mp3'),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('rejects a blank filename', async () => {
      const { service } = createService()

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3', '   '),
      ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('propagates a not-found error when the object was never uploaded', async () => {
      const { service, storageService } = createService()
      storageService.getUploadedObjectSize.mockRejectedValue(new NotFoundException())

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3', 'file.mp3'),
      ).rejects.toBeInstanceOf(NotFoundException)
    })

    it('rejects an uploaded file that exceeds the size limit', async () => {
      const { service, storageService } = createService()
      storageService.getUploadedObjectSize.mockResolvedValue(200 * 1024 * 1024)

      await expect(
        service.createJobFromUpload('user-1', 'pending-uploads/user-1/file.mp3', 'file.mp3'),
      ).rejects.toBeInstanceOf(BadRequestException)
      expect(storageService.commitUpload).not.toHaveBeenCalled()
    })

    it('commits the upload and creates a job pointing at the final key', async () => {
      const { service, jobs, storageService } = createService()
      storageService.getUploadedObjectSize.mockResolvedValue(1024)

      const job = await service.createJobFromUpload(
        'user-1',
        'pending-uploads/user-1/file.mp3',
        '  recording.mp3  ',
      )

      expect(storageService.commitUpload).toHaveBeenCalledWith(
        'pending-uploads/user-1/file.mp3',
        'uploads/user-1/file.mp3',
      )
      expect(jobs.save).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user-1',
          inputPath: 'uploads/user-1/file.mp3',
          originalFilename: 'recording.mp3',
        }),
      )
      expect(job.id).toBe('job-1')
    })
  })

  describe('findJobsForUser', () => {
    it('lists non-deleted jobs for a user ordered by most recent', async () => {
      const { service, jobs } = createService()
      jobs.find.mockResolvedValue([{ id: 'job-1' }])

      const result = await service.findJobsForUser('user-1')

      expect(jobs.find).toHaveBeenCalledWith({
        where: { createdBy: 'user-1', deletedAt: IsNull() },
        order: { createdAt: 'DESC' },
      })
      expect(result).toEqual([{ id: 'job-1' }])
    })
  })

  describe('getTranscriptDownloadUrl', () => {
    it('returns a presigned download URL for a completed job owned by the user', async () => {
      const { service, jobs, storageService } = createService()
      jobs.findOne.mockResolvedValue({
        id: 'job-1',
        createdBy: 'user-1',
        status: JobStatus.Completed,
        outputPath: 'transcripts/user-1/job-1.txt',
      })

      const result = await service.getTranscriptDownloadUrl('user-1', 'job-1')

      expect(jobs.findOne).toHaveBeenCalledWith({
        where: { id: 'job-1', deletedAt: IsNull() },
      })
      expect(storageService.createPresignedDownloadUrl).toHaveBeenCalledWith(
        'transcripts/user-1/job-1.txt',
      )
      expect(result).toEqual({ url: 'https://minio.local/download-signed', expiresInSeconds: 300 })
    })

    it('throws NotFoundException when the job does not exist', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue(null)

      await expect(service.getTranscriptDownloadUrl('user-1', 'job-1')).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('throws NotFoundException when the job belongs to another user', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue({
        id: 'job-1',
        createdBy: 'user-2',
        status: JobStatus.Completed,
        outputPath: 'transcripts/user-2/job-1.txt',
      })

      await expect(service.getTranscriptDownloadUrl('user-1', 'job-1')).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('throws BadRequestException when the job is not completed', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue({
        id: 'job-1',
        createdBy: 'user-1',
        status: JobStatus.Processing,
        outputPath: null,
      })

      await expect(service.getTranscriptDownloadUrl('user-1', 'job-1')).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })

    it('throws BadRequestException when outputPath is missing', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue({
        id: 'job-1',
        createdBy: 'user-1',
        status: JobStatus.Completed,
        outputPath: null,
      })

      await expect(service.getTranscriptDownloadUrl('user-1', 'job-1')).rejects.toBeInstanceOf(
        BadRequestException,
      )
    })
  })

  describe('deleteJob', () => {
    it('soft-deletes a job owned by the user', async () => {
      const { service, jobs } = createService()
      const job = { id: 'job-1', createdBy: 'user-1', deletedAt: null }
      jobs.findOne.mockResolvedValue(job)

      await service.deleteJob('user-1', 'job-1')

      expect(jobs.findOne).toHaveBeenCalledWith({
        where: { id: 'job-1', deletedAt: IsNull() },
      })
      expect(jobs.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'job-1', deletedAt: expect.any(Date) }),
      )
    })

    it('throws NotFoundException when the job does not exist', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue(null)

      await expect(service.deleteJob('user-1', 'job-1')).rejects.toBeInstanceOf(NotFoundException)
      expect(jobs.save).not.toHaveBeenCalled()
    })

    it('throws NotFoundException when the job belongs to another user', async () => {
      const { service, jobs } = createService()
      jobs.findOne.mockResolvedValue({ id: 'job-1', createdBy: 'user-2', deletedAt: null })

      await expect(service.deleteJob('user-1', 'job-1')).rejects.toBeInstanceOf(NotFoundException)
      expect(jobs.save).not.toHaveBeenCalled()
    })
  })
})
