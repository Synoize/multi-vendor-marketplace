import { create } from 'zustand'
import api from '../lib/axios'

export const useOrderStore = create((set) => ({
  orders: [],
  total: 0,
  loading: false,
  fetchOrders: async (params = {}) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams(params).toString()
      const { data } = await api.get(`/orders/admin?${qs}`)
      const res = data.data || data || {}
      set({
        orders: Array.isArray(res) ? res : res.orders || [],
        total: res.total || 0,
        loading: false,
      })
      return res
    } catch { set({ loading: false }) }
  },
  updateStatus: (orderId, status) =>
    api.patch(`/orders/admin/${orderId}/status`, { status }),
}))
