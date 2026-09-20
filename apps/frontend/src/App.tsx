import { useEffect, useState } from 'react'
import { AudioLines } from 'lucide-react'
import { AccountMenu } from './components/AccountMenu'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { apiUrl } from './config/api'
import { initialJobs } from './data/demoJobs'
import { getUploadLimits, mockedUploadLimits } from './features/upload/uploadLimits'
import type { AuthUser, Job } from './types'

function App() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadLimits, setUploadLimits] = useState(mockedUploadLimits)

  useEffect(() => {
    const controller = new AbortController()

    fetch(apiUrl('/api/v1/health'), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        setApiStatus('online')
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setApiStatus('offline')
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    fetch(apiUrl('/api/v1/auth/me'), { credentials: 'include', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Session unavailable')
        return response.json() as Promise<{ user: AuthUser | null }>
      })
      .then(({ user: currentUser }) => {
        setUser(currentUser)
        setIsSignedIn(Boolean(currentUser))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setIsSignedIn(false)
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    getUploadLimits(controller.signal)
      .then(setUploadLimits)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // Keep the local fallback when the API is unavailable during development.
        setUploadLimits(mockedUploadLimits)
      })

    return () => controller.abort()
  }, [])

  function addJob(file: File) {
    setJobs((currentJobs) => [
      {
        id: `job-${Date.now()}`,
        filename: file.name,
        status: 'processing',
        duration: '—',
        createdAt: 'Just now',
      },
      ...currentJobs,
    ])
    setIsUploadModalOpen(false)
  }

  async function signOut() {
    setIsSigningOut(true)
    setLogoutError(null)
    try {
      const response = await fetch(apiUrl('/api/v1/auth/logout'), {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Sign out failed')
      setIsAccountMenuOpen(false)
      setUser(null)
      setIsSignedIn(false)
    } catch {
      setLogoutError('Unable to sign out. Please try again.')
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Whisper Flow home">
          <span className="brand-mark">
            <AudioLines size={19} />
          </span>
          <span>whisper flow</span>
        </a>
        {isSignedIn && user && (
          <div className="account-area">
            <span className={`api-indicator ${apiStatus}`}>
              <span className="indicator-dot" />
              {apiStatus === 'checking'
                ? 'Checking API'
                : apiStatus === 'online'
                  ? 'API online'
                  : 'API offline'}
            </span>
            <AccountMenu
              user={user}
              open={isAccountMenuOpen}
              onToggle={() => setIsAccountMenuOpen((open) => !open)}
              onDismiss={() => setIsAccountMenuOpen(false)}
              onSignOut={signOut}
              signingOut={isSigningOut}
              error={logoutError}
            />
          </div>
        )}
      </header>

      {isSignedIn ? (
        <Dashboard
          jobs={jobs}
          limits={uploadLimits}
          uploadOpen={isUploadModalOpen}
          onOpenUpload={() => setIsUploadModalOpen(true)}
          onCloseUpload={() => setIsUploadModalOpen(false)}
          onAddJob={addJob}
        />
      ) : (
        <AuthPage onGoogleSignIn={() => window.location.assign(apiUrl('/api/v1/auth/google'))} />
      )}
    </main>
  )
}

export default App
