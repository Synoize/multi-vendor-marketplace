import axios from 'axios'
import { toast } from 'sonner'

// In production builds, the API lives on its own domain. Locally we keep
// the relative Vite proxy (/api/v1 -> localhost:5000).
const prodOrigin = 'https://api.thedaminiedit.com'
export const API_ORIGIN = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? prodOrigin : '')).replace(/\/$/, '')

// Absolute URL for any relative media path (e.g. "/uploads/products/x.jpg")
export const mediaUrl = (path) => {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path)) return path
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path
}

// Rewrite relative "/uploads/..." strings inside API responses to absolute
// URLs so <img src={product.image}> works when the app and API are on
// different domains.
const rewriteUploadPaths = (value) => {
  if (typeof value === 'string') {
    return value.startsWith('/uploads/') ? `${API_ORIGIN}${value}` : value
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = rewriteUploadPaths(value[i])
    return value
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = rewriteUploadPaths(value[key])
    return value
  }
  return value
}

const api = axios.create({
  baseURL: API_ORIGIN ? `${API_ORIGIN}/api/v1` : '/api/v1',
  withCredentials: true,
  timeout: 15000,
})

// Rewrite relative upload paths in every API response to absolute URLs
api.interceptors.response.use((response) => {
  if (API_ORIGIN) rewriteUploadPaths(response.data)
  return response
})

// Only force a JSON content-type for non-FormData payloads. A hardcoded
// `application/json` default makes axios serialize FormData into a JSON
// string (formDataToJSON), silently dropping uploaded image files.
api.interceptors.request.use((config) => {
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (isFormData) {
    config.headers.delete('Content-Type')
  } else if (!config.headers.get('Content-Type')) {
    config.headers.set('Content-Type', 'application/json')
  }
  return config
})

// Response interceptor — handle 401 (redirect to login)
let isRefreshing = false
let pendingRequests = []

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // A failed `/auth/refresh` must never re-enter this 401 handler — the
    // refresh call is what resolves the `isRefreshing` lock, so queuing it
    // behind itself would deadlock every pending request (checkAuth hangs,
    // stale auth state persists forever).
    const isRefreshRequest = (originalRequest?.url || '').includes('/auth/refresh')

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRefreshRequest
    ) {
      // `/auth/me` legitimately returns 401 for guests — don't bounce them
      // to login; checkAuth handles it by marking the user logged out.
      const isAuthMe = (originalRequest.url || '').includes('/auth/me')

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject })
        }).then(() => {
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        await api.post('/auth/refresh')
        pendingRequests.forEach(({ resolve }) => resolve())
        pendingRequests = []
        return api(originalRequest)
      } catch {
        pendingRequests.forEach(({ reject }) => reject())
        pendingRequests = []
        if (!isAuthMe && window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
