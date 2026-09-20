import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
})

afterEach(() => cleanup())

describe('frontend workspace flow', () => {
  it('enters the workspace through Google sign-in', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(screen.getByText('Bring your audio here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open account menu' })).toBeInTheDocument()
  })

  it('dismisses the account menu without signing out', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await user.click(screen.getByRole('button', { name: 'Open account menu' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByText('Bring your audio here')).toBeInTheDocument()
  })

  it('validates and submits a selected recording from the upload modal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await user.click(screen.getByRole('button', { name: /Choose an audio file/ }))

    const dialog = screen.getByRole('dialog')
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['audio'], 'planning-call.mp3', { type: 'audio/mpeg' })
    await user.upload(input, file)

    expect(screen.getByText('planning-call.mp3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start transcription' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Start transcription' }))

    expect(screen.getByText('planning-call.mp3')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rejects unsupported files', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }))
    await user.click(screen.getByRole('button', { name: /Choose an audio file/ }))

    const input = screen.getByRole('dialog').querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Use one of these formats')
    expect(screen.getByRole('button', { name: 'Start transcription' })).toBeDisabled()
  })
})
