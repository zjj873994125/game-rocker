export const AUTH_TOKEN_STORAGE_KEY = 'zjj-auth-token'

export function getStoredAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''
}

export function persistAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
}
