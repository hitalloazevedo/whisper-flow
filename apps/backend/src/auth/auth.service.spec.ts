import { describe, expect, it, vi } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'

function createService() {
  const users = {
    findOne: vi.fn(),
    upsert: vi.fn(),
    save: vi.fn(async (value) => ({ id: 'user-1', ...value })),
  }
  const oauthAccounts = {
    findOne: vi.fn(),
    upsert: vi.fn(),
  }
  const transactionManager = {
    getRepository: vi.fn((entity) => (entity.name === 'User' ? users : oauthAccounts)),
  }
  const dataSource = { transaction: vi.fn(async (callback) => callback(transactionManager)) }
  return { service: new AuthService(dataSource as never), users, oauthAccounts }
}

const verifiedProfile = {
  provider: 'google' as const,
  providerId: 'google-123',
  email: 'user@example.com',
  displayName: 'Test User',
  avatarUrl: 'https://example.com/avatar.jpg',
  emailVerified: true,
}

describe('AuthService', () => {
  it('rejects Google profiles without a verified email', async () => {
    const { service } = createService()

    await expect(
      service.findOrCreateGoogleUser({ ...verifiedProfile, emailVerified: false }),
    ).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('creates a local user and OAuth link for a new Google identity', async () => {
    const { service, users, oauthAccounts } = createService()
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
    oauthAccounts.findOne.mockResolvedValue(null)

    const user = await service.findOrCreateGoogleUser(verifiedProfile)

    expect(user.id).toBe('user-1')
    expect(users.upsert).toHaveBeenCalledWith(
      {
        email: verifiedProfile.email,
        displayName: verifiedProfile.displayName,
        avatarUrl: verifiedProfile.avatarUrl,
      },
      ['email'],
    )
    expect(oauthAccounts.upsert).toHaveBeenCalledWith(
      { provider: 'google', providerSubject: verifiedProfile.providerId, userId: 'user-1' },
      ['provider', 'providerSubject'],
    )
  })

  it('normalizes email and display name before persistence', async () => {
    const { service, users, oauthAccounts } = createService()
    users.findOne.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })
    oauthAccounts.findOne.mockResolvedValue(null)

    await service.findOrCreateGoogleUser({
      ...verifiedProfile,
      email: ' USER@EXAMPLE.COM ',
      displayName: ' Test User ',
    })

    expect(users.upsert).toHaveBeenCalledWith(
      { email: 'user@example.com', displayName: 'Test User', avatarUrl: verifiedProfile.avatarUrl },
      ['email'],
    )
  })

  it('updates the existing linked user without creating another account', async () => {
    const { service, users, oauthAccounts } = createService()
    const existingUser = {
      id: 'user-1',
      email: 'old@example.com',
      displayName: 'Old Name',
      avatarUrl: null,
      isActive: false,
    }
    oauthAccounts.findOne.mockResolvedValue({ user: existingUser })

    const user = await service.findOrCreateGoogleUser(verifiedProfile)

    expect(user).toEqual({
      ...existingUser,
      email: verifiedProfile.email,
      displayName: verifiedProfile.displayName,
      avatarUrl: verifiedProfile.avatarUrl,
      isActive: true,
    })
    expect(users.save).toHaveBeenCalledWith(existingUser)
    expect(oauthAccounts.upsert).not.toHaveBeenCalled()
  })
})
