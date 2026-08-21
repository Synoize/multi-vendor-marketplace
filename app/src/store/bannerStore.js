import { create } from 'zustand'
import api from '@/lib/axios'

export const useBannerStore = create(() => ({
  fetchHero: () => api.get('/banners?position=hero').then((r) => r.data.data || []),
  fetchMid: () => api.get('/banners?position=mid').then((r) => r.data.data || []),
  fetchOffer: () => api.get('/banners?position=offer').then((r) => r.data.data || []),
  fetchSidebar: () => api.get('/banners?position=sidebar').then((r) => r.data.data || []),
  fetchActiveSales: () => api.get('/festival-sales/active').then((r) => r.data.data),
  fetchVideos: () => api.get('/videos').then((r) => r.data.data || []),
  fetchVideosPaginated: (page = 1, limit = 10) =>
    api.get(`/videos?page=${page}&limit=${limit}&random=1`).then((r) => r.data),
}))
