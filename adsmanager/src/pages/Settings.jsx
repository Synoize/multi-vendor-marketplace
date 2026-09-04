import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import { Settings as SettingsIcon, ShieldCheck, Mail, Sliders } from 'lucide-react'
import { toast } from 'sonner'

export default function Settings() {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['ads-settings-profile'],
    queryFn: async () => {
      const res = await api.get('/vendors/profile')
      return res.data.data
    }
  })

  const prefsQuery = useQuery({
    queryKey: ['ads-alert-preferences'],
    queryFn: async () => {
      const res = await api.get('/ads/vendor/alert-preferences')
      return res.data.data
    }
  })

  const [form, setForm] = useState({
    maxCpcBidLimit: '5',
    lowBalanceThreshold: '200',
    notifyExhausted: true,
    notifyLowBalance: true,
  })

  useEffect(() => {
    if (prefsQuery.data) {
      setForm({
        maxCpcBidLimit: String(prefsQuery.data.maxCpcBidLimit ?? 5),
        lowBalanceThreshold: String(prefsQuery.data.lowBalanceThreshold ?? 200),
        notifyExhausted: prefsQuery.data.notifyBudgetExhausted !== false,
        notifyLowBalance: prefsQuery.data.notifyLowBalance !== false,
      })
    }
  }, [prefsQuery.data])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/ads/vendor/alert-preferences', payload),
    onSuccess: () => {
      toast.success('Ad preferences updated successfully')
      prefsQuery.refetch()
    },
    onError: (err) => {
      const msg = err?.response?.data?.message || 'Failed to save preferences. Please try again.'
      toast.error(msg)
    },
  })

  const handleSave = (e) => {
    e.preventDefault()
    saveMutation.mutate({
      maxCpcBidLimit: Number(form.maxCpcBidLimit) || 5,
      lowBalanceThreshold: Number(form.lowBalanceThreshold) || 200,
      notifyBudgetExhausted: form.notifyExhausted,
      notifyLowBalance: form.notifyLowBalance,
    })
  }

  if (profileLoading || prefsQuery.isLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-gray-700" /> Ad Settings
        </h1>
        <p className="text-secondary-800 text-sm">Configure default campaign parameters and alert settings</p>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Ad Prefs */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" /> Bid Preferences
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Max Recommended CPC Bid Limit (₹) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={form.maxCpcBidLimit}
                onChange={set('maxCpcBidLimit')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Email Alerts
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Campaign Budget Exhausted</p>
                <p className="text-xs text-secondary-800">Email me immediately when an active ad campaign exhausts its budget limits</p>
              </div>
              <input
                type="checkbox"
                checked={form.notifyExhausted}
                onChange={e => setForm(f => ({ ...f, notifyExhausted: e.target.checked }))}
                className="h-4 w-4 text-primary focus:ring-primary border-secondary-300 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">Low Ad Wallet Balance</p>
                <p className="text-xs text-secondary-800">Alert me when the ad wallet balance falls below my threshold</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-800 text-xs">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.lowBalanceThreshold}
                    onChange={set('lowBalanceThreshold')}
                    className="w-24 border border-gray-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-medium focus:outline-none focus:border-primary text-right"
                  />
                </div>
                <input
                  type="checkbox"
                  checked={form.notifyLowBalance}
                  onChange={e => setForm(f => ({ ...f, notifyLowBalance: e.target.checked }))}
                  className="h-4 w-4 text-primary focus:ring-primary border-secondary-300 rounded"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Read only info */}
        <div className="space-y-4 pt-2 border-t border-gray-50">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Verified Vendor Store
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-secondary-900">
            <div>
              <p className="text-xs text-secondary-800">Store Name</p>
              <p className="font-semibold text-gray-800">{profile?.store_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-secondary-800">Owner ID Reference</p>
              <p className="font-semibold text-gray-800 font-mono text-xs">{profile?.id}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  )
}