import { CheckCircle2, Clock3, FileAudio } from 'lucide-react'
import type { Job } from '../types'

type JobListProps = { jobs: Job[] }

function formatDate(date: string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString()
}

export function JobList({ jobs }: JobListProps) {
  if (!jobs || jobs.length === 0) {
    return <div className="job-list" />
  }

  return (
    <div className="job-list">
      {jobs.map((job) => (
        <article className="job-row" key={job.id}>
          <div className="file-icon">
            <FileAudio size={19} />
          </div>
          <div className="job-name">
            <strong>{job.originalFilename}</strong>
            <span>{formatDate(job.createdAt)}</span>
          </div>
          <span className={`job-status ${job.status}`}>
            {job.status === 'completed' ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
            {job.status}
          </span>
          <span className="job-duration">—</span>
          <button className="row-menu" aria-label={`Open ${job.originalFilename} actions`}>
            •••
          </button>
        </article>
      ))}
    </div>
  )
}
