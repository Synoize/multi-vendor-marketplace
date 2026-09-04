import { create } from 'zustand'
import api from '@/lib/axios'

export const useOfferStore = create(() => ({
  fetchActiveOffers: () => api.get('/offers/active').then((r) => r.data.data || []),
  validateOffer: (offerId, cartItems, cartTotal) => api.post('/offers/validate', { offerId, cartItems, cartTotal }).then((r) => r.data),
}))
