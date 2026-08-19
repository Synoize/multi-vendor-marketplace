import { create } from 'zustand'
import api from '../lib/axios'

export const useShipmentStore = create(() => ({
  fetchShippedOrders: async () => {
    const { data } = await api.get('/orders/vendor?status=shipped')
    return data.data || data || {}
  },
  checkServiceability: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const { data } = await api.get(`/shipments/serviceability?${qs}`)
    return data.data || data
  },
}))
