import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Vendor Auth Store
 * Manages vendor authentication state with localStorage persistence
 */
const useVendorAuthStore = create(
  persist(
    (set, get) => ({
      vendor: null,       // Vendor store data (name, logo, rating, status)
      user: null,         // User account data (name, email, phone)
      token: null,        // JWT token
      isAuthenticated: false,

      /**
       * Set vendor auth after successful login/register
       */
      setVendorAuth: ({ vendor, user, token }) => {
        if (token) {
          localStorage.setItem('vendor_token', token)
        }
        set({
          vendor,
          user,
          token,
          isAuthenticated: true,
        })
      },

      /**
       * Update vendor store data
       */
      updateVendor: (vendorData) => {
        set((state) => ({
          vendor: { ...state.vendor, ...vendorData },
        }))
      },

      /**
       * Update user profile data
       */
      updateUser: (userData) => {
        set((state) => ({
          user: { ...state.user, ...userData },
        }))
      },

      /**
       * Logout — clear all auth state
       */
      logout: () => {
        localStorage.removeItem('vendor_token')
        localStorage.removeItem('vendor_data')
        set({
          vendor: null,
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },

      /**
       * Get current token (helper)
       */
      getToken: () => get().token || localStorage.getItem('vendor_token'),
    }),
    {
      name: 'damini-vendor-auth',
      partialize: (state) => ({
        vendor: state.vendor,
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useVendorAuthStore
