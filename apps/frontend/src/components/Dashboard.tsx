import { Plus, ShieldCheck, UploadCloud } from 'lucide-react'
import { formatUploadLimit } from '../features/upload/uploadLimits'
import type { Job, UploadLimits } from '../types'
import { JobList } from './JobList'
import { UploadModal } from './UploadModal'

type DashboardProps = {
  jobs: Job[]
  limits: UploadLimits
  uploadOpen: boolean
  onOpenUpload: () => void
  onCloseUpload: () => void
  onAddJob: (file: File) => void
}

export function Dashboard({
  jobs,
  limits,
  uploadOpen,
  onOpenUpload,
  onCloseUpload,
  onAddJob,
}: DashboardProps) {
  return (
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
          <button className="dropzone" onClick={onOpenUpload}>
            <span className="upload-icon">
              <Plus size={22} />
            </span>
            <strong>Choose an audio file</strong>
            <span>
              {limits.acceptedExtensions.map((extension) => extension.toUpperCase()).join(', ')} ·
              up to {formatUploadLimit(limits.maxBytes)}
            </span>
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
        <JobList jobs={jobs} />
      </section>
      <footer>
        <span>Whisper Flow</span>
        <span>Built for focused listening.</span>
      </footer>
      {uploadOpen && <UploadModal limits={limits} onClose={onCloseUpload} onSubmit={onAddJob} />}
    </>
  )
}
