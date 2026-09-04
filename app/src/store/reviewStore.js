import { create } from 'zustand'
import api from '@/lib/axios'

export const useReviewStore = create(() => ({
  fetchReviews: (productId, limit = 5) => api.get(`/reviews/${productId}?limit=${limit}`).then((r) => r.data.data || []),
  submitReview: (productId, formData) => api.post(`/reviews/${productId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data),
}))
