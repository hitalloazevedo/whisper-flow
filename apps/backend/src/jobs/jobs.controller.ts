import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { AuthenticatedGuard } from '../auth/authenticated.guard'
import { JobsService } from './jobs.service'

interface CreateUploadUrlBody {
  filename?: string
  contentType?: string
}

interface CreateJobBody {
  key?: string
}

@Controller('api/v1/jobs')
@UseGuards(AuthenticatedGuard)
export class JobsController {
  constructor(@Inject(JobsService) private readonly jobsService: JobsService) {}

  @Get()
  async getJobs(@Req() request: Request) {
    const jobs = await this.jobsService.findJobsForUser(request.session.userId!)
    return { jobs }
  }

  @Post('upload-url')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async createUploadUrl(@Body() body: CreateUploadUrlBody, @Req() request: Request) {
    if (!body.filename || !body.contentType) {
      throw new BadRequestException('filename and contentType are required')
    }

    return this.jobsService.createUploadUrl(
      request.session.userId!,
      body.filename,
      body.contentType,
    )
  }

  @Post()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async createJob(@Body() body: CreateJobBody, @Req() request: Request) {
    if (!body.key) throw new BadRequestException('key is required')

    const job = await this.jobsService.createJobFromUpload(request.session.userId!, body.key)
    return { job }
  }
}
