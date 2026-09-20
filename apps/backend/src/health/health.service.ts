import { Injectable } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { StorageService } from '../storage/storage.service'
import { WORKER_STALE_THRESHOLD_SECONDS } from './heartbeat-policy'
import { WorkerHeartbeat } from './worker-heartbeat.entity'

type CheckStatus = 'ok' | 'down'
type AggregateStatus = 'ok' | 'degraded' | 'down'

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(WorkerHeartbeat) private readonly heartbeats: Repository<WorkerHeartbeat>,
    private readonly storageService: StorageService,
  ) {}

  private async checkDatabase(): Promise<CheckStatus> {
    try {
      await this.dataSource.query('SELECT 1')
      return 'ok'
    } catch {
      return 'down'
    }
  }

  private async checkStorage(): Promise<CheckStatus> {
    try {
      await this.storageService.pingBucket()
      return 'ok'
    } catch {
      return 'down'
    }
  }

  private async checkWorkers() {
    try {
      const rows = await this.heartbeats.find()
      const cutoff = new Date(Date.now() - WORKER_STALE_THRESHOLD_SECONDS * 1000)
      const workers = rows.map((row) => ({
        hostname: row.hostname,
        pid: row.pid,
        status: row.status,
        currentJobId: row.currentJobId,
        lastSeenAt: row.lastSeenAt,
        online: row.lastSeenAt >= cutoff,
      }))
      const online = workers.filter((worker) => worker.online).length
      return { status: online > 0 ? 'ok' : 'down', total: workers.length, online, workers }
    } catch {
      return { status: 'down' as const, total: 0, online: 0, workers: [] }
    }
  }

  async getStatus() {
    const [database, storage, workersCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
      this.checkWorkers(),
    ])

    const statuses: AggregateStatus[] = [
      database === 'ok' ? 'ok' : 'down',
      storage === 'ok' ? 'ok' : 'down',
      workersCheck.status === 'ok' ? 'ok' : workersCheck.total === 0 ? 'degraded' : 'down',
    ]
    const status: AggregateStatus = statuses.includes('down')
      ? 'down'
      : statuses.includes('degraded')
        ? 'degraded'
        : 'ok'

    return {
      status,
      service: 'whisper-flow-api',
      checks: {
        database: { status: database },
        storage: { status: storage },
        workers: workersCheck,
      },
    }
  }
}
