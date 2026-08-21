import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch { /* ignore */ } finally {
          set({ user: null, isAuthenticated: false })
          localStorage.removeItem('damini-auth')
          localStorage.removeItem('damini-cart')
        }
      },

      checkAuth: async () => {
        set({ isLoading: true })
        try {
          const { data } = await api.get('/auth/me')
          set({ user: data.data, isAuthenticated: true })
        } catch (err) {
          // Only treat 401 as logged-out. A 429 (rate limit) or a network
          // error must NOT log the user out.
          if (err?.response?.status === 401) {
            set({ user: null, isAuthenticated: false })
          }
        } finally {
          set({ isLoading: false })
        }
      },

      requestLoginOtp: async (email, referralCode) => {
        const payload = { email };
        if (referralCode) payload.referralCode = referralCode;
        const { data } = await api.post('/auth/login', payload)
        return data
      },

      verifyLoginOtp: async (email, otp) => {
        const { data } = await api.post('/auth/verify-email', { email, otp })
        set({ user: data.data.user, isAuthenticated: true })
        return data
      },
    }),
    {
      name: 'damini-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
