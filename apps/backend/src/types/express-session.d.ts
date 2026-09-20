import type { GoogleUser } from '../auth/auth.types'

declare module 'express-session' {
  interface SessionData {
    user?: GoogleUser
  }
}
