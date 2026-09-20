import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { GoogleUser } from './auth.types'
import { OAuthAccount } from './oauth-account.entity'
import { User } from './user.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(OAuthAccount) private readonly oauthAccounts: Repository<OAuthAccount>,
  ) {}

  async findOrCreateGoogleUser(profile: GoogleUser) {
    if (!profile.providerId || !profile.email || !profile.emailVerified) {
      throw new UnauthorizedException('Google account email is not verified')
    }

    let account = await this.oauthAccounts.findOne({
      where: { provider: profile.provider, providerSubject: profile.providerId },
      relations: { user: true },
    })

    if (account) {
      account.user.email = profile.email
      account.user.displayName = profile.displayName
      account.user.avatarUrl = profile.avatarUrl ?? null
      account.user.isActive = true
      return this.users.save(account.user)
    }

    let user = await this.users.findOne({ where: { email: profile.email } })
    if (!user) {
      user = await this.users.save(
        this.users.create({
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl ?? null,
        }),
      )
    }

    account = this.oauthAccounts.create({
      provider: profile.provider,
      providerSubject: profile.providerId,
      userId: user.id,
    })
    await this.oauthAccounts.save(account)
    return user
  }

  async findActiveUser(userId: string) {
    return this.users.findOne({ where: { id: userId, isActive: true } })
  }
}
