const API_URL = import.meta.env.VITE_API_URL

// An error from the API, with its HTTP status and any field errors
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

let authToken = null
let onUnauthorized = null

export function setAuthToken(token) {
  authToken = token
}

// Called when a logged-in request gets 401 (e.g. the token expired)
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// Downloads a file from the API (sending the login token) and saves it in the browser
export async function apiDownload(path, fallbackName) {
  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(response.status, data?.error ?? 'Download failed')
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? fallbackName
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?')
  }

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401 && authToken && onUnauthorized) {
      onUnauthorized()
    }
    throw new ApiError(response.status, data?.error ?? 'Something went wrong', data?.details)
  }

  return data
}
