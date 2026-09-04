import { create } from 'zustand'
import api from '../lib/axios'

export const usePayoutStore = create(() => ({
  fetchPayouts: async () => {
    const { data } = await api.get('/vendors/payouts')
    return data.data || data
  },
}))
