import axios from 'axios'

const prodOrigin = 'https://api.thedaminiedit.com'
export const API_ORIGIN = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? prodOrigin : '')).replace(/\/$/, '')

export const mediaUrl = (path) => {
  if (!path) return ''
  if (/^(https?:)?\/\//.test(path)) return path
  return API_ORIGIN ? `${API_ORIGIN}${path}` : path
}

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
})

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

// Response interceptor – handle 401 by redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await axios.post(
          `${API_ORIGIN}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        return api(originalRequest)
      } catch {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
