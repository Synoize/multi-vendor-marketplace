import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { Megaphone, Check, X, ShieldAlert, BarChart2 } from 'lucide-react'

export default function Ads() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [rejectModal, setRejectModal] = useState(null) // campaignId if open
  const [rejectReason, setRejectReason] = useState('')

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['admin-ads', activeTab],
    queryFn: async () => {
      const res = await api.get('/ads/admin')
      const list = res.data.data || []
      if (activeTab === 'all') return list
      return list.filter(c => c.status === activeTab)
    }
  })

  // Approve campaign mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/ads/admin/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
      toast.success('Campaign approved successfully')
    },
    onError: () => {
      toast.error('Failed to approve campaign')
    }
  })

  // Reject campaign mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return api.patch(`/ads/admin/${id}/reject`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
      toast.success('Campaign rejected successfully')
      setRejectModal(null)
      setRejectReason('')
    },
    onError: () => {
      toast.error('Failed to reject campaign')
    }
  })

  const handleApprove = (id) => {
    approveMutation.mutate(id)
  }

  const handleRejectSubmit = (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) return
    rejectMutation.mutate({ id: rejectModal, reason: rejectReason })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-sans">Sponsored Campaigns</h1>
        <p className="text-gray-500 text-sm">Approve and monitor paid banner and product campaigns</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'pending', label: 'Pending Approval' },
          { id: 'active', label: 'Active Campaigns' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'exhausted', label: 'Exhausted' },
          { id: 'all', label: 'All Campaigns' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'border-[#2874F0] text-[#2874F0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-gray-400" />}
          title="No campaigns"
          description="Promotional campaigns will appear here."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Campaign Details</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Budget Progress</th>
                  <th className="p-4">Performance</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {campaigns.map(c => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00'
                  const progress = Math.min(100, Math.round((c.spent / c.total_budget) * 100))
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="p-4">
                        <p className="font-bold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-500">Dates: {new Date(c.start_date).toLocaleDateString('en-IN')} - {new Date(c.end_date).toLocaleDateString('en-IN')}</p>
                      </td>
                      <td className="p-4">{c.store_name}</td>
                      <td className="p-4 capitalize">{c.type}</td>
                      <td className="p-4">
                        <div className="space-y-1 w-44">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Spent: ₹{parseFloat(c.spent).toFixed(0)}</span>
                            <span className="text-gray-900 font-bold">Limit: ₹{parseFloat(c.total_budget).toFixed(0)}</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#FB641B] h-1.5" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        <p><span className="font-bold text-gray-900">{c.impressions}</span> Imps</p>
                        <p><span className="font-bold text-gray-900">{c.clicks}</span> Clicks ({ctr}%)</p>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={c.status} type="ad" />
                      </td>
                      <td className="p-4 text-right">
                        {c.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(c.id)}
                              className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setRejectModal(c.id)}
                              className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-red-500" /> Reject Campaign Listing
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Provide a feedback reason so the vendor can rectify and resubmit.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe why this campaign is being rejected (e.g. invalid dates, duplicate products)..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
                >
                  {rejectMutation.isPending ? 'Saving...' : 'Reject Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
