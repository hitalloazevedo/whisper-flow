import { Controller, Get, HttpStatus, Inject, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
import type { GoogleUser } from './auth.types'

@Controller('api/v1/auth')
export class AuthController {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  startGoogleAuth() {
    return undefined
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() request: Request, @Res() response: Response) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL')
    request.session.user = request.user as GoogleUser
    response.redirect(frontendUrl)
  }

  @Get('me')
  getCurrentUser(@Req() request: Request) {
    return { user: request.session.user ?? null }
  }

  @Post('logout')
  logout(@Req() request: Request, @Res() response: Response) {
    const origin = request.get('origin')
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL')
    if (origin && origin !== frontendUrl) {
      return response.status(HttpStatus.FORBIDDEN).json({ message: 'Invalid request origin' })
    }

    request.session.destroy((error) => {
      if (error) return response.status(HttpStatus.INTERNAL_SERVER_ERROR).send()
      response.clearCookie('connect.sid', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      return response.status(HttpStatus.NO_CONTENT).send()
    })
  }
}
