import { create } from 'zustand'
import api from '@/lib/axios'

export const usePaymentStore = create(() => ({
  initiatePayment: (payload) => api.post('/payments/initiate', payload, { timeout: 30000 }).then((r) => r.data),
  verifyPayment: (payload) => api.post('/payments/verify', payload, { timeout: 30000 }).then((r) => r.data),
}))
