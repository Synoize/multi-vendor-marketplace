import { create } from 'zustand'
import api from '@/lib/axios'

export const useAdStore = create(() => ({
  fetchActiveAds: () => api.get('/ads/active').then((r) => r.data.data || []),
  trackImpression: (campaignId, productId) =>
    api.post('/ads/impression', { campaignId, productId }),
  trackClick: (campaignId, productId) =>
    api.post('/ads/click', { campaignId, productId }),
}))
