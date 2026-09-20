export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type JobStatusEvent = {
  id: string
  status: JobStatus
}

export type Job = {
  id: string
  status: JobStatus
  inputPath: string
  originalFilename: string
  outputPath: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
}

export type UploadLimits = {
  maxBytes: number
  acceptedExtensions: string[]
}

export type AuthUser = {
  provider: 'google'
  providerId: string
  email: string
  displayName: string
  avatarUrl?: string
}

export type HealthCheckStatus = 'ok' | 'down'
export type HealthStatus = 'ok' | 'degraded' | 'down'

export type WorkerHeartbeat = {
  hostname: string
  pid: number
  status: string
  currentJobId: string | null
  lastSeenAt: string
  online: boolean
}

export type HealthResponse = {
  status: HealthStatus
  service: string
  checks: {
    database: { status: HealthCheckStatus }
    storage: { status: HealthCheckStatus }
    workers: {
      status: HealthCheckStatus
      total: number
      online: number
      workers: WorkerHeartbeat[]
    }
  }
}
