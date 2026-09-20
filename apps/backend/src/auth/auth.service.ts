import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import type { GoogleUser } from './auth.types'
import { OAuthAccount } from './oauth-account.entity'
import { User } from './user.entity'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findOrCreateGoogleUser(profile: GoogleUser) {
    this.logger.log('findOrCreateGoogleUser -> ATTEMPTING', { email: profile.email })
    try {
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

      const user = await this.dataSource.transaction(async (transactionManager) => {
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
        const foundUser = await users.findOne({ where: { email: normalizedEmail } })
        if (!foundUser) throw new Error('User upsert did not return a user')

        await oauthAccounts.upsert(
          { provider: profile.provider, providerSubject: profile.providerId, userId: foundUser.id },
          ['provider', 'providerSubject'],
        )
        return foundUser
      })

      this.logger.log('findOrCreateGoogleUser -> SUCCESS', { userId: user.id })
      return user
    } catch (error) {
      this.logger.error('findOrCreateGoogleUser -> ERROR', {
        email: profile.email,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async findActiveUser(userId: string) {
    return this.dataSource.getRepository(User).findOne({ where: { id: userId, isActive: true } })
  }
}
