import { create } from 'zustand'
import api from '../lib/axios'

export const useCouponStore = create((set) => ({
  coupons: [],
  loading: false,
  fetchCoupons: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/coupons')
      set({ coupons: data.data?.items || data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  create: (payload) => api.post('/coupons', payload),
  update: (id, payload) => api.put(`/coupons/${id}`, payload),
  remove: (id) => api.delete(`/coupons/${id}`),
  toggle: (id) => api.patch(`/coupons/${id}/toggle`),
}))
