import { Controller, Get } from '@nestjs/common'

export const uploadLimits = {
  maxBytes: 50 * 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

@Controller('api/v1/upload-limits')
export class UploadLimitsController {
  @Get()
  getUploadLimits() {
    return uploadLimits
  }
}
