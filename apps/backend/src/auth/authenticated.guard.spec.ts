import { describe, expect, it } from 'vitest'
import { UnauthorizedException } from '@nestjs/common'
import { AuthenticatedGuard } from './authenticated.guard'

describe('AuthenticatedGuard', () => {
  it('allows a request with a session user ID', () => {
    const guard = new AuthenticatedGuard()
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ session: { userId: 'user-1' } }) }),
    }

    expect(guard.canActivate(context as never)).toBe(true)
  })

  it('rejects a request without a session user ID', () => {
    const guard = new AuthenticatedGuard()
    const context = { switchToHttp: () => ({ getRequest: () => ({ session: {} }) }) }

    expect(() => guard.canActivate(context as never)).toThrow(UnauthorizedException)
  })
})
