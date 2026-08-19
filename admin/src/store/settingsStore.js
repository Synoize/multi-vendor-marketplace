import { create } from 'zustand'
import api from '../lib/axios'

export const useSettingsStore = create((set) => ({
  settings: {},
  loading: false,
  fetchSettings: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/admin/settings')
      set({ settings: data.data || data, loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  updateSettings: (payload) => api.put('/admin/settings', payload),
}))
