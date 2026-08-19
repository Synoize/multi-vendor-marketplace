import { create } from 'zustand'
import api from '../lib/axios'

export const usePayoutStore = create((set) => ({
  payouts: [],
  loading: false,
  fetchPayouts: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/admin/payouts')
      set({ payouts: data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  release: (payload) => api.post('/admin/payouts/release', payload),
}))
