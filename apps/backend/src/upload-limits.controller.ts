import { Controller, Get } from '@nestjs/common'

const mockedUploadLimits = {
  maxBytes: 100 * 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

@Controller('api/v1/upload-limits')
export class UploadLimitsController {
  @Get()
  getUploadLimits() {
    return mockedUploadLimits
  }
}
