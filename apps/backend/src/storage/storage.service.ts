import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
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
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: PRESIGNED_UPLOAD_URL_TTL_SECONDS },
    )
    return { url, expiresInSeconds: PRESIGNED_UPLOAD_URL_TTL_SECONDS }
  }

  async createPresignedDownloadUrl(key: string) {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: PRESIGNED_DOWNLOAD_URL_TTL_SECONDS },
    )
    return { url, expiresInSeconds: PRESIGNED_DOWNLOAD_URL_TTL_SECONDS }
  }

  async getUploadedObjectSize(key: string) {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return result.ContentLength ?? 0
    } catch (error) {
      if (error instanceof NotFound) throw new NotFoundException('Uploaded file was not found')
      throw error
    }
  }

  async commitUpload(sourceKey: string, destinationKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: destinationKey,
        CopySource: `/${this.bucket}/${sourceKey}`,
      }),
    )
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: sourceKey }))
  }

  async deleteObject(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
