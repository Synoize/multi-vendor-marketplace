import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: true }),

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch (error) {
          // ignore server errors; still clear local session
        } finally {
          set({ user: null, isAuthenticated: false });
          useAuthStore.persist.clearStorage();
          window.location.href = '/login';
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/auth/me');
          const user = response.data?.data || response.data;
          if (user && user.role === 'admin') {
            set({ user, isAuthenticated: true, isLoading: false });
            return true;
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
            return false;
          }
        } catch (error) {
          // Only treat 401 as logged-out. A 429 (rate limit) or a network
          // error must NOT log the user out.
          if (error?.response?.status === 401) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
          return false;
        }
      },
    }),
    {
      name: 'damini-admin',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
