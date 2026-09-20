import type { Job } from '../types'

export const initialJobs: Job[] = [
  {
    id: 'job-1024',
    filename: 'customer-interview.m4a',
    status: 'completed',
    duration: '18:42',
    createdAt: 'Today, 09:24',
  },
  {
    id: 'job-1023',
    filename: 'product-notes.wav',
    status: 'completed',
    duration: '07:16',
    createdAt: 'Yesterday, 16:08',
  },
  {
    id: 'job-1022',
    filename: 'research-call.mp3',
    status: 'processing',
    duration: '12:03',
    createdAt: 'Yesterday, 15:41',
  },
]
