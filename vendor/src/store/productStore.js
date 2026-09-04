import { create } from 'zustand'
import api from '../lib/axios'

export const useProductStore = create((set) => ({
  products: [],
  total: 0,
  loading: false,
  fetchProducts: async (params = {}) => {
    set({ loading: true })
    try {
      const { data } = await api.get('/vendors/products', { params })
      const res = data.data || data || {}
      set({
        products: res.products || data.products || res.data || res.items || [],
        total: res.total || data.total || 0,
        loading: false,
      })
      return data
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },
  fetchCategories: async () => {
    const { data } = await api.get('/categories')
    return data?.data || data?.categories || data || []
  },
  fetchProduct: async (id) => {
    const { data } = await api.get(`/products/${id}`)
    return data?.data || data?.product || data
  },
  createProduct: (formData) =>
    api.post('/products', formData),
  updateProduct: (id, formData) =>
    api.put(`/products/${id}`, formData),
  deleteProduct: (id) => api.delete(`/products/${id}`),
  toggleStatus: (id, status) => api.patch(`/products/${id}/status`, { status }),
  createVariant: (productId, payload) => api.post(`/products/${productId}/variants`, payload),
  updateVariant: (variantId, payload) => api.put(`/products/variants/${variantId}`, payload),
  deleteVariant: (variantId) => api.delete(`/products/variants/${variantId}`),
  fetchBrands: async () => {
    const { data } = await api.get('/brands')
    return data?.data || data?.brands || data || []
  },
}))
