const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = configuredBaseUrl || '/api'

type HeadersRecord = Record<string, string>

function joinApiUrl(path: string) {
  const base = apiBaseUrl.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${base}${normalizedPath}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = buildHeaders(init?.headers)
  const response = await fetch(joinApiUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    const message = await readErrorMessage(response)
    throw new Error(message || `请求失败：${response.status}`)
  }

  if (response.status === 204) return undefined as T

  return await response.json() as T
}

function buildHeaders(headers?: HeadersInit) {
  const result: HeadersRecord = {
    'Content-Type': 'application/json',
  }

  new Headers(headers).forEach((value, key) => {
    result[key] = value
  })

  const token = localStorage.getItem('zjj-auth-token')
  if (token) {
    result.Authorization = `Bearer ${token}`
  }

  return result
}

async function readErrorMessage(response: Response) {
  try {
    const payload = await response.json() as { error?: string }
    return payload.error ?? ''
  } catch {
    return ''
  }
}
