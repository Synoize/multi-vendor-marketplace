import { create } from 'zustand'
import api from '../lib/axios'

export const useOfferStore = create((set) => ({
  offers: [],
  total: 0,
  loading: false,
  fetchOffers: async (params = {}) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams(params).toString()
      const { data } = await api.get(`/offers?${qs}`)
      const res = data.data || data || {}
      set({
        offers: res.items || Array.isArray(res) ? res : [],
        total: res.total || 0,
        loading: false,
      })
      return res
    } catch { set({ loading: false }) }
  },
  create: (payload) => api.post('/offers', payload),
  update: (id, payload) => api.put(`/offers/${id}`, payload),
  remove: (id) => api.delete(`/offers/${id}`),
  toggle: (id) => api.patch(`/offers/${id}/toggle`),
}))
