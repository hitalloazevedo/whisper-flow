import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from '@nestjs/passport'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import type { GoogleUser } from './auth.types'
import { AuthService } from './auth.service'

@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Get('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('google'))
  startGoogleAuth() {
    return undefined
  }

  @Get('google/callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() request: Request, @Res() response: Response) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL')
    const user = await this.authService.findOrCreateGoogleUser(request.user as GoogleUser)
    this.logger.log({ event: 'auth_google_success', userId: user.id })

    request.session.regenerate((error) => {
      if (error) return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
      request.session.userId = user.id
      request.session.save((saveError) => {
        if (saveError) return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
        return response.redirect(frontendUrl)
      })
    })
  }

  @Get('me')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getCurrentUser(@Req() request: Request) {
    if (!request.session.userId) return { user: null }
    const user = await this.authService.findActiveUser(request.session.userId)
    return { user: user ?? null }
  }

  @Post('logout')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  logout(@Req() request: Request, @Res() response: Response) {
    const origin = request.get('origin')
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL')
    if (origin !== new URL(frontendUrl).origin) {
      return response.status(HttpStatus.FORBIDDEN).json({ message: 'Invalid request origin' })
    }

    request.session.destroy((error) => {
      if (error) return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
      response.clearCookie('connect.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      this.logger.log({ event: 'auth_logout_success' })
      return response.status(HttpStatus.NO_CONTENT).send()
    })
  }
}
