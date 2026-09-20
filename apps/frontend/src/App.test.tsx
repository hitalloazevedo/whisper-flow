import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me'))
        return Promise.resolve({ ok: true, json: async () => ({ user: null }) })
      if (url.includes('/upload-limits')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            maxBytes: 1024 * 1024,
            acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
          }),
        })
      }
      return Promise.resolve({ ok: true })
    }),
  )
})

afterEach(() => cleanup())

describe('frontend workspace flow', () => {
  it('shows the Google sign-in entry point', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('dismisses the account menu without signing out', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me'))
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: {
              provider: 'google',
              providerId: 'google-1',
              email: 'user@example.com',
              displayName: 'Test User',
              avatarUrl: 'https://example.com/avatar.jpg',
            },
          }),
        } as Response)
      return Promise.resolve({
        ok: true,
        json: async () => ({
          maxBytes: 1024 * 1024,
          acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
        }),
      } as Response)
    })
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Open account menu' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    await user.click(document.body)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByText('Bring your audio here')).toBeInTheDocument()
  })

  it('validates and submits a selected recording from the upload modal', async () => {
    const user = userEvent.setup()
    mockAuthenticatedSession()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Choose an audio file/ }))

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
    mockAuthenticatedSession()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Choose an audio file/ }))

    const input = screen.getByRole('dialog').querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['text'], 'notes.txt', { type: 'text/plain' })] },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Use one of these formats')
    expect(screen.getByRole('button', { name: 'Start transcription' })).toBeDisabled()
  })
})

function mockAuthenticatedSession() {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/auth/me'))
      return Promise.resolve({
        ok: true,
        json: async () => ({
          user: {
            provider: 'google',
            providerId: 'google-1',
            email: 'user@example.com',
            displayName: 'Test User',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        }),
      } as Response)
    if (url.includes('/upload-limits'))
      return Promise.resolve({
        ok: true,
        json: async () => ({
          maxBytes: 1024 * 1024,
          acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
        }),
      } as Response)
    return Promise.resolve({ ok: true } as Response)
  })
}
