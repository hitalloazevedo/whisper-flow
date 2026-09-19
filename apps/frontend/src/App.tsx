import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  CheckCircle2,
  Clock3,
  FileAudio,
  LogOut,
  Plus,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'

type Job = {
  id: string
  filename: string
  status: 'completed' | 'processing'
  duration: string
  createdAt: string
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="google-icon" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.84-1.7 2.9-4.2 2.9-7.29Z"
      />
      <path
        fill="#34A853"
        d="M12 21.8c2.63 0 4.84-.87 6.45-2.36l-3.15-2.45c-.87.58-1.98.92-3.3.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.53A9.74 9.74 0 0 0 12 21.8Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.88a5.86 5.86 0 0 1 0-3.76V7.59H3.28a9.8 9.8 0 0 0 0 8.82l3.25-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.09c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.2 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.72 5.29l3.25 2.53C7.3 7.81 9.46 6.09 12 6.09Z"
      />
    </svg>
  )
}

const initialJobs: Job[] = [
  {
    id: 'job-1024',
    filename: 'customer-interview.m4a',
    status: 'completed',
    duration: '18:42',
    createdAt: 'Today, 09:24',
  },
  {
    id: 'job-1023',
    filename: 'product-notes.wav',
    status: 'completed',
    duration: '07:16',
    createdAt: 'Yesterday, 16:08',
  },
  {
    id: 'job-1022',
    filename: 'research-call.mp3',
    status: 'processing',
    duration: '12:03',
    createdAt: 'Yesterday, 15:41',
  },
]

