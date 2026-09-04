import { create } from 'zustand'
import api from '../lib/axios'

export const useFestivalSaleStore = create((set) => ({
  sales: [],
  loading: false,
  fetchSales: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/admin/festival-sales')
      set({ sales: data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  create: (payload) => api.post('/admin/festival-sales', payload),
  update: (id, payload) => api.put(`/admin/festival-sales/${id}`, payload),
  remove: (id) => api.delete(`/admin/festival-sales/${id}`),
}))
