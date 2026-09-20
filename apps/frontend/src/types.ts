export type JobStatus = 'completed' | 'processing'

export type Job = {
  id: string
  filename: string
  status: JobStatus
  duration: string
  createdAt: string
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
