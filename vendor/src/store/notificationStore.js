import { create } from 'zustand'
import api from '../lib/axios'

export const useNotificationStore = create(() => ({
  fetchNotifications: async () => {
    const { data } = await api.get('/notifications?limit=20')
    return data.data?.notifications || data.notifications || []
  },
  fetchUnreadCount: async () => {
    const { data } = await api.get('/notifications/unread-count')
    return data.data?.count || 0
  },
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
}))
