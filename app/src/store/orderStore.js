import { create } from 'zustand'
import api from '@/lib/axios'

export const useOrderStore = create(() => ({
  fetchOrders: (params = '') => api.get(`/orders${params}`).then((r) => r.data),
  fetchOrder: (id) => api.get(`/orders/my/${id}`).then((r) => r.data.data),
  placeOrder: (payload) => api.post('/orders', payload, { timeout: 30000 }).then((r) => r.data),
  cancelOrder: (id, reason = 'Cancelled by customer') => api.delete(`/orders/${id}/cancel`, { data: { reason } }).then((r) => r.data),
}))
