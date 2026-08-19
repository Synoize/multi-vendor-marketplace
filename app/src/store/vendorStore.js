import { create } from 'zustand'
import api from '@/lib/axios'

export const useVendorStore = create((set, get) => ({
  otpSent: false,
  emailVerified: false,
  otpLoading: false,

  sendBusinessOtp: async (businessEmail) => {
    set({ otpLoading: true })
    try {
      await api.post('/vendors/send-business-otp', { business_email: businessEmail })
      set({ otpSent: true })
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to send OTP' }
    } finally {
      set({ otpLoading: false })
    }
  },

  verifyBusinessOtp: async (otp) => {
    set({ otpLoading: true })
    try {
      await api.post('/vendors/verify-business-otp', { otp })
      set({ emailVerified: true, otpSent: false })
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Verification failed' }
    } finally {
      set({ otpLoading: false })
    }
  },

  submitKyc: async (formData) => {
    set({ loading: true })
    try {
      await api.post('/vendors/kyc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return { success: true }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Submission failed' }
    } finally {
      set({ loading: false })
    }
  },

  fetchVendorStore: async (vendorId, page = 1, limit = 12) => {
    const { data } = await api.get(`/vendors/${vendorId}/store?page=${page}&limit=${limit}`)
    return data.data
  },

  reset: () => set({ otpSent: false, emailVerified: false, otpLoading: false }),
}))
