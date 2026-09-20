import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => body } as Response)
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const authenticatedUser = {
  provider: 'google' as const,
  providerId: 'google-1',
  email: 'user@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
}

const uploadLimitsResponse = {
  maxBytes: 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/auth/me')) return jsonResponse({ user: null })
      if (url.includes('/upload-limits')) return jsonResponse(uploadLimitsResponse)
      if (url.endsWith('/api/v1/jobs')) return jsonResponse({ jobs: [] })
      return jsonResponse({})
    }),
  )

  class XMLHttpRequestMock {
    status = 0
    upload = { addEventListener: vi.fn() }
    private listeners: Record<string, Array<() => void>> = {}

    open = vi.fn()
    setRequestHeader = vi.fn()
    addEventListener = vi.fn((type: string, listener: () => void) => {
      this.listeners[type] = [...(this.listeners[type] ?? []), listener]
    })
    send = vi.fn(() => {
      setTimeout(() => {
        this.status = 200
        this.listeners.load?.forEach((listener) => listener())
      }, 0)
    })
  }

  vi.stubGlobal('XMLHttpRequest', XMLHttpRequestMock as unknown as typeof XMLHttpRequest)
})

afterEach(() => cleanup())

describe('frontend workspace flow', () => {
  it('shows the Google sign-in entry point', async () => {
    render(<App />)

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('dismisses the account menu without signing out', async () => {
    const user = userEvent.setup()
    mockAuthenticatedSession()
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

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('planning-call.mp3')).toBeInTheDocument()
  })

  it('keeps the submit button spinning until the job is created', async () => {
    const user = userEvent.setup()
    const jobCreated = createDeferred<Response>()
    mockAuthenticatedSession({ jobCreatedResponse: jobCreated.promise })
    render(<App />)
    await user.click(await screen.findByRole('button', { name: /Choose an audio file/ }))

    const dialog = screen.getByRole('dialog')
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(input, new File(['audio'], 'planning-call.mp3', { type: 'audio/mpeg' }))
    await user.click(screen.getByRole('button', { name: 'Start transcription' }))

    const submitButton = await waitFor(() => screen.getByRole('button', { name: 'Uploading...' }))
    expect(submitButton).toBeDisabled()
    expect(submitButton.querySelector('.spin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    jobCreated.resolve(
      (await jsonResponse({
        job: {
          id: 'job-new',
          status: 'pending',
          inputPath: 'uploads/user-1/generated-id.mp3',
          originalFilename: 'planning-call.mp3',
          outputPath: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
        },
      })) as Response,
    )

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('planning-call.mp3')).toBeInTheDocument()
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

function mockAuthenticatedSession(options?: { jobCreatedResponse?: Promise<Response> }) {
  vi.mocked(fetch).mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (url.includes('/auth/me')) return jsonResponse({ user: authenticatedUser })
    if (url.includes('/upload-limits')) return jsonResponse(uploadLimitsResponse)
    if (url.endsWith('/jobs/upload-url') && method === 'POST') {
      return jsonResponse({
        uploadUrl: 'https://storage.local/signed',
        key: 'pending-uploads/user-1/generated-id.mp3',
        expiresInSeconds: 900,
      })
    }
    if (url.endsWith('/api/v1/jobs') && method === 'POST') {
      if (options?.jobCreatedResponse) return options.jobCreatedResponse
      return jsonResponse({
        job: {
          id: 'job-new',
          status: 'pending',
          inputPath: 'uploads/user-1/generated-id.mp3',
          originalFilename: 'planning-call.mp3',
          outputPath: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
        },
      })
    }
    if (url.endsWith('/api/v1/jobs')) return jsonResponse({ jobs: [] })
    return jsonResponse({})
  })
}
