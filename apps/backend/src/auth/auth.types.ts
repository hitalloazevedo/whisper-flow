export type GoogleUser = {
  provider: 'google'
  providerId: string
  email: string
  displayName: string
  avatarUrl?: string
  emailVerified: boolean
}
