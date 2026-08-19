import { create } from 'zustand'
import api from '../lib/axios'

export const useReturnStore = create(() => ({
  fetchReturns: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    const { data } = await api.get(`/returns/vendor?${qs}`)
    return data || {}
  },
  updateStatus: (returnId, status, notes) =>
    api.patch(`/returns/${returnId}/status`, { status, adminNotes: notes }),
}))
