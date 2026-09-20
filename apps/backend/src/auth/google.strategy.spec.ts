import { describe, expect, it, vi } from 'vitest'
import { GoogleStrategy } from './google.strategy'

function createStrategy() {
  const configService = {
    getOrThrow: vi.fn((key: string) => `configured-${key}`),
  }
  return new GoogleStrategy(configService as never)
}

function createProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'google-123',
    displayName: 'Test User',
    emails: [{ value: 'user@example.com' }],
    photos: [{ value: 'https://example.com/avatar.jpg' }],
    _json: { email_verified: true },
    ...overrides,
  }
}

describe('GoogleStrategy', () => {
  it('maps a verified profile to a GoogleUser', () => {
    const strategy = createStrategy()

    const result = strategy.validate('token', 'refresh', createProfile() as never)

    expect(result).toEqual({
      provider: 'google',
      providerId: 'google-123',
      email: 'user@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      emailVerified: true,
    })
  })

  it('only treats a literal boolean true as verified', () => {
    const strategy = createStrategy()

    const result = strategy.validate(
      'token',
      'refresh',
      createProfile({ _json: { email_verified: 'true' } }) as never,
    )

    expect(result.emailVerified).toBe(false)
  })

  it('falls back to an empty email when Google returns none', () => {
    const strategy = createStrategy()

    const result = strategy.validate('token', 'refresh', createProfile({ emails: [] }) as never)

    expect(result.email).toBe('')
  })

  it('leaves avatarUrl undefined when Google returns no photos', () => {
    const strategy = createStrategy()

    const result = strategy.validate('token', 'refresh', createProfile({ photos: [] }) as never)

    expect(result.avatarUrl).toBeUndefined()
  })
})
