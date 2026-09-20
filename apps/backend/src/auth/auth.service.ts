import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { GoogleUser } from './auth.types'
import { OAuthAccount } from './oauth-account.entity'
import { User } from './user.entity'

@Injectable()
export class AuthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findOrCreateGoogleUser(profile: GoogleUser) {
    const normalizedEmail = profile.email.trim().toLowerCase()
    const normalizedDisplayName = profile.displayName.trim()
    if (
      !profile.providerId ||
      !normalizedEmail ||
      !profile.emailVerified ||
      !normalizedDisplayName
    ) {
      throw new UnauthorizedException('Google account email is not verified')
    }

    return this.dataSource.transaction(async (transactionManager) => {
      const users = transactionManager.getRepository(User)
      const oauthAccounts = transactionManager.getRepository(OAuthAccount)
      const account = await oauthAccounts.findOne({
        where: { provider: profile.provider, providerSubject: profile.providerId },
        relations: { user: true },
      })

      if (account) {
        account.user.email = normalizedEmail
        account.user.displayName = normalizedDisplayName
        account.user.avatarUrl = profile.avatarUrl ?? null
        account.user.isActive = true
        return users.save(account.user)
      }

      await users.upsert(
        {
          email: normalizedEmail,
          displayName: normalizedDisplayName,
          avatarUrl: profile.avatarUrl ?? null,
        },
        ['email'],
      )
      const user = await users.findOne({ where: { email: normalizedEmail } })
      if (!user) throw new Error('User upsert did not return a user')

      await oauthAccounts.upsert(
        { provider: profile.provider, providerSubject: profile.providerId, userId: user.id },
        ['provider', 'providerSubject'],
      )
      return user
    })
  }

  async findActiveUser(userId: string) {
    return this.dataSource.getRepository(User).findOne({ where: { id: userId, isActive: true } })
  }
}
