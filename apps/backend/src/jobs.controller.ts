import { Controller, Get, UseGuards } from '@nestjs/common'
import { AuthenticatedGuard } from './auth/authenticated.guard'

@Controller('api/v1/jobs')
@UseGuards(AuthenticatedGuard)
export class JobsController {
  @Get()
  getJobs() {
    return { jobs: [] }
  }
}
