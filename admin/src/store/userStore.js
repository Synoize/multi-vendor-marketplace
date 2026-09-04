import { create } from 'zustand'
import api from '../lib/axios'

export const useUserStore = create((set) => ({
  users: [],
  total: 0,
  loading: false,
  fetchUsers: async (params = {}) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams(params).toString()
      const { data } = await api.get(`/admin/users?${qs}`)
      const res = data?.data || data || {}
      set({
        users: res.data || res.users || [],
        total: res.total || 0,
        loading: false,
      })
      return res
    } catch { set({ loading: false }) }
  },
  banUser: (id) => api.patch(`/admin/users/${id}/ban`),
  unbanUser: (id) => api.patch(`/admin/users/${id}/unban`),
}))
