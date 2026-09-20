import { useEffect, useState } from 'react'
import { AudioLines } from 'lucide-react'
import { AccountMenu } from './components/AccountMenu'
import { AuthPage } from './components/AuthPage'
import { Dashboard } from './components/Dashboard'
import { apiUrl } from './config/api'
import { initialJobs } from './data/demoJobs'
import { getUploadLimits, mockedUploadLimits } from './features/upload/uploadLimits'
import type { Job } from './types'

function App() {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
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

    getUploadLimits(controller.signal)
      .then(setUploadLimits)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        // TODO: Remove the fallback when the backend exposes GET /api/upload-limits.
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

  function signOut() {
    setIsAccountMenuOpen(false)
    setIsSignedIn(false)
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
        {isSignedIn && (
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
              open={isAccountMenuOpen}
              onToggle={() => setIsAccountMenuOpen((open) => !open)}
              onDismiss={() => setIsAccountMenuOpen(false)}
              onSignOut={signOut}
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
        <AuthPage onGoogleSignIn={() => setIsSignedIn(true)} />
      )}
    </main>
  )
}

export default App
