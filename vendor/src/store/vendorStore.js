import { create } from 'zustand'
import api from '../lib/axios'

export const useVendorStore = create(() => ({
  fetchProfile: async () => {
    const { data } = await api.get('/vendors/profile')
    return data.data || data
  },
  updateProfile: (payload) => api.put('/vendors/profile', payload),
  updateStoreBranding: (formData) =>
    api.post('/vendors/branding', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  submitKyc: (payload) => api.post('/vendors/kyc', payload),
  submitPendingUpdate: (payload) => api.post('/vendors/pending-update', payload),
  submitPendingDocuments: (formData) =>
    api.post('/vendors/pending-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  fetchPendingUpdates: async (status) => {
    const { data } = await api.get(
      `/vendors/pending-updates${status ? `?status=${status}` : ''}`
    )
    return data.data || data || []
  },
  cancelPendingUpdate: (id) => api.delete(`/vendors/pending-updates/${id}`),
}))
