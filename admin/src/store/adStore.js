import { create } from 'zustand'
import api from '../lib/axios'

export const useAdStore = create((set) => ({
  campaigns: [],
  loading: false,
  fetchCampaigns: async (status = 'pending') => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/ads/admin${status !== 'all' ? `?status=${status}` : ''}`)
      set({ campaigns: data?.data?.campaigns || data?.campaigns || [], loading: false })
      return data?.data?.campaigns || data?.campaigns || []
    } catch { set({ loading: false }) }
  },
  approve: (id) => api.patch(`/ads/admin/${id}/approve`),
  reject: (id, reason) => api.patch(`/ads/admin/${id}/reject`, { reason }),
}))
