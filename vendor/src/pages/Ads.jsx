import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { Megaphone, Plus, Pause, Play, BarChart2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Ads() {
  const queryClient = useQueryClient()

  // Fetch campaigns
  const { data = [], isLoading } = useQuery({
    queryKey: ['vendor-ads'],
    queryFn: async () => {
      const res = await api.get('/ads/vendor')
      return res.data.data || []
    }
  })

  // Pause / Resume mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      return api.patch(`/ads/vendor/${id}/${action}`)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-ads'] })
      toast.success(`Campaign ${variables.action === 'pause' ? 'paused' : 'resumed'} successfully`)
    },
    onError: () => {
      toast.error('Failed to update campaign status')
    }
  })

  const handleToggle = (id, currentStatus) => {
    const action = currentStatus === 'active' ? 'pause' : 'resume'
    toggleStatusMutation.mutate({ id, action })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sponsored Product Campaigns</h1>
          <p className="text-gray-500 text-sm">Boost visibility of your products with paid ads</p>
        </div>
        <Link
          to="/ads/create"
          className="flex items-center gap-1.5 bg-[#FB641B] hover:bg-[#e55a18] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create Campaign
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-10 w-10 text-gray-400" />}
          title="No campaigns yet"
          description="Promote your products and drive more sales by creating an ad campaign."
          actionText="Create Ad Campaign"
          onAction={() => window.location.href = '/ads/create'}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Campaign Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Budget Details</th>
                  <th className="p-4">Impressions / Clicks</th>
                  <th className="p-4">CTR</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {data.map(campaign => {
                  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00'
                  const progress = Math.min(100, Math.round((campaign.spent / campaign.total_budget) * 100))
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-semibold text-gray-900">{campaign.name}</td>
                      <td className="p-4 capitalize">{campaign.type}</td>
                      <td className="p-4">
                        <div className="space-y-1 w-48">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Spent: ₹{parseFloat(campaign.spent).toFixed(0)}</span>
                            <span className="text-gray-900 font-bold">Limit: ₹{parseFloat(campaign.total_budget).toFixed(0)}</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#FB641B] h-1.5" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-600">
                        <p><span className="font-bold text-gray-900">{campaign.impressions}</span> Impressions</p>
                        <p><span className="font-bold text-gray-900">{campaign.clicks}</span> Clicks</p>
                      </td>
                      <td className="p-4 font-semibold text-[#2874F0]">{ctr}%</td>
                      <td className="p-4">
                        <StatusBadge status={campaign.status} type="ad" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(campaign.status === 'active' || campaign.status === 'paused') && (
                            <button
                              onClick={() => handleToggle(campaign.id, campaign.status)}
                              className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
                                campaign.status === 'active'
                                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                  : 'bg-green-50 text-green-600 hover:bg-green-100'
                              }`}
                              title={campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                            >
                              {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
