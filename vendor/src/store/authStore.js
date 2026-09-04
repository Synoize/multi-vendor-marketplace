import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      requestOtp: async (email) => {
        await api.post('/auth/vendor/request-otp', { email })
      },

      verifyOtp: async (email, otp) => {
        const { data } = await api.post('/auth/vendor/verify-otp', { email, otp })
        const payload = data?.data || data
        return {
          user: payload?.user || payload,
          token: payload?.accessToken || payload?.token || data?.token,
        }
      },

      login: (user, token) => {
        set({ user, isAuthenticated: true })
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false })
        localStorage.removeItem('vendor-auth-storage')
        localStorage.removeItem('damini-vendor-auth')
        window.location.href = '/login'
      },

      checkAuth: async () => {
        set({ isLoading: true })
        try {
          const { data } = await api.get('/auth/me')
          const user = data?.user || data?.data || data
          // Ensure this is a vendor account
          if (user && user.role === 'vendor') {
            set({ user, isAuthenticated: true, isLoading: false })
            return true
          } else {
            // Wrong role on this portal — clear local state only,
            // do NOT call server logout (that would destroy the other app's session).
            set({ user: null, isAuthenticated: false, isLoading: false })
            return false
          }
        } catch (err) {
          // Only treat 401 as logged-out. A 429 (rate limit) or a network
          // error must NOT log the user out.
          if (err?.response?.status === 401) {
            set({ user: null, isAuthenticated: false, isLoading: false })
          }
          return false
        }
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'vendor-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore
