import { create } from 'zustand'
import api from '../lib/axios'

export const useVideoStore = create((set) => ({
  videos: [],
  loading: false,
  fetchVideos: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/videos?all=1')
      set({ videos: data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  create: (payload) => api.post('/videos', payload),
  update: (id, payload) => api.put(`/videos/${id}`, payload),
  remove: (id) => api.delete(`/videos/${id}`),
}))
