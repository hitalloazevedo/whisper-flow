import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { getCurrentTraceId } from '../logging/trace-context'
import { StorageService } from '../storage/storage.service'
import { uploadLimits } from '../upload-limits.controller'
import { Job, JobStatus } from './job.entity'

const PENDING_UPLOAD_PREFIX = 'pending-uploads'
const UPLOAD_PREFIX = 'uploads'
const MAX_FILENAME_LENGTH = 255

function extensionOf(filename: string) {
  return extname(filename).slice(1).toLowerCase()
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name)

  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @Inject(StorageService) private readonly storageService: StorageService,
  ) {}

  async createUploadUrl(userId: string, filename: string, contentType: string) {
    this.logger.log('createUploadUrl -> ATTEMPTING', { userId, filename, contentType })
    try {
      const extension = extensionOf(filename)
      if (!uploadLimits.acceptedExtensions.includes(extension)) {
        throw new BadRequestException('Unsupported audio file type')
      }

      const key = `${PENDING_UPLOAD_PREFIX}/${userId}/${randomUUID()}.${extension}`
      const { url, expiresInSeconds } = await this.storageService.createPresignedUploadUrl(
        key,
        contentType,
      )
      this.logger.log('createUploadUrl -> SUCCESS', { userId, key })
      return { uploadUrl: url, key, expiresInSeconds }
    } catch (error) {
      this.logger.error('createUploadUrl -> ERROR', {
        userId,
        filename,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async createJobFromUpload(userId: string, key: string, originalFilename: string) {
    this.logger.log('createJobFromUpload -> ATTEMPTING', { userId, key, originalFilename })
    try {
      if (!key.startsWith(`${PENDING_UPLOAD_PREFIX}/${userId}/`)) {
        throw new ForbiddenException('Upload key does not belong to the current user')
      }

      const trimmedFilename = originalFilename.trim()
      if (!trimmedFilename) {
        throw new BadRequestException('filename is required')
      }

      const size = await this.storageService.getUploadedObjectSize(key)
      if (size > uploadLimits.maxBytes) {
        throw new BadRequestException('Uploaded file exceeds the maximum allowed size')
      }

      const finalKey = key.replace(PENDING_UPLOAD_PREFIX, UPLOAD_PREFIX)
      await this.storageService.commitUpload(key, finalKey)

      const job = await this.jobs.save(
        this.jobs.create({
          createdBy: userId,
          inputPath: finalKey,
          originalFilename: trimmedFilename.slice(0, MAX_FILENAME_LENGTH),
          traceId: getCurrentTraceId() ?? null,
        }),
      )
      this.logger.log('createJobFromUpload -> SUCCESS', { userId, jobId: job.id })
      return job
    } catch (error) {
      this.logger.error('createJobFromUpload -> ERROR', {
        userId,
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async findJobsForUser(userId: string) {
    return this.jobs.find({
      where: { createdBy: userId, deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
  }

  async getTranscriptDownloadUrl(userId: string, jobId: string) {
    this.logger.log('getTranscriptDownloadUrl -> ATTEMPTING', { userId, jobId })
    try {
      const job = await this.jobs.findOne({ where: { id: jobId, deletedAt: IsNull() } })
      if (!job || job.createdBy !== userId) {
        throw new NotFoundException('Job not found')
      }
      if (job.status !== JobStatus.Completed || !job.outputPath) {
        throw new BadRequestException('Transcript is not available for this job')
      }

      const result = await this.storageService.createPresignedDownloadUrl(job.outputPath)
      this.logger.log('getTranscriptDownloadUrl -> SUCCESS', { userId, jobId })
      return result
    } catch (error) {
      this.logger.error('getTranscriptDownloadUrl -> ERROR', {
        userId,
        jobId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async deleteJob(userId: string, jobId: string) {
    this.logger.log('deleteJob -> ATTEMPTING', { userId, jobId })
    try {
      const job = await this.jobs.findOne({ where: { id: jobId, deletedAt: IsNull() } })
      if (!job || job.createdBy !== userId) {
        throw new NotFoundException('Job not found')
      }

      job.deletedAt = new Date()
      await this.jobs.save(job)
      this.logger.log('deleteJob -> SUCCESS', { userId, jobId })
    } catch (error) {
      this.logger.error('deleteJob -> ERROR', {
        userId,
        jobId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }
}
