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

        localStorage.setItem('adsToken', token)
        set({ user, isAuthenticated: true })
        return user
      },

      logout: () => {
        localStorage.removeItem('adsToken')
        set({ user: null, isAuthenticated: false })
        window.location.href = '/login'
      },

      checkAuth: async () => {
        const token = localStorage.getItem('adsToken')
        if (!token) {
          set({ user: null, isAuthenticated: false })
          return false
        }

        try {
          const response = await api.get('/auth/me')
          const user = response.data.user || response.data

          if (user.role !== 'vendor') {
            get().logout()
            return false
          }

          set({ user, isAuthenticated: true })
          return true
        } catch {
          localStorage.removeItem('adsToken')
          set({ user: null, isAuthenticated: false })
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
