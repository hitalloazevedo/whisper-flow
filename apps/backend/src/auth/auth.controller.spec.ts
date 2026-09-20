import { describe, expect, it, vi } from 'vitest'
import { AuthController } from './auth.controller'

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    redirect: vi.fn(),
    clearCookie: vi.fn(),
  }
}

function createRequest(origin = 'http://localhost:5173') {
  return {
    get: vi.fn(() => origin),
    session: {
      destroy: vi.fn((callback) => callback(null)),
      regenerate: vi.fn(),
      save: vi.fn(),
    },
  }
}

describe('AuthController security flows', () => {
  it('rejects logout requests without the trusted frontend origin', () => {
    const response = createResponse()
    const controller = new AuthController(
      { getOrThrow: vi.fn(() => 'http://localhost:5173') } as never,
      {} as never,
    )

    controller.logout(createRequest('https://attacker.example') as never, response as never)

    expect(response.status).toHaveBeenCalledWith(403)
    expect(response.json).toHaveBeenCalledWith({ message: 'Invalid request origin' })
  })

  it('destroys the session and clears the cookie for a trusted logout', () => {
    const response = createResponse()
    const request = createRequest()
    const controller = new AuthController(
      { getOrThrow: vi.fn(() => 'http://localhost:5173') } as never,
      {} as never,
    )

    controller.logout(request as never, response as never)

    expect(request.session.destroy).toHaveBeenCalled()
    expect(response.clearCookie).toHaveBeenCalledWith('connect.sid', expect.any(Object))
    expect(response.status).toHaveBeenCalledWith(204)
  })

  it('returns no user for an anonymous session', async () => {
    const controller = new AuthController(
      { getOrThrow: vi.fn(() => 'http://localhost:5173') } as never,
      { findActiveUser: vi.fn() } as never,
    )
    const request = { session: {} }

    await expect(controller.getCurrentUser(request as never)).resolves.toEqual({ user: null })
  })
})
