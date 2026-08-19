import { create } from 'zustand'
import api from '../lib/axios'

export const useBannerStore = create((set) => ({
  banners: [],
  loading: false,
  fetchBanners: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/banners?all=1')
      set({ banners: data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  create: (payload) => api.post('/banners', payload),
  update: (id, payload) => api.put(`/banners/${id}`, payload),
  remove: (id) => api.delete(`/banners/${id}`),
}))
