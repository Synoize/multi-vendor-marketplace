import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import { Settings as SettingsIcon, Store, CreditCard, MapPin, Shield } from 'lucide-react'

const TABS = [
  { id: 'store', label: 'Store Profile', icon: <Store className="h-4 w-4" /> },
  { id: 'bank', label: 'Bank Details', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'pickup', label: 'Pickup Address', icon: <MapPin className="h-4 w-4" /> },
]

export default function Settings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('store')

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor-profile-settings'],
    queryFn: async () => {
      const res = await api.get('/vendors/profile')
      return res.data.data
    }
  })

  const [formData, setFormData] = useState({
    store_name: '', store_description: '',
    bank_name: '', account_number: '', ifsc_code: '', account_holder: '',
    pickup_name: '', pickup_phone: '', pickup_line1: '', pickup_city: '', pickup_state: '', pickup_pincode: '',
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        store_name: vendor.store_name || '',
        store_description: vendor.store_description || '',
        bank_name: vendor.bank_name || '',
        account_number: vendor.account_number || '',
        ifsc_code: vendor.ifsc_code || '',
        account_holder: vendor.account_holder || '',
        pickup_name: vendor.pickup_name || '',
        pickup_phone: vendor.pickup_phone || '',
        pickup_line1: vendor.pickup_line1 || '',
        pickup_city: vendor.pickup_city || '',
        pickup_state: vendor.pickup_state || '',
        pickup_pincode: vendor.pickup_pincode || '',
      })
    }
  }, [vendor])

  const updateMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/vendors/kyc', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-profile-settings'] })
      toast.success('Settings saved successfully')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update settings')
    }
  })

  const handleStoreUpdate = async (e) => {
    e.preventDefault()
    try {
      await api.put('/vendors/profile', {
        store_name: formData.store_name,
        store_description: formData.store_description
      })
      queryClient.invalidateQueries({ queryKey: ['vendor-profile-settings'] })
      toast.success('Store profile updated successfully')
    } catch {
      toast.error('Failed to update store profile')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-gray-700" /> Store Settings
        </h1>
        <p className="text-gray-500 text-sm">Configure your store information, bank account details, and shipping location</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab Sidebar */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden py-2">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-3 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-[#2874F0] border-l-4 border-[#2874F0]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {activeTab === 'store' && (
            <form onSubmit={handleStoreUpdate} className="space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Store Profile Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Store Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.store_name}
                    onChange={e => handleFieldChange('store_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">KYC Status</label>
                  <div className="mt-2.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
                      vendor?.kyc_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {vendor?.kyc_status || 'not_submitted'}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Store Description</label>
                <textarea
                  rows={4}
                  value={formData.store_description}
                  onChange={e => handleFieldChange('store_description', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] resize-none"
                />
              </div>
              <button
                type="submit"
                className="bg-[#2874F0] hover:bg-[#1a5de0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
              >
                Save Profile
              </button>
            </form>
          )}

          {activeTab === 'bank' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Bank Settlement Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. State Bank of India"
                    value={formData.bank_name}
                    onChange={e => handleFieldChange('bank_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="As registered in bank account"
                    value={formData.account_holder}
                    onChange={e => handleFieldChange('account_holder', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter complete bank account number"
                    value={formData.account_number}
                    onChange={e => handleFieldChange('account_number', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="11-character alphanumeric code"
                    value={formData.ifsc_code}
                    onChange={e => handleFieldChange('ifsc_code', e.target.value.toUpperCase())}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-[#2874F0] hover:bg-[#1a5de0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Bank Details'}
              </button>
            </form>
          )}

          {activeTab === 'pickup' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Pickup/Shipping Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_name}
                    onChange={e => handleFieldChange('pickup_name', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.pickup_phone}
                    onChange={e => handleFieldChange('pickup_phone', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_line1}
                    onChange={e => handleFieldChange('pickup_line1', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_city}
                    onChange={e => handleFieldChange('pickup_city', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_state}
                    onChange={e => handleFieldChange('pickup_state', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.pickup_pincode}
                    onChange={e => handleFieldChange('pickup_pincode', e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-[#2874F0] hover:bg-[#1a5de0] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Updating...' : 'Save Pickup Address'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
