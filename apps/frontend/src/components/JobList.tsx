import { CheckCircle2, Clock3, FileAudio } from 'lucide-react'
import type { Job } from '../types'

type JobListProps = { jobs: Job[] }

export function JobList({ jobs }: JobListProps) {
  return (
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
  )
}
