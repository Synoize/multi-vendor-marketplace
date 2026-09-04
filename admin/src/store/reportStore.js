import { create } from 'zustand'
import api from '../lib/axios'

export const useReportStore = create(() => ({
  fetchSalesReport: (from, to) =>
    api.get(`/reports/sales?from=${from}&to=${to}`).then(r => r.data.data || r.data || []),
  fetchVendorReport: () =>
    api.get('/reports/vendors').then(r => r.data.data || r.data || []),
  fetchUserReport: () =>
    api.get('/reports/users').then(r => r.data.data || r.data || []),
  fetchAdReport: () =>
    api.get('/reports/ads').then(r => r.data.data || r.data || []),
}))
