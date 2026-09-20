import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from 'pg'
import { Subject } from 'rxjs'
import { JobStatus } from './job.entity'

const NEW_JOB_CHANNEL = 'new_job'
const RECONNECT_DELAY_MS = 2000

export interface JobEventPayload {
  event: 'insert' | 'update'
  id: string
  status: JobStatus
  createdBy: string
}

@Injectable()
export class JobEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobEventsService.name)
  private readonly databaseUrl: string
  private client: Client | null = null
  private isShuttingDown = false
  private reconnectScheduled = false

  readonly events$ = new Subject<JobEventPayload>()

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.databaseUrl = configService.getOrThrow<string>('DATABASE_URL')
  }

  async onModuleInit(): Promise<void> {
    await this.connect()
  }

  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true
    await this.client?.end()
  }

  private async connect(): Promise<void> {
    this.logger.log('connect -> ATTEMPTING', { channel: NEW_JOB_CHANNEL })
    const client = new Client({ connectionString: this.databaseUrl })

    client.on('notification', (message) => {
      if (!message.payload) return
      try {
        this.events$.next(JSON.parse(message.payload) as JobEventPayload)
      } catch (error) {
        this.logger.error('connect -> ERROR', {
          reason: 'malformed job notification payload',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    })

    client.on('error', (error) => {
      this.logger.error('connect -> ERROR', { reason: 'connection error', error: error.message })
      this.scheduleReconnect()
    })

    client.on('end', () => {
      this.scheduleReconnect()
    })

    try {
      await client.connect()
      await client.query(`LISTEN ${NEW_JOB_CHANNEL}`)
      this.client = client
      this.logger.log('connect -> SUCCESS', { channel: NEW_JOB_CHANNEL })
    } catch (error) {
      this.logger.error('connect -> ERROR', {
        reason: 'failed to connect',
        error: error instanceof Error ? error.message : String(error),
      })
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectScheduled) return
    this.reconnectScheduled = true
    this.client = null
    setTimeout(() => {
      this.reconnectScheduled = false
      void this.connect()
    }, RECONNECT_DELAY_MS)
  }
}
