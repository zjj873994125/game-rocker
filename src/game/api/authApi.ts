import { apiRequest } from './client'

export type AuthRole = 'user' | 'super_admin'

export type AuthUserResponse = {
  id: number
  phone: string
  nickname: string
  role: AuthRole
  status: string
}

export type AuthResponse = {
  token: string
  expiresAt: string
  user: AuthUserResponse
}

export type LoginPayload = {
  phone: string
  password: string
}

export type RegisterPayload = LoginPayload & {
  nickname: string
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function register(payload: RegisterPayload) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCurrentUser() {
  return apiRequest<AuthUserResponse>('/auth/me')
}
