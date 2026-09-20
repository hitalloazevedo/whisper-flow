import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JobList } from './JobList'
import type { Job } from '../types'

function createJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    status: 'pending',
    inputPath: 'uploads/user-1/file.mp3',
    originalFilename: 'call.mp3',
    outputPath: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('JobList', () => {
  it.each(['pending', 'processing', 'failed'] as const)(
    'does not show a transcript button for a %s job',
    (status) => {
      render(<JobList jobs={[createJob({ status })]} onViewTranscript={vi.fn()} />)

      expect(screen.queryByRole('button', { name: /View transcript/ })).not.toBeInTheDocument()
    },
  )

  it('shows a transcript button for a completed job and calls onViewTranscript', async () => {
    const user = userEvent.setup()
    const onViewTranscript = vi.fn()
    const job = createJob({ status: 'completed', outputPath: 'transcripts/user-1/job-1.txt' })
    render(<JobList jobs={[job]} onViewTranscript={onViewTranscript} />)

    const button = screen.getByRole('button', { name: 'View transcript for call.mp3' })
    await user.click(button)

    expect(onViewTranscript).toHaveBeenCalledWith(job)
  })
})
