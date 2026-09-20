import { useEffect, useRef } from 'react'
import { Loader2, Trash2, X } from 'lucide-react'
import { useDismissibleLayer } from '../hooks/useDismissibleLayer'
import type { Job } from '../types'

type DeleteConfirmModalProps = {
  job: Job
  onCancel: () => void
  onConfirm: () => void
  isDeleting?: boolean
  error?: string | null
}

export function DeleteConfirmModal({
  job,
  onCancel,
  onConfirm,
  isDeleting = false,
  error = null,
}: DeleteConfirmModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useDismissibleLayer(!isDeleting, modalRef, onCancel)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusableElements =
        modalRef.current.querySelectorAll<HTMLElement>('button:not([disabled])')
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

  return (
    <div className="modal-backdrop">
      <div
        ref={modalRef}
        className="upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">Delete transcript</p>
            <h2 id="delete-modal-title">Delete “{job.originalFilename}”?</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="modal-close"
            aria-label="Close delete dialog"
            onClick={onCancel}
            disabled={isDeleting}
          >
            <X size={18} />
          </button>
        </div>
        <p id="delete-modal-description" className="modal-description">
          This removes it from your transcript list. It won&apos;t be recoverable through the app
          after 60 days.
        </p>
        {error && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="modal-submit danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2 className="spin" size={14} aria-hidden="true" />
            ) : (
              <Trash2 size={14} aria-hidden="true" />
            )}
            {isDeleting ? 'Deleting...' : 'Delete transcript'}
          </button>
        </div>
      </div>
    </div>
  )
}
