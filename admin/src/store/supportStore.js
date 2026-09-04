import { create } from 'zustand'
import api from '../lib/axios'

export const useSupportStore = create((set) => ({
  tickets: [],
  ticketDetail: null,
  loading: false,
  fetchTickets: async (status = 'open') => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/support/tickets${status !== 'all' ? `?status=${status}` : ''}`)
      set({ tickets: data.data || data || [], loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  fetchTicketDetail: async (id) => {
    set({ loading: true })
    try {
      const { data } = await api.get(`/support/tickets/${id}`)
      set({ ticketDetail: data.data || data, loading: false })
      return data.data || data
    } catch { set({ loading: false }) }
  },
  reply: (ticketId, message) => api.post(`/support/tickets/${ticketId}/reply`, { message }),
  close: (id) => api.patch(`/support/tickets/${id}/close`),
}))
