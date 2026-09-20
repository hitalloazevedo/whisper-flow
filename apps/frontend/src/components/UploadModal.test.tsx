import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UploadModal } from './UploadModal'
import type { UploadLimits } from '../types'

const limits: UploadLimits = {
  maxBytes: 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

afterEach(() => cleanup())

describe('UploadModal', () => {
  it('shows a spinning indicator on the submit button while uploading', () => {
    render(<UploadModal limits={limits} onClose={vi.fn()} onSubmit={vi.fn()} isUploading={true} />)

    const submitButton = screen.getByRole('button', { name: 'Uploading...' })
    expect(submitButton).toBeDisabled()
    expect(submitButton.querySelector('.spin')).toBeInTheDocument()
  })

  it('does not show the spinner or loading label before submitting', () => {
    render(<UploadModal limits={limits} onClose={vi.fn()} onSubmit={vi.fn()} />)

    const submitButton = screen.getByRole('button', { name: 'Start transcription' })
    expect(submitButton.querySelector('.spin')).not.toBeInTheDocument()
  })

  it('disables cancel while uploading', () => {
    render(<UploadModal limits={limits} onClose={vi.fn()} onSubmit={vi.fn()} isUploading={true} />)

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
