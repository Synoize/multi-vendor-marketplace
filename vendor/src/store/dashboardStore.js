import { create } from 'zustand'
import api from '../lib/axios'

export const useDashboardStore = create((set) => ({
  dashboard: null,
  loading: false,
  fetchDashboard: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/vendors/dashboard')
      set({ dashboard: data.data || data, loading: false })
      return data.data || data
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },
}))
