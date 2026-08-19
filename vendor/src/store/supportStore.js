import { create } from 'zustand'
import api from '../lib/axios'

export const useSupportStore = create(() => ({
  fetchTickets: async () => {
    const { data } = await api.get('/support/tickets')
    return data.data || data || []
  },
  fetchTicket: async (id) => {
    const { data } = await api.get(`/support/tickets/${id}`)
    return data.data || data
  },
  createTicket: (form) => api.post('/support/tickets', form),
  replyTicket: (id, message) => api.post(`/support/tickets/${id}/reply`, { message }),
}))
