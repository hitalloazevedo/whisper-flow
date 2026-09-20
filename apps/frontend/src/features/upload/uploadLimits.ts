import type { UploadLimits } from '../../types'
import { apiUrl } from '../../config/api'

// Temporary fallback for local development if GET /api/v1/upload-limits is unavailable.
export const mockedUploadLimits: UploadLimits = {
  maxBytes: 50 * 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

export async function getUploadLimits(signal?: AbortSignal): Promise<UploadLimits> {
  const response = await fetch(apiUrl('/api/v1/upload-limits'), { signal })
  if (!response.ok) throw new Error('Upload limits unavailable')
  return response.json() as Promise<UploadLimits>
}

export function formatUploadLimit(bytes: number) {
  const gigabytes = bytes / 1024 / 1024 / 1024
  if (gigabytes >= 1) return `${Math.round(gigabytes)} GB`
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

export function validateUpload(file: File, limits: UploadLimits): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!extension || !limits.acceptedExtensions.includes(extension)) {
    return `Use one of these formats: ${limits.acceptedExtensions.map((item) => item.toUpperCase()).join(', ')}.`
  }

  if (file.size > limits.maxBytes) {
    return `Choose a file smaller than ${formatUploadLimit(limits.maxBytes)}.`
  }

  return null
}
