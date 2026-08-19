import { create } from 'zustand'
import api from '../lib/axios'

export const useProductStore = create((set) => ({
  products: [],
  total: 0,
  loading: false,
  fetchProducts: async (params = {}) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams(params).toString()
      const { data } = await api.get(`/admin/products?${qs}`)
      const res = data.data || data || {}
      set({
        products: Array.isArray(res) ? res : res.data || res.products || [],
        total: res.total || 0,
        loading: false,
      })
      return res
    } catch { set({ loading: false }) }
  },
  approve: (id) => api.patch(`/products/${id}/approve`),
  reject: (id, reason) => api.patch(`/products/${id}/reject`, { reason }),
  block: (id) => api.patch(`/products/${id}/block`),
}))
