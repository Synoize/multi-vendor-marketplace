import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      total: 0,
      savedForLater: [],

      setCart: (cart) => {
        set({
          items: cart.items || [],
          count: cart.count || 0,
          total: cart.total || 0,
          savedForLater: cart.savedForLater || [],
        })
      },

      fetchCart: async () => {
        try {
          const { data } = await api.get('/cart')
          const cart = data.data
          set({
            items: cart.items || [],
            count: cart.count || 0,
            total: cart.total || 0,
            savedForLater: cart.savedForLater || [],
          })
        } catch { /* user not logged in */ }
      },

      addItem: async (productId, variantId, quantity = 1) => {
        await api.post('/cart', { productId, variantId, quantity })
        await get().fetchCart()
      },

      updateQuantity: async (itemId, quantity) => {
        if (quantity < 1) return
        await api.put(`/cart/${itemId}`, { quantity })
        await get().fetchCart()
      },

      removeItem: async (itemId) => {
        await api.delete(`/cart/${itemId}`)
        await get().fetchCart()
      },

      clearCart: async () => {
        await api.delete('/cart')
        set({ items: [], count: 0, total: 0 })
      },

      saveForLater: async (itemId) => {
        await api.post(`/cart/${itemId}/save-for-later`)
        await get().fetchCart()
      },

      moveToCart: async (itemId) => {
        await api.post(`/cart/${itemId}/move-to-cart`)
        await get().fetchCart()
      },

      // Optimistic count update for navbar
      incrementCount: () => set((s) => ({ count: s.count + 1 })),
    }),
    {
      name: 'damini-cart',
      partialize: (state) => ({ count: state.count }),
    }
  )
)
