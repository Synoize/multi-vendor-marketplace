import { create } from 'zustand'
import api from '@/lib/axios'

export const useCouponStore = create(() => ({
  validateCoupon: (code, cartTotal) => api.post('/coupons/validate', { code, cartTotal }).then((r) => r.data),
}))
