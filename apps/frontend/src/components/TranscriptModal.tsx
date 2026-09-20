import { useEffect, useRef, useState } from 'react'
import { Download, Loader2, X } from 'lucide-react'
import { useDismissibleLayer } from '../hooks/useDismissibleLayer'
import {
  fetchTranscriptText,
  getTranscriptDownloadUrl,
} from '../features/transcript/transcriptService'
import type { Job } from '../types'

type TranscriptModalProps = {
  job: Job
  onClose: () => void
}

type LoadState = 'loading' | 'ready' | 'error'

export function TranscriptModal({ job, onClose }: TranscriptModalProps) {
  const [status, setStatus] = useState<LoadState>('loading')
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [downloadBlobUrl, setDownloadBlobUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useDismissibleLayer(true, modalRef, onClose)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href]',
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      previouslyFocusedElement?.focus()
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    getTranscriptDownloadUrl(job.id)
      .then(async ({ url }) => {
        const text = await fetchTranscriptText(url)
        if (cancelled) return
        objectUrl = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
        setTranscriptText(text)
        setDownloadBlobUrl(objectUrl)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load transcript')
        setStatus('error')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [job.id])

  return (
    <div className="modal-backdrop">
      <div
        ref={modalRef}
        className="upload-modal transcript-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transcript-modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">Transcript</p>
            <h2 id="transcript-modal-title">{job.originalFilename}</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="modal-close"
            aria-label="Close transcript dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {status === 'loading' && (
          <p className="modal-description">
            <Loader2 className="spin" size={14} aria-hidden="true" /> Loading transcript...
          </p>
        )}

        {status === 'error' && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}

        {status === 'ready' && <pre className="transcript-text">{transcriptText}</pre>}

        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Close
          </button>
          {downloadBlobUrl && (
            <a
              className="modal-submit"
              href={downloadBlobUrl}
              download={`${job.originalFilename}.txt`}
            >
              <Download size={14} aria-hidden="true" />
              Download .txt
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
