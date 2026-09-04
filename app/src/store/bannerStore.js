import { create } from 'zustand'
import api from '@/lib/axios'

export const useBannerStore = create(() => ({
  fetchHero: () => api.get('/banners?position=hero').then((r) => r.data.data || []),
  fetchMid: () => api.get('/banners?position=mid').then((r) => r.data.data || []),
  fetchOffer: () => api.get('/banners?position=offer').then((r) => r.data.data || []),
  fetchSidebar: () => api.get('/banners?position=sidebar').then((r) => r.data.data || []),
  fetchActiveSales: () => api.get('/festival-sales/active').then((r) => r.data.data),
  fetchVideos: () => api.get('/videos').then((r) => r.data.data || []),
  fetchVideosCursor: (cursor, limit = 10) => {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}&limit=${limit}` : `?limit=${limit}`;
    return api.get(`/videos${q}`).then((r) => {
      const d = r.data.data;
      if (Array.isArray(d)) {
        return { videos: d, hasMore: false, nextCursor: null };
      }
      return d || { videos: [], hasMore: false, nextCursor: null };
    });
  },
}))
