import { defineStore } from 'pinia'
import { clearAuthToken, getStoredAuthToken, persistAuthToken } from '../game/api/authToken'
import * as authApi from '../game/api/authApi'

export type AuthRole = 'guest' | authApi.AuthRole

export type AuthUser = {
  id: number
  phone: string
  nickname: string
  role: authApi.AuthRole
}

type AuthMode = 'login' | 'register'

type AuthState = {
  user: AuthUser | null
  authDialogVisible: boolean
  authMode: AuthMode
  redirectAfterLogin: string
  loaded: boolean
}

const CURRENT_USER_STORAGE_KEY = 'zjj-auth-current-user'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    authDialogVisible: false,
    authMode: 'login',
    redirectAfterLogin: '',
    loaded: false,
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.user),
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    displayName: (state) => state.user?.nickname || state.user?.phone || '游客',
  },

  actions: {
    loadFromStorage() {
      if (this.loaded) return

      this.user = getStoredAuthToken() ? readCurrentUser() : null
      this.loaded = true
    },

    openAuthDialog(mode: AuthMode = 'login', redirectTo = '') {
      this.authMode = mode
      this.redirectAfterLogin = redirectTo
      this.authDialogVisible = true
    },

    closeAuthDialog() {
      this.authDialogVisible = false
      this.redirectAfterLogin = ''
    },

    async login(phone: string, password: string) {
      const response = await authApi.login({ phone, password })

      this.user = response.user
      persistAuthToken(response.token)
      persistCurrentUser(response.user)
      return this.user
    },

    async register(phone: string, password: string, nickname: string) {
      const response = await authApi.register({ phone, password, nickname })

      this.user = response.user
      persistAuthToken(response.token)
      persistCurrentUser(response.user)
      return this.user
    },

    logout() {
      this.user = null
      clearAuthToken()
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    },
  },
})

function readCurrentUser() {
  const rawValue = localStorage.getItem(CURRENT_USER_STORAGE_KEY)
  if (!rawValue) return null

  try {
    return JSON.parse(rawValue) as AuthUser
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    return null
  }
}

function persistCurrentUser(user: AuthUser) {
  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user))
}
