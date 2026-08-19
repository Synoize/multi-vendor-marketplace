import { create } from 'zustand'
import api from '../lib/axios'

export const useVendorStore = create((set) => ({
  vendors: [],
  total: 0,
  vendor: null,
  loading: false,
  fetchVendors: async (params = {}) => {
    set({ loading: true })
    try {
      const qs = new URLSearchParams(params).toString()
      const { data } = await api.get(`/admin/vendors?${qs}`)
      const res = data?.data || data || {}
      set({
        vendors: res.vendors || res.docs || res.data || [],
        total: res.total || res.totalDocs || 0,
        loading: false,
      })
      return res
    } catch { set({ loading: false }) }
  },
  fetchVendor: async (id) => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/admin/vendors/${id}`)
      set({ vendor: data.data || data, loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  approveKyc: (id) => api.patch(`/admin/vendors/${id}/approve`),
  rejectKyc: (id, reason) => api.patch(`/admin/vendors/${id}/reject`, { reason }),
  suspend: (id, reason) => api.patch(`/admin/vendors/${id}/suspend`, { reason }),
  unsuspend: (id) => api.patch(`/admin/vendors/${id}/unsuspend`),
}))
