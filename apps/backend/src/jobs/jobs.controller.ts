import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  MessageEvent,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Request } from 'express'
import { Observable, filter, map } from 'rxjs'
import { AuthenticatedGuard } from '../auth/authenticated.guard'
import { JobEventsService } from './job-events.service'
import { JobsService } from './jobs.service'

interface CreateUploadUrlBody {
  filename?: string
  contentType?: string
}

interface CreateJobBody {
  key?: string
  filename?: string
}

@Controller('api/v1/jobs')
@UseGuards(AuthenticatedGuard)
export class JobsController {
  constructor(
    @Inject(JobsService) private readonly jobsService: JobsService,
    @Inject(JobEventsService) private readonly jobEventsService: JobEventsService,
  ) {}

  @Get()
  async getJobs(@Req() request: Request) {
    const jobs = await this.jobsService.findJobsForUser(request.session.userId!)
    return { jobs }
  }

  @Sse('events')
  jobEvents(@Req() request: Request): Observable<MessageEvent> {
    const userId = request.session.userId!
    return this.jobEventsService.events$.pipe(
      filter((event) => event.createdBy === userId),
      map((event) => ({ data: { id: event.id, status: event.status } })),
    )
  }

  @Get(':id/transcript-url')
  async getTranscriptUrl(@Param('id') id: string, @Req() request: Request) {
    return this.jobsService.getTranscriptDownloadUrl(request.session.userId!, id)
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
    if (!body.key || !body.filename) {
      throw new BadRequestException('key and filename are required')
    }

    const job = await this.jobsService.createJobFromUpload(
      request.session.userId!,
      body.key,
      body.filename,
    )
    return { job }
  }
}
