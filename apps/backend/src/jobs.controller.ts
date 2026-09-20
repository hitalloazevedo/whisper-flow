import { Controller, Get } from '@nestjs/common'

@Controller('api/jobs')
export class JobsController {
  @Get()
  getJobs() {
    return { jobs: [] }
  }
}
