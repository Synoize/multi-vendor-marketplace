import { create } from 'zustand'
import api from '@/lib/axios'

export const useSupportStore = create(() => ({
  fetchTickets: () => api.get('/support/tickets').then((r) => r.data.data || []),
  fetchTicket: (id) => api.get(`/support/tickets/${id}`).then((r) => r.data.data),
  createTicket: (form) => api.post('/support/tickets', form).then((r) => r.data),
  replyTicket: (id, message) => api.post(`/support/tickets/${id}/reply`, { message }).then((r) => r.data),
}))
