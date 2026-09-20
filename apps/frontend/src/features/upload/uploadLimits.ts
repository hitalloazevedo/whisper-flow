import type { UploadLimits } from '../../types'

// Temporary local value until GET /api/upload-limits is available.
export const mockedUploadLimits: UploadLimits = {
  maxBytes: 2 * 1024 * 1024 * 1024,
  acceptedExtensions: ['mp3', 'wav', 'm4a', 'mp4', 'webm'],
}

export async function getUploadLimits(signal?: AbortSignal): Promise<UploadLimits> {
  const response = await fetch('/api/upload-limits', { signal })
  if (!response.ok) throw new Error('Upload limits unavailable')
  return response.json() as Promise<UploadLimits>
}

export function formatUploadLimit(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`
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
