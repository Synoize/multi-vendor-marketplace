import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import { Settings as SettingsIcon, Percent, Truck, Clock, ShieldAlert } from 'lucide-react'

export default function Settings() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    commission_rate: '5',
    shipping_charge: '40',
    free_shipping_threshold: '499',
    cancel_window_minutes: '15',
    site_name: 'Damini',
    maintenance_mode: 'false',
  })

  // Fetch settings
  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await api.get('/admin/settings')
      return res.data.data
    }
  })

  useEffect(() => {
    if (data) {
      setForm({
        commission_rate: data.commission_rate || '5',
        shipping_charge: data.shipping_charge || '40',
        free_shipping_threshold: data.free_shipping_threshold || '499',
        cancel_window_minutes: data.cancel_window_minutes || '15',
        site_name: data.site_name || 'Damini',
        maintenance_mode: data.maintenance_mode || 'false',
      })
    }
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      return api.put('/admin/settings', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      toast.success('Platform settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  const updateField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-gray-700" /> Platform Settings
        </h1>
        <p className="text-gray-500 text-sm">Configure global marketplace commissions, shipping charges, and platform operational mode</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Section 1: Financial */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Percent className="h-4 w-4 text-[#2874F0]" /> Financial Parameters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Standard Commission Rate (%) *</label>
              <input
                type="number"
                required
                value={form.commission_rate}
                onChange={e => updateField('commission_rate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Default Shipping Charge (₹) *</label>
              <input
                type="number"
                required
                value={form.shipping_charge}
                onChange={e => updateField('shipping_charge', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Free Shipping Threshold (₹) *</label>
              <input
                type="number"
                required
                value={form.free_shipping_threshold}
                onChange={e => updateField('free_shipping_threshold', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Fulfillment */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Truck className="h-4 w-4 text-[#2874F0]" /> Operational Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Customer Cancel Window (minutes) *</label>
              <input
                type="number"
                required
                value={form.cancel_window_minutes}
                onChange={e => updateField('cancel_window_minutes', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Site / Platform Name *</label>
              <input
                type="text"
                required
                value={form.site_name}
                onChange={e => updateField('site_name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Status */}
        <div className="space-y-4 pt-2 border-t border-gray-50">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-4 w-4" /> Danger Zone
          </h3>
          <div className="bg-red-50/50 rounded-lg p-4 border border-red-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900 text-sm">Site Maintenance Mode</p>
              <p className="text-xs text-gray-500">Temporarily disable storefront access for updates</p>
            </div>
            <select
              value={form.maintenance_mode}
              onChange={e => updateField('maintenance_mode', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] bg-white text-gray-700"
            >
              <option value="false">Operational (Live)</option>
              <option value="true">Maintenance Mode</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-[#2874F0] hover:bg-[#1a5de0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
