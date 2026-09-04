import { create } from 'zustand'
import api from '../lib/axios'

export const useDashboardStore = create((set) => ({
  dashboard: null,
  pendingCounts: { vendors: 0, products: 0 },
  loading: false,
  fetchDashboard: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/admin/dashboard')
      set({ dashboard: data.data || data, loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  fetchPendingCounts: async () => {
    try {
      const { data } = await api.get('/admin/dashboard/pending-counts')
      set({ pendingCounts: data.data || data })
      return data.data || data
    } catch {}
  },
}))
