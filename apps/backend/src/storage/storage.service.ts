import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const PRESIGNED_UPLOAD_URL_TTL_SECONDS = 15 * 60
const PRESIGNED_DOWNLOAD_URL_TTL_SECONDS = 5 * 60

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private readonly client: S3Client
  private readonly bucket: string

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET')
    this.client = new S3Client({
      endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
      region: this.configService.getOrThrow<string>('S3_REGION'),
      forcePathStyle: this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
    })
  }

  async createPresignedUploadUrl(key: string, contentType: string) {
    this.logger.log('createPresignedUploadUrl -> ATTEMPTING', { key, contentType })
    try {
      const url = await getSignedUrl(
        this.client,
        new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
        { expiresIn: PRESIGNED_UPLOAD_URL_TTL_SECONDS },
      )
      this.logger.log('createPresignedUploadUrl -> SUCCESS', { key })
      return { url, expiresInSeconds: PRESIGNED_UPLOAD_URL_TTL_SECONDS }
    } catch (error) {
      this.logger.error('createPresignedUploadUrl -> ERROR', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async createPresignedDownloadUrl(key: string) {
    this.logger.log('createPresignedDownloadUrl -> ATTEMPTING', { key })
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: PRESIGNED_DOWNLOAD_URL_TTL_SECONDS },
      )
      this.logger.log('createPresignedDownloadUrl -> SUCCESS', { key })
      return { url, expiresInSeconds: PRESIGNED_DOWNLOAD_URL_TTL_SECONDS }
    } catch (error) {
      this.logger.error('createPresignedDownloadUrl -> ERROR', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async getUploadedObjectSize(key: string) {
    this.logger.log('getUploadedObjectSize -> ATTEMPTING', { key })
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      this.logger.log('getUploadedObjectSize -> SUCCESS', { key })
      return result.ContentLength ?? 0
    } catch (error) {
      this.logger.error('getUploadedObjectSize -> ERROR', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      if (error instanceof NotFound) throw new NotFoundException('Uploaded file was not found')
      throw error
    }
  }

  async commitUpload(sourceKey: string, destinationKey: string) {
    this.logger.log('commitUpload -> ATTEMPTING', { sourceKey, destinationKey })
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: destinationKey,
          CopySource: `/${this.bucket}/${sourceKey}`,
        }),
      )
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: sourceKey }))
      this.logger.log('commitUpload -> SUCCESS', { sourceKey, destinationKey })
    } catch (error) {
      this.logger.error('commitUpload -> ERROR', {
        sourceKey,
        destinationKey,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async deleteObject(key: string) {
    this.logger.log('deleteObject -> ATTEMPTING', { key })
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
      this.logger.log('deleteObject -> SUCCESS', { key })
    } catch (error) {
      this.logger.error('deleteObject -> ERROR', {
        key,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async pingBucket() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }))
  }
}
