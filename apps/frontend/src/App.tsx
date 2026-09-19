import { useEffect, useState } from 'react'
import { AudioLines, CheckCircle2, Clock3, FileAudio, Plus, ShieldCheck, UploadCloud } from 'lucide-react'

type Job = {
  id: string
  filename: string
  status: 'completed' | 'processing'
  duration: string
  createdAt: string
}

const initialJobs: Job[] = [
  { id: 'job-1024', filename: 'customer-interview.m4a', status: 'completed', duration: '18:42', createdAt: 'Today, 09:24' },
  { id: 'job-1023', filename: 'product-notes.wav', status: 'completed', duration: '07:16', createdAt: 'Yesterday, 16:08' },
  { id: 'job-1022', filename: 'research-call.mp3', status: 'processing', duration: '12:03', createdAt: 'Yesterday, 15:41' },
]

function App() {
  const [jobs, setJobs] = useState(initialJobs)
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        setApiStatus('online')
      })
      .catch(() => setApiStatus('offline'))
  }, [])

  function addDemoJob() {
    setJobs((currentJobs) => [
      {
        id: `job-${Date.now()}`,
        filename: 'new-recording.webm',
        status: 'processing',
        duration: '—',
        createdAt: 'Just now',
      },
      ...currentJobs,
    ])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Whisper Flow home">
          <span className="brand-mark"><AudioLines size={19} /></span>
          <span>whisper flow</span>
        </a>
        <div className="account-area">
          <span className={`api-indicator ${apiStatus}`}>
            <span className="indicator-dot" />
            {apiStatus === 'checking' ? 'Checking API' : apiStatus === 'online' ? 'API online' : 'API offline'}
          </span>
          <button className="avatar" aria-label="Open account menu">HA</button>
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Personal transcription workspace</p>
          <h1>Turn conversation<br /><em>into momentum.</em></h1>
          <p className="hero-description">Drop in a recording and get a clear, searchable transcript while you keep moving.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="wave wave-one" />
          <div className="wave wave-two" />
          <div className="wave wave-three" />
          <div className="art-label">WHISPER<br />FLOW / 01</div>
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
          <button className="dropzone" onClick={addDemoJob}>
            <span className="upload-icon"><Plus size={22} /></span>
            <strong>Choose an audio file</strong>
            <span>MP3, WAV, M4A, MP4 or WEBM · up to 2 GB</span>
          </button>
          <div className="upload-note"><ShieldCheck size={15} /> Your recordings stay private to your workspace.</div>
        </div>

        <aside className="stats-panel">
          <p className="section-kicker">This month</p>
          <div className="stat-number">03<span> / 10</span></div>
          <p className="stat-label">transcriptions used</p>
          <div className="progress-track"><div className="progress-value" /></div>
          <div className="stat-footer"><span>7 remaining</span><span>Starter plan</span></div>
        </aside>
      </section>

      <section className="recent-section">
        <div className="recent-heading">
          <div><p className="section-kicker">Your library</p><h2>Recent transcriptions</h2></div>
          <button className="text-button">View all <span>↗</span></button>
        </div>
        <div className="job-list">
          {jobs.map((job) => (
            <article className="job-row" key={job.id}>
              <div className="file-icon"><FileAudio size={19} /></div>
              <div className="job-name"><strong>{job.filename}</strong><span>{job.createdAt}</span></div>
              <span className={`job-status ${job.status}`}>
                {job.status === 'completed' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                {job.status}
              </span>
              <span className="job-duration">{job.duration}</span>
              <button className="row-menu" aria-label={`Open ${job.filename} actions`}>•••</button>
            </article>
          ))}
        </div>
      </section>

      <footer><span>Whisper Flow</span><span>Built for focused listening.</span></footer>
    </main>
  )
}

export default App
