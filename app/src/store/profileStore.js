import { create } from 'zustand'
import api from '@/lib/axios'

export const useProfileStore = create((set, get) => ({
  addresses: [],
  coins: null,

  fetchAddresses: async () => {
    try {
      const { data } = await api.get('/users/me/addresses')
      set({ addresses: data.data || [] })
      return data.data || []
    } catch {
      return []
    }
  },

  addAddress: async (address) => {
    const { data } = await api.post('/users/me/addresses', address)
    await get().fetchAddresses()
    return data.data
  },

  updateAddress: async (id, address) => {
    await api.put(`/users/me/addresses/${id}`, address)
    await get().fetchAddresses()
  },

  deleteAddress: async (id) => {
    await api.delete(`/users/me/addresses/${id}`)
    set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }))
  },

  setDefaultAddress: async (id) => {
    await api.put(`/users/me/addresses/${id}`, { is_default: true })
    await get().fetchAddresses()
  },

  updateProfile: async (formData) => {
    const { data } = await api.put('/users/me/profile', formData)
    return data.data
  },

  fetchCoins: async () => {
    try {
      const { data } = await api.get('/users/me/coins')
      set({ coins: data.data })
      return data.data
    } catch {
      return null
    }
  },
}))
