import { apiFetch } from '../../config/apiClient'

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

export async function getTranscriptDownloadUrl(
  jobId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const response = await apiFetch(`/api/v1/jobs/${jobId}/transcript-url`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to get transcript URL'))
  }
  return response.json()
}

export async function fetchTranscriptText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to load transcript')
  }
  return response.text()
}

export async function deleteJob(jobId: string): Promise<void> {
  const response = await apiFetch(`/api/v1/jobs/${jobId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response, 'Failed to delete transcript'))
  }
}
