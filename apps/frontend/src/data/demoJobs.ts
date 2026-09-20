import type { Job } from '../types'

function isoOffsetMs(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

export const initialJobs: Job[] = [
  {
    id: 'job-1024',
    status: 'completed',
    inputPath: 'uploads/user-1/customer-interview.m4a',
    originalFilename: 'customer-interview.m4a',
    outputPath: null,
    errorMessage: null,
    createdAt: isoOffsetMs(3600000),
    updatedAt: isoOffsetMs(3600000),
    startedAt: isoOffsetMs(3600000),
    completedAt: isoOffsetMs(1800000),
  },
  {
    id: 'job-1023',
    status: 'completed',
    inputPath: 'uploads/user-1/product-notes.wav',
    originalFilename: 'product-notes.wav',
    outputPath: null,
    errorMessage: null,
    createdAt: isoOffsetMs(86400000),
    updatedAt: isoOffsetMs(86400000),
    startedAt: isoOffsetMs(86400000),
    completedAt: isoOffsetMs(82800000),
  },
  {
    id: 'job-1022',
    status: 'processing',
    inputPath: 'uploads/user-1/research-call.mp3',
    originalFilename: 'research-call.mp3',
    outputPath: null,
    errorMessage: null,
    createdAt: isoOffsetMs(86400000),
    updatedAt: isoOffsetMs(600000),
    startedAt: isoOffsetMs(600000),
    completedAt: null,
  },
]
