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

      login: (user, token) => {
        if (token) localStorage.setItem('vendor_token', token)
        set({ user, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('vendor_token')
        localStorage.removeItem('vendor_user')
        set({ user: null, isAuthenticated: false })
        window.location.href = '/login'
      },

      checkAuth: async () => {
        const token = localStorage.getItem('vendor_token')
        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false })
          return false
        }

        set({ isLoading: true })
        try {
          const { data } = await api.get('/auth/me')
          const user = data?.user || data?.data || data
          // Ensure this is a vendor account
          if (user && (user.role === 'vendor' || user.role === 'admin')) {
            set({ user, isAuthenticated: true, isLoading: false })
            return true
          } else {
            get().logout()
            return false
          }
        } catch {
          localStorage.removeItem('vendor_token')
          set({ user: null, isAuthenticated: false, isLoading: false })
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
