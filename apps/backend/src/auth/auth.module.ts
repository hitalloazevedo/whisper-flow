import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OAuthAccount } from './oauth-account.entity'
import { User } from './user.entity'
import { AuthService } from './auth.service'
import { AuthenticatedGuard } from './authenticated.guard'
import { AuthController } from './auth.controller'
import { GoogleStrategy } from './google.strategy'

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ session: false }),
    TypeOrmModule.forFeature([User, OAuthAccount]),
  ],
  controllers: [AuthController],
  providers: [GoogleStrategy, AuthService, AuthenticatedGuard],
  exports: [AuthService],
})
export class AuthModule {}
