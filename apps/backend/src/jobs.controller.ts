import { Controller, Get } from '@nestjs/common'

@Controller('api/v1/jobs')
export class JobsController {
  @Get()
  getJobs() {
    return { jobs: [] }
  }
}
