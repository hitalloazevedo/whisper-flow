import { AudioLines } from 'lucide-react'
import { GoogleIcon } from './GoogleIcon'

type AuthPageProps = {
  onGoogleSignIn: () => void
}

export function AuthPage({ onGoogleSignIn }: AuthPageProps) {
  return (
    <section className="auth-page">
      <div className="auth-panel">
        <span className="auth-mark">
          <AudioLines size={22} />
        </span>
        <p className="section-kicker">Private transcription workspace</p>
        <h1>Welcome back.</h1>
        <p className="auth-description">Turn your recordings into clear, searchable text.</p>
        <button className="google-button" onClick={onGoogleSignIn}>
          <GoogleIcon />
          Continue with Google
        </button>
        <p className="auth-legal">
          By continuing, you agree to keep your recordings private and secure.
        </p>
      </div>
    </section>
  )
}
