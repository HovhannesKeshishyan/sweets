import type { UserRole } from '#shared/constants'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

/**
 * Client view of the signed-in user. This is for UI only — every protected
 * API checks the session on the server regardless of what this says.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)
  const loaded = useState('auth:loaded', () => false)
  const requestFetch = useRequestFetch() // forwards cookies during SSR

  async function refresh() {
    try {
      const res = await requestFetch<{ user: AuthUser | null }>('/api/auth/me')
      user.value = res.user
    } catch {
      user.value = null
    } finally {
      loaded.value = true
    }
  }

  async function ensureLoaded() {
    if (!loaded.value) await refresh()
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: { email, password } })
    user.value = res.user
    loaded.value = true
    return res.user
  }

  async function register(name: string, email: string, password: string) {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/register', {
      method: 'POST',
      body: { name, email, password },
    })
    user.value = res.user
    loaded.value = true
    return res.user
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
  }

  return {
    user: readonly(user),
    isLoggedIn: computed(() => user.value !== null),
    isAdmin: computed(() => user.value?.role === 'admin'),
    refresh,
    ensureLoaded,
    login,
    register,
    logout,
  }
}
