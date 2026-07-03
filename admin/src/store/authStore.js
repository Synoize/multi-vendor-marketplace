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

      logout: () => {
        localStorage.removeItem('adminToken');
        set({ user: null, isAuthenticated: false });
        window.location.href = '/login';
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
            // Not admin — clear state
            localStorage.removeItem('adminToken');
            set({ user: null, isAuthenticated: false, isLoading: false });
            return false;
          }
        } catch (error) {
          localStorage.removeItem('adminToken');
          set({ user: null, isAuthenticated: false, isLoading: false });
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
