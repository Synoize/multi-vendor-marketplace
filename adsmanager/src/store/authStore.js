import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const response = await api.post('/auth/vendor/login', { email, password })
        const { token, user } = response.data

        if (user.role !== 'vendor') {
          throw new Error('Access denied. Vendor account required.')
        }

        set({ user, isAuthenticated: true })
        return user
      },

      logout: async () => {
        try { await api.post('/auth/logout') } catch { /* ignore */ }
        set({ user: null, isAuthenticated: false })
        localStorage.removeItem('damini-ads')
        window.location.href = '/login'
      },

      checkAuth: async () => {
        try {
          const response = await api.get('/auth/me')
          const user = response.data.user || response.data

          if (user.role !== 'vendor') {
            set({ user: null, isAuthenticated: false })
            return false
          }

          set({ user, isAuthenticated: true })
          return true
        } catch (err) {
          // Only treat 401 as logged-out. A 429 (rate limit) or a network
          // error must NOT log the user out.
          if (err?.response?.status === 401) {
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
