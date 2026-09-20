import { useEffect, useRef, useState } from 'react'
import { Loader2, UploadCloud, X } from 'lucide-react'
import { useDismissibleLayer } from '../hooks/useDismissibleLayer'
import { formatUploadLimit, validateUpload } from '../features/upload/uploadLimits'
import type { UploadLimits } from '../types'

type UploadModalProps = {
  limits: UploadLimits
  onClose: () => void
  onSubmit: (file: File) => Promise<void>
  isUploading?: boolean
  error?: string | null
}

export function UploadModal({
  limits,
  onClose,
  onSubmit,
  isUploading = false,
  error = null,
}: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useDismissibleLayer(true, modalRef, onClose)

  useEffect(() => {
    const previouslyFocusedElement = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    function trapFocus(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !modalRef.current) return
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled])',
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

  function selectFile(file: File | undefined) {
    if (!file) return
    const validationErr = validateUpload(file, limits)
    setSelectedFile(validationErr ? null : file)
    setValidationError(validationErr)
  }

  async function handleSubmit() {
    if (!selectedFile) return
    await onSubmit(selectedFile)
  }

  return (
    <div className="modal-backdrop">
      <div
        ref={modalRef}
        className="upload-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        aria-describedby="upload-modal-description"
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">New transcription</p>
            <h2 id="upload-modal-title">Choose your recording</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="modal-close"
            aria-label="Close upload dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p id="upload-modal-description" className="modal-description">
          Select an audio file to add it to your transcription queue.
        </p>
        <input
          ref={fileInputRef}
          className="file-input"
          type="file"
          accept={limits.acceptedExtensions.map((extension) => `.${extension}`).join(',')}
          onChange={(event) => selectFile(event.target.files?.[0])}
        />
        <button className="modal-file-picker" onClick={() => fileInputRef.current?.click()}>
          <span className="modal-upload-icon">
            <UploadCloud size={20} />
          </span>
          <span>
            <strong>{selectedFile ? selectedFile.name : 'Select an audio file'}</strong>
            <small>
              {selectedFile
                ? 'Ready to transcribe'
                : `${limits.acceptedExtensions.map((item) => item.toUpperCase()).join(', ')} · up to ${formatUploadLimit(limits.maxBytes)}`}
            </small>
          </span>
          <span className="picker-arrow">↗</span>
        </button>
        {validationError && (
          <p className="upload-error" role="alert">
            {validationError}
          </p>
        )}
        {error && (
          <p className="upload-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            className="modal-submit"
            disabled={!selectedFile || isUploading}
            onClick={handleSubmit}
          >
            {isUploading && <Loader2 className="spin" size={14} aria-hidden="true" />}
            {isUploading ? 'Uploading...' : 'Start transcription'}
          </button>
        </div>
      </div>
    </div>
  )
}
