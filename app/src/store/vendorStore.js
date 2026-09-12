import { create } from 'zustand'
import api from '@/lib/axios'

export const useVendorStore = create((set, get) => ({
  otpSent: false,
  emailVerified: false,
  otpLoading: false,

  restoreEmailVerification: async () => {
    try {
      const { data } = await api.get('/vendors/kyc')
      const vendor = data?.data
      if (vendor?.business_email_verified) {
        set({ emailVerified: true })
      }
    } catch {
      // ignore — user may not have a vendor record yet
    }
  },

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
        timeout: 120000,
      })
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return { success: false, message: 'Upload timed out. Please compress your files and try again.' }
      }
      if (!err.response) {
        return { success: false, message: 'Network error. Please check your connection and try again.' }
      }
      if (msg && /size|large|limit|exceeds/i.test(msg)) {
        return { success: false, message: msg }
      }
      return { success: false, message: msg || 'Submission failed. Please try again.' }
    } finally {
      set({ loading: false })
    }
  },

  fetchVendorStore: async (vendorId, cursor = null, limit = 12) => {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=${limit}` : `?limit=${limit}`;
    const { data } = await api.get(`/vendors/${vendorId}/store${q}`);
    return data.data;
  },

  fetchKycData: async () => {
    const { data } = await api.get('/vendors/kyc');
    return data.data;
  },

  reset: () => set({ otpSent: false, emailVerified: false, otpLoading: false }),
}))
