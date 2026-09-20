import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TranscriptModal } from './TranscriptModal'
import type { Job } from '../types'

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response)
}

const job: Job = {
  id: 'job-1',
  status: 'completed',
  inputPath: 'uploads/user-1/call.mp3',
  originalFilename: 'call.mp3',
  outputPath: 'transcripts/user-1/job-1.txt',
  errorMessage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  startedAt: null,
  completedAt: new Date().toISOString(),
}

afterEach(() => vi.unstubAllGlobals())

describe('TranscriptModal', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-transcript-url')
    URL.revokeObjectURL = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/transcript-url')) {
          return jsonResponse({
            url: 'https://storage.local/signed-transcript',
            expiresInSeconds: 300,
          })
        }
        if (url === 'https://storage.local/signed-transcript') {
          return Promise.resolve({
            ok: true,
            text: async () => 'Hello, this is the transcript.',
          } as Response)
        }
        return jsonResponse({})
      }),
    )
  })

  it('shows a loading state, then the transcript text', async () => {
    render(<TranscriptModal job={job} onClose={vi.fn()} />)

    expect(screen.getByText(/Loading transcript/)).toBeInTheDocument()

    expect(await screen.findByText('Hello, this is the transcript.')).toBeInTheDocument()
  })

  it('offers a download link backed by a same-origin blob URL, not the cross-origin presigned URL', async () => {
    render(<TranscriptModal job={job} onClose={vi.fn()} />)

    const link = await screen.findByRole('link', { name: /Download .txt/ })
    expect(link).toHaveAttribute('href', 'blob:mock-transcript-url')
    expect(link).toHaveAttribute('download', 'call.mp3.txt')
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'text/plain' }),
    )
  })

  it('shows an error state when fetching the transcript URL fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ message: 'Transcript is not available' }, false)),
    )

    render(<TranscriptModal job={job} onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Transcript is not available')
  })
})
