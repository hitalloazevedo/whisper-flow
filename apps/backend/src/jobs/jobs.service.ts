import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
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
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @Inject(StorageService) private readonly storageService: StorageService,
  ) {}

  async createUploadUrl(userId: string, filename: string, contentType: string) {
    const extension = extensionOf(filename)
    if (!uploadLimits.acceptedExtensions.includes(extension)) {
      throw new BadRequestException('Unsupported audio file type')
    }

    const key = `${PENDING_UPLOAD_PREFIX}/${userId}/${randomUUID()}.${extension}`
    const { url, expiresInSeconds } = await this.storageService.createPresignedUploadUrl(
      key,
      contentType,
    )
    return { uploadUrl: url, key, expiresInSeconds }
  }

  async createJobFromUpload(userId: string, key: string, originalFilename: string) {
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

    return this.jobs.save(
      this.jobs.create({
        createdBy: userId,
        inputPath: finalKey,
        originalFilename: trimmedFilename.slice(0, MAX_FILENAME_LENGTH),
        traceId: getCurrentTraceId() ?? null,
      }),
    )
  }

  async findJobsForUser(userId: string) {
    return this.jobs.find({ where: { createdBy: userId }, order: { createdAt: 'DESC' } })
  }

  async getTranscriptDownloadUrl(userId: string, jobId: string) {
    const job = await this.jobs.findOne({ where: { id: jobId } })
    if (!job || job.createdBy !== userId) {
      throw new NotFoundException('Job not found')
    }
    if (job.status !== JobStatus.Completed || !job.outputPath) {
      throw new BadRequestException('Transcript is not available for this job')
    }

    return this.storageService.createPresignedDownloadUrl(job.outputPath)
  }
}
