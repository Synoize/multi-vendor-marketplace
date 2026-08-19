import { create } from 'zustand'
import api from '../lib/axios'

export const useAdStore = create(() => ({
  fetchAds: async () => {
    const { data } = await api.get('/ads/vendor')
    return data.data || []
  },
  createAd: (payload) => api.post('/ads/vendor', payload),
  toggleStatus: (id, action) => api.patch(`/ads/vendor/${id}/${action}`),
}))
