import { create } from 'zustand'
import api from '@/lib/axios'

export const useProductStore = create(() => ({
  fetchProducts: (params) => api.get(`/products?${params}`).then((r) => r.data),
  fetchFeatured: (limit = 10) => api.get(`/products/featured?limit=${limit}`).then((r) => r.data.data || []),
  fetchTrending: (limit = 10) => api.get(`/products/trending?limit=${limit}`).then((r) => r.data.data || []),
  fetchDeals: (limit = 8) => api.get(`/products?sort=sale_count&order=desc&limit=${limit}`).then((r) => r.data.data || []),
  fetchRecentlyViewed: (limit = 10) => api.get(`/products/recently-viewed?limit=${limit}`).then((r) => r.data.data || []),
  fetchProduct: (slug) => api.get(`/products/${slug}`).then((r) => r.data.data),
  fetchRelated: (productId) => api.get(`/products/${productId}/related`).then((r) => r.data.data || []),
  fetchPriceStats: () => api.get('/products/price-stats').then((r) => r.data.data),
  fetchCategories: () => api.get('/categories').then((r) => r.data.data || []),
  fetchBrands: () => api.get('/brands').then((r) => r.data.data || []),
  fetchSearchSuggestions: (q) => api.get(`/products/search/suggestions?q=${encodeURIComponent(q)}`).then((r) => r.data.data || []),
}))
