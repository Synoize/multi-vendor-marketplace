import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import { Settings as SettingsIcon, ShieldCheck, Mail, Sliders } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['ads-settings-profile'],
    queryFn: async () => {
      const res = await api.get('/vendors/profile')
      return res.data.data
    }
  })

  const [bidLimit, setBidLimit] = useState('5')
  const [notifyExhausted, setNotifyExhausted] = useState(true)
  const [notifyLowBalance, setNotifyLowBalance] = useState(true)

  const handleSave = (e) => {
    e.preventDefault()
    toast.success('Ad preferences updated successfully')
  }

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-gray-700" /> Ad Settings
        </h1>
        <p className="text-gray-500 text-sm">Configure default campaign parameters and alert settings</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Ad Prefs */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#FB641B]" /> Bid Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Recommended CPC Bid Limit (₹) *</label>
              <input
                type="number"
                required
                value={bidLimit}
                onChange={e => setBidLimit(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FB641B]"
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#FB641B]" /> Email Alerts
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Campaign Budget Exhausted</p>
                <p className="text-xs text-gray-500">Notify me immediately when an active ad campaign exhausts its budget limits</p>
              </div>
              <input
                type="checkbox"
                checked={notifyExhausted}
                onChange={e => setNotifyExhausted(e.target.checked)}
                className="h-4 w-4 text-[#FB641B] focus:ring-[#FB641B] border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Low Ad Wallet Balance</p>
                <p className="text-xs text-gray-500">Alert me when the ad wallet balance falls below ₹200</p>
              </div>
              <input
                type="checkbox"
                checked={notifyLowBalance}
                onChange={e => setNotifyLowBalance(e.target.checked)}
                className="h-4 w-4 text-[#FB641B] focus:ring-[#FB641B] border-gray-300 rounded"
              />
            </div>
          </div>
        </div>

        {/* Read only info */}
        <div className="space-y-4 pt-2 border-t border-gray-50">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#FB641B]" /> Verified Vendor Store
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="text-xs text-gray-400">Store Name</p>
              <p className="font-semibold text-gray-800">{profile?.store_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Owner ID Reference</p>
              <p className="font-semibold text-gray-800 font-mono text-xs">{profile?.id}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="submit"
            className="bg-[#FB641B] hover:bg-[#e55a18] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  )
}