function App() {
  const [jobs, setJobs] = useState(initialJobs)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const uploadModalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        setApiStatus('online')
      })
      .catch(() => setApiStatus('offline'))
  }, [])

  useEffect(() => {
    if (!isAccountMenuOpen) return

    function closeMenu(event: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false)
      }
    }

    function closeMenuWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsAccountMenuOpen(false)
    }

    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeMenuWithEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeMenuWithEscape)
    }
  }, [isAccountMenuOpen])

  useEffect(() => {
    if (!isUploadModalOpen) return

    function closeModal(event: MouseEvent) {
      if (uploadModalRef.current && !uploadModalRef.current.contains(event.target as Node)) {
        setIsUploadModalOpen(false)
      }
    }

    function closeModalWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsUploadModalOpen(false)
    }

    document.addEventListener('mousedown', closeModal)
    document.addEventListener('keydown', closeModalWithEscape)
    return () => {
      document.removeEventListener('mousedown', closeModal)
      document.removeEventListener('keydown', closeModalWithEscape)
    }
  }, [isUploadModalOpen])

  function addDemoJob(filename = 'new-recording.webm') {
    setJobs((currentJobs) => [
      {
        id: `job-${Date.now()}`,
        filename,
        status: 'processing',
        duration: '—',
        createdAt: 'Just now',
      },
      ...currentJobs,
    ])
    setSelectedFile(null)
    setIsUploadModalOpen(false)
  }

  function openUploadModal() {
    setSelectedFile(null)
    setIsUploadModalOpen(true)
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
            <div className="account-menu-wrapper" ref={accountMenuRef}>
              <button
                className="avatar"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              >
                HA
              </button>
              {isAccountMenuOpen && (
                <div className="account-menu" role="menu">
                  <div className="account-menu-profile">
                    <span className="menu-avatar">HA</span>
                    <div>
                      <strong>Hitallo Azevedo</strong>
                      <span>Personal workspace</span>
                    </div>
                  </div>
                  <div className="menu-divider" />
                  <button
                    className="sign-out-button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false)
                      setIsSignedIn(false)
                    }}
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {!isSignedIn ? (
        <section className="auth-page">
          <div className="auth-panel">
            <span className="auth-mark">
              <AudioLines size={22} />
            </span>
            <p className="section-kicker">Private transcription workspace</p>
            <h1>Welcome back.</h1>
            <p className="auth-description">Turn your recordings into clear, searchable text.</p>
            <button className="google-button" onClick={() => setIsSignedIn(true)}>
              <GoogleIcon />
              Continue with Google
            </button>
            <p className="auth-legal">
              By continuing, you agree to keep your recordings private and secure.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">Personal transcription workspace</p>
              <h1>
                Turn conversation
                <br />
                <em>into momentum.</em>
              </h1>
              <p className="hero-description">
                Drop in a recording and get a clear, searchable transcript while you keep moving.
              </p>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="wave wave-one" />
              <div className="wave wave-two" />
              <div className="wave wave-three" />
              <div className="art-label">
                WHISPER
                <br />
                FLOW / 01
              </div>
            </div>
          </section>

          <section className="workspace-grid">
            <div className="upload-panel">
              <div className="panel-heading">
                <div>
                  <p className="section-kicker">New transcription</p>
                  <h2>Bring your audio here</h2>
                </div>
                <UploadCloud size={22} strokeWidth={1.5} />
              </div>
              <button className="dropzone" onClick={openUploadModal}>
                <span className="upload-icon">
                  <Plus size={22} />
                </span>
                <strong>Choose an audio file</strong>
                <span>MP3, WAV, M4A, MP4 or WEBM · up to 2 GB</span>
              </button>
              <div className="upload-note">
                <ShieldCheck size={15} /> Your recordings stay private to your workspace.
              </div>
            </div>

            <aside className="stats-panel">
              <p className="section-kicker">This month</p>
              <div className="stat-number">
                03<span> / 10</span>
              </div>
              <p className="stat-label">transcriptions used</p>
              <div className="progress-track">
                <div className="progress-value" />
              </div>
              <div className="stat-footer">
                <span>7 remaining</span>
                <span>Starter plan</span>
              </div>
            </aside>
          </section>

          <section className="recent-section">
            <div className="recent-heading">
              <div>
                <p className="section-kicker">Your library</p>
                <h2>Recent transcriptions</h2>
              </div>
              <button className="text-button">
                View all <span>↗</span>
              </button>
            </div>
            <div className="job-list">
              {jobs.map((job) => (
                <article className="job-row" key={job.id}>
                  <div className="file-icon">
                    <FileAudio size={19} />
                  </div>
                  <div className="job-name">
                    <strong>{job.filename}</strong>
                    <span>{job.createdAt}</span>
                  </div>
                  <span className={`job-status ${job.status}`}>
                    {job.status === 'completed' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                    {job.status}
                  </span>
                  <span className="job-duration">{job.duration}</span>
                  <button className="row-menu" aria-label={`Open ${job.filename} actions`}>
                    •••
                  </button>
                </article>
              ))}
            </div>
          </section>

          <footer>
            <span>Whisper Flow</span>
            <span>Built for focused listening.</span>
          </footer>

          {isUploadModalOpen && (
            <div className="modal-backdrop">
              <div
                ref={uploadModalRef}
                className="upload-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-modal-title"
              >
                <div className="modal-header">
                  <div>
                    <p className="section-kicker">New transcription</p>
                    <h2 id="upload-modal-title">Choose your recording</h2>
                  </div>
                  <button
                    className="modal-close"
                    aria-label="Close upload dialog"
                    onClick={() => setIsUploadModalOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="modal-description">
                  Select an audio file to add it to your transcription queue.
                </p>
                <input
                  ref={fileInputRef}
                  className="file-input"
                  type="file"
                  accept="audio/*,video/mp4,video/webm"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
                <button className="modal-file-picker" onClick={() => fileInputRef.current?.click()}>
                  <span className="modal-upload-icon">
                    <UploadCloud size={20} />
                  </span>
                  <span>
                    <strong>{selectedFile ? selectedFile.name : 'Select an audio file'}</strong>
                    <small>
                      {selectedFile ? 'Ready to transcribe' : 'MP3, WAV, M4A, MP4 or WEBM'}
                    </small>
                  </span>
                  <span className="picker-arrow">↗</span>
                </button>
                <div className="modal-actions">
                  <button className="modal-cancel" onClick={() => setIsUploadModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="modal-submit"
                    disabled={!selectedFile}
                    onClick={() => selectedFile && addDemoJob(selectedFile.name)}
                  >
                    Start transcription
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}

export default App
