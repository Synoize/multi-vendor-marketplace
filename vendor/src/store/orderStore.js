import { create } from 'zustand'
import api from '../lib/axios'

export const useOrderStore = create(() => ({
  fetchOrders: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const { data } = await api.get(`/orders/vendor?${qs}`)
    return data.data || data || {}
  },
  fetchShippedOrders: async () => {
    const { data } = await api.get('/orders/vendor?status=shipped')
    return data.data || data || {}
  },
  updateStatus: (orderId, action, body = {}) =>
    api.patch(`/orders/vendor/${orderId}/${action}`, body),
}))
