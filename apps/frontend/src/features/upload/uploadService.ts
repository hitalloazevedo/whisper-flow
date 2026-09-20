import { apiUrl } from '../../config/api'
import type { Job } from '../../types'

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

export async function getPresignedUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string; expiresInSeconds: number }> {
  const response = await fetch(apiUrl('/api/v1/jobs/upload-url'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType }),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to get presigned upload URL'))
  }
  return response.json()
}

export async function uploadFileToS3(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'))
    })

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.send(file)
  })
}

export async function createJobFromUpload(key: string, filename: string): Promise<Job> {
  const response = await fetch(apiUrl('/api/v1/jobs'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, filename }),
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to create job'))
  }
  const data = (await response.json()) as { job: Job }
  return data.job
}

export async function fetchJobs(signal?: AbortSignal): Promise<Job[]> {
  const response = await fetch(apiUrl('/api/v1/jobs'), { credentials: 'include', signal })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to fetch jobs'))
  }
  const data = (await response.json()) as { jobs: Job[] }
  return data.jobs
}
