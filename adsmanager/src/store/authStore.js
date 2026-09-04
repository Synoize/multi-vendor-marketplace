import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'

// Bumped on every login/logout so an in-flight checkAuth() (e.g. started on
// page refresh while /auth/me is still resolving) can never re-authenticate
// a session the user already logged out of.
let authEpoch = 0

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      requestOtp: async (email) => {
        await api.post('/auth/vendor/request-otp', { email })
      },

verifyOtp: async (email, otp) => {
          const { data } = await api.post('/auth/vendor/verify-otp', { email, otp })
          const payload = data?.data || data

          if (payload?.user?.role !== 'vendor') {
            throw new Error('Access denied. Vendor account required.')
          }

          authEpoch = authEpoch + 1
          set({
            user: payload?.user || payload,
            isAuthenticated: true,
          })
          return payload?.user || payload
        },

        logout: async () => {
          // Bump the epoch so a stale in-flight checkAuth() won't re-login.
          // Then clear client state + persisted storage FIRST and synchronously
          // so the SPA can redirect immediately. Server-side token revocation
          // is best-effort and never blocks the redirect.
          authEpoch = authEpoch + 1
          set({ user: null, isAuthenticated: false, isLoading: false })
          localStorage.removeItem('damini-ads')
          try {
            await api.post('/auth/logout')
          } catch {
            /* ignore */
          }
        },

        checkAuth: async () => {
          const epochAtStart = authEpoch
          try {
            const response = await api.get('/auth/me')
            const user = response.data?.data || response.data

            if (user?.role !== 'vendor') {
              set({ user: null, isAuthenticated: false })
              return false
            }

            // If the user logged out (or logged in again) while this request
            // was in flight, discard the stale result.
            if (authEpoch !== epochAtStart) {
              return false
            }

            set({ user, isAuthenticated: true })
            return true
          } catch (err) {
            // Only treat 401 as logged-out. A 429 (rate limit) or a network
            // error must NOT log the user out.
            if (err?.response?.status === 401 && authEpoch === epochAtStart) {
              set({ user: null, isAuthenticated: false })
            }
            return false
          }
        },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }))
      },
    }),
    {
      name: 'damini-ads',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
