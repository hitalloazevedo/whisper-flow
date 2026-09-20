import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NotFoundException } from '@nestjs/common'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StorageService } from './storage.service'

const send = vi.fn()

vi.mock('@aws-sdk/client-s3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aws-sdk/client-s3')>()
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(function () {
      return { send }
    }),
  }
})

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

function createService() {
  const config: Record<string, string> = {
    S3_BUCKET: 'whisper-flow-audio',
    S3_ENDPOINT: 'http://localhost:9000',
    S3_REGION: 'us-east-1',
    S3_ACCESS_KEY_ID: 'minioadmin',
    S3_SECRET_ACCESS_KEY: 'minioadmin',
    S3_FORCE_PATH_STYLE: 'true',
  }
  const configService = {
    getOrThrow: vi.fn((key: string) => config[key]),
    get: vi.fn((key: string) => config[key]),
  }
  return new StorageService(configService as never)
}

describe('StorageService', () => {
  beforeEach(() => {
    send.mockReset()
    vi.mocked(getSignedUrl).mockReset()
  })

  describe('createPresignedUploadUrl', () => {
    it('signs a PutObjectCommand for the given key and content type', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue('https://minio.local/signed-url')
      const service = createService()

      const result = await service.createPresignedUploadUrl(
        'pending-uploads/u1/f.mp3',
        'audio/mpeg',
      )

      expect(result).toEqual({ url: 'https://minio.local/signed-url', expiresInSeconds: 15 * 60 })
      const [, command, options] = vi.mocked(getSignedUrl).mock.calls[0]
      expect(command).toBeInstanceOf(PutObjectCommand)
      expect(command.input).toMatchObject({
        Bucket: 'whisper-flow-audio',
        Key: 'pending-uploads/u1/f.mp3',
        ContentType: 'audio/mpeg',
      })
      expect(options).toEqual({ expiresIn: 15 * 60 })
    })
  })

  describe('createPresignedDownloadUrl', () => {
    it('signs a GetObjectCommand for the given key', async () => {
      vi.mocked(getSignedUrl).mockResolvedValue('https://minio.local/download-signed')
      const service = createService()

      const result = await service.createPresignedDownloadUrl('transcripts/u1/job-1.txt')

      expect(result).toEqual({
        url: 'https://minio.local/download-signed',
        expiresInSeconds: 5 * 60,
      })
      const [, command, options] = vi.mocked(getSignedUrl).mock.calls[0]
      expect(command).toBeInstanceOf(GetObjectCommand)
      expect(command.input).toMatchObject({
        Bucket: 'whisper-flow-audio',
        Key: 'transcripts/u1/job-1.txt',
      })
      expect(options).toEqual({ expiresIn: 5 * 60 })
    })
  })

  describe('getUploadedObjectSize', () => {
    it('returns the object content length', async () => {
      send.mockResolvedValue({ ContentLength: 1234 })
      const service = createService()

      const size = await service.getUploadedObjectSize('uploads/u1/f.mp3')

      expect(size).toBe(1234)
      expect(send.mock.calls[0][0]).toBeInstanceOf(HeadObjectCommand)
      expect(send.mock.calls[0][0].input).toMatchObject({
        Bucket: 'whisper-flow-audio',
        Key: 'uploads/u1/f.mp3',
      })
    })

    it('defaults to zero when content length is missing', async () => {
      send.mockResolvedValue({})
      const service = createService()

      await expect(service.getUploadedObjectSize('uploads/u1/f.mp3')).resolves.toBe(0)
    })

    it('translates a missing object into a NotFoundException', async () => {
      send.mockRejectedValue(new NotFound({ $metadata: {}, message: 'not found' }))
      const service = createService()

      await expect(service.getUploadedObjectSize('uploads/u1/f.mp3')).rejects.toBeInstanceOf(
        NotFoundException,
      )
    })

    it('propagates unexpected errors instead of swallowing them', async () => {
      send.mockRejectedValue(new Error('network down'))
      const service = createService()

      await expect(service.getUploadedObjectSize('uploads/u1/f.mp3')).rejects.toThrow(
        'network down',
      )
    })
  })

  describe('commitUpload', () => {
    it('copies the object to the destination key before deleting the source', async () => {
      const order: string[] = []
      send.mockImplementation((command) => {
        if (command instanceof CopyObjectCommand) order.push('copy')
        if (command instanceof DeleteObjectCommand) order.push('delete')
        return Promise.resolve({})
      })
      const service = createService()

      await service.commitUpload('pending-uploads/u1/f.mp3', 'uploads/u1/f.mp3')

      expect(order).toEqual(['copy', 'delete'])
      const [copyCommand, deleteCommand] = send.mock.calls.map(([command]) => command)
      expect(copyCommand.input).toMatchObject({
        Bucket: 'whisper-flow-audio',
        Key: 'uploads/u1/f.mp3',
        CopySource: '/whisper-flow-audio/pending-uploads/u1/f.mp3',
      })
      expect(deleteCommand.input).toMatchObject({
        Bucket: 'whisper-flow-audio',
        Key: 'pending-uploads/u1/f.mp3',
      })
    })

    it('does not delete the source object when the copy fails', async () => {
      send.mockImplementation((command) => {
        if (command instanceof CopyObjectCommand) return Promise.reject(new Error('copy failed'))
        return Promise.resolve({})
      })
      const service = createService()

      await expect(
        service.commitUpload('pending-uploads/u1/f.mp3', 'uploads/u1/f.mp3'),
      ).rejects.toThrow('copy failed')
      expect(send.mock.calls.some(([command]) => command instanceof DeleteObjectCommand)).toBe(
        false,
      )
    })
  })
})
