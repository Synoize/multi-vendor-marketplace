import { create } from 'zustand'
import api from '@/lib/axios'

export const useWishlistStore = create((set, get) => ({
  items: [],
  isLoading: false,

  fetchWishlist: async () => {
    set({ isLoading: true })
    try {
      const { data } = await api.get('/wishlist')
      set({ items: data.data?.items || [] })
      return data.data?.items || []
    } catch {
      set({ items: [] })
      return []
    } finally {
      set({ isLoading: false })
    }
  },

  toggleWishlist: async (productId) => {
    try {
      await api.post('/wishlist', { productId })
      await get().fetchWishlist()
      return { added: true }
    } catch {
      return { added: false }
    }
  },

  removeItem: async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`)
      set((s) => ({ items: s.items.filter((i) => i.product_id !== productId && i.id !== productId) }))
      return { success: true }
    } catch {
      return { success: false }
    }
  },

  moveToCart: async (productId) => {
    try {
      await api.post(`/wishlist/${productId}/move-to-cart`)
      set((s) => ({ items: s.items.filter((i) => i.product_id !== productId && i.id !== productId) }))
      return { success: true }
    } catch {
      return { success: false }
    }
  },
}))
