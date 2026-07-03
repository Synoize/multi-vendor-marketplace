import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ArrowLeft, Pause, Play, BarChart2, Calendar, Target } from 'lucide-react'
import { toast } from 'sonner'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch campaign metadata (find it from list of all vendor campaigns)
  const { data: campaignList = [] } = useQuery({
    queryKey: ['vendor-campaigns-list'],
    queryFn: async () => {
      const res = await api.get('/ads/vendor')
      return res.data.data || []
    }
  })

  const campaign = campaignList.find(c => c.id === id)

  // Fetch analytics chart data
  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ['campaign-analytics', id],
    queryFn: async () => {
      const res = await api.get(`/ads/vendor/${id}/analytics`)
      return res.data.data || []
    }
  })

  // Pause / Resume mutation
  const toggleMutation = useMutation({
    mutationFn: async (action) => {
      return api.patch(`/ads/vendor/${id}/${action}`)
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-campaigns-list'] })
      toast.success(`Campaign ${action === 'pause' ? 'paused' : 'resumed'} successfully`)
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  if (isLoading || !campaign) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>

  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00'
  const progress = Math.min(100, Math.round((campaign.spent / campaign.total_budget) * 100))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <StatusBadge status={campaign.status} type="ad" />
          </div>
          <p className="text-gray-500 text-sm">Campaign ID: <span className="font-mono">{campaign.id}</span></p>
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'active' || campaign.status === 'paused') && (
            <button
              onClick={() => toggleMutation.mutate(campaign.status === 'active' ? 'pause' : 'resume')}
              disabled={toggleMutation.isPending}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                campaign.status === 'active'
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              {campaign.status === 'active' ? (
                <><Pause className="h-4 w-4" /> Pause Campaign</>
              ) : (
                <><Play className="h-4 w-4" /> Resume Campaign</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Impressions', value: campaign.impressions },
          { label: 'Clicks', value: campaign.clicks },
          { label: 'CTR', value: `${ctr}%` },
          { label: 'Spent Amount', value: `₹${parseFloat(campaign.spent).toLocaleString('en-IN')}` }
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-gray-400 text-xs font-semibold uppercase">{card.label}</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Budget & Target Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left chart */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
            <BarChart2 className="h-5 w-5 text-[#FB641B]" />
            <h3 className="font-bold text-gray-900 text-sm">Performance Trends (Last 30 Days)</h3>
          </div>
          {analytics.length === 0 ? (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No historical trend data available yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="clicks" stroke="#FB641B" strokeWidth={2} name="Clicks" />
                  <Line type="monotone" dataKey="impressions" stroke="#2874F0" strokeWidth={2} name="Impressions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right side info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">Campaign settings</h3>
          <div className="space-y-3.5 text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gray-400" /> Start Date</span>
              <span className="font-semibold text-gray-800">{new Date(campaign.start_date).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-gray-400" /> End Date</span>
              <span className="font-semibold text-gray-800">{new Date(campaign.end_date).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5"><Target className="h-4 w-4 text-gray-400" /> Bid Amount</span>
              <span className="font-semibold text-gray-800 font-mono">₹{campaign.bid_amount} / {campaign.type}</span>
            </div>
            <div className="pt-2 border-t border-gray-50">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-500">Total Spent: ₹{parseFloat(campaign.spent).toFixed(0)}</span>
                <span className="text-gray-900 font-bold">Budget: ₹{parseFloat(campaign.total_budget).toFixed(0)}</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-[#FB641B] h-2" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
