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
