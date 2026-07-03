import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Filter,
  Pause,
  Play,
  BarChart3,
  Trash2,
  Megaphone,
  ChevronDown,
  Eye,
  MousePointerClick,
} from 'lucide-react'
import api from '../lib/axios'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'

const STATUS_FILTERS = ['all', 'active', 'paused', 'exhausted', 'rejected', 'pending', 'scheduled', 'completed']

function Campaigns() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['ads-campaigns'],
    queryFn: () => api.get('/ads/vendor').then((r) => r.data),
  })

  const campaigns = data?.campaigns || []

  const pauseMutation = useMutation({
    mutationFn: (id) => api.patch(`/ads/vendor/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] })
      toast.success('Campaign paused')
    },
    onError: () => toast.error('Failed to pause campaign'),
  })

  const resumeMutation = useMutation({
    mutationFn: (id) => api.patch(`/ads/vendor/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] })
      toast.success('Campaign resumed')
    },
    onError: () => toast.error('Failed to resume campaign'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/ads/vendor/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-campaigns'] })
      setConfirmDelete(null)
      toast.success('Campaign deleted')
    },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const filtered = campaigns.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchSearch = !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <>
      <Helmet>
        <title>Campaigns — Damini Ads Manager</title>
      </Helmet>

      <div className="flex flex-col gap-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-gray-400 text-sm mt-0.5">
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={() => navigate('/campaigns/create')}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FB641B] to-[#e04f09] hover:from-[#e04f09] hover:to-[#cc3d00] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark w-full pl-9"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-[#FB641B] text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#FB641B]/10 flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-[#FB641B]" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">
                  {searchQuery || statusFilter !== 'all' ? 'No campaigns match your filters' : 'No campaigns yet'}
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter'
                    : 'Create your first campaign to start advertising'}
                </p>
              </div>
              {!searchQuery && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/campaigns/create')}
                  className="flex items-center gap-2 bg-[#FB641B] hover:bg-[#e04f09] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Campaign', 'Type', 'Products', 'Status', 'Impressions', 'Clicks', 'Budget Progress', 'Period', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => {
                    const spendPct = campaign.totalBudget > 0
                      ? (campaign.totalSpend / campaign.totalBudget) * 100
                      : 0
                    const isActive = campaign.status === 'active'
                    const isPaused = campaign.status === 'paused'

                    return (
                      <tr
                        key={campaign._id}
                        className="border-b border-white/5 hover:bg-white/3 transition-colors group"
                      >
                        <td className="px-4 py-4">
                          <button
                            onClick={() => navigate(`/campaigns/${campaign._id}`)}
                            className="text-left"
                          >
                            <p className="text-sm font-medium text-white hover:text-[#FB641B] transition-colors truncate max-w-[180px]">
                              {campaign.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {campaign.bidAmount ? `₹${campaign.bidAmount} bid` : ''}
                            </p>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase font-medium">
                            {campaign.type || 'CPC'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          {campaign.products?.length || 0}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-sm text-gray-300">
                              {(campaign.impressions || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            <MousePointerClick className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-sm text-gray-300">
                              {(campaign.clicks || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 min-w-[160px]">
                          <div className="flex flex-col gap-1.5">
                            <ProgressBar
                              value={campaign.totalSpend || 0}
                              max={campaign.totalBudget || 1}
                              showPercentage={false}
                              size="sm"
                            />
                            <div className="flex items-center justify-between text-[11px] text-gray-500">
                              <span>₹{(campaign.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                              <span>₹{(campaign.totalBudget || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap">
                          {campaign.startDate ? format(parseISO(campaign.startDate), 'dd MMM') : '—'}
                          <span className="mx-1">→</span>
                          {campaign.endDate ? format(parseISO(campaign.endDate), 'dd MMM yy') : 'Open'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isActive && (
                              <button
                                onClick={() => pauseMutation.mutate(campaign._id)}
                                disabled={pauseMutation.isPending}
                                className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors"
                                title="Pause"
                              >
                                <Pause className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isPaused && (
                              <button
                                onClick={() => resumeMutation.mutate(campaign._id)}
                                disabled={resumeMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                title="Resume"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/campaigns/${campaign._id}`)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                              title="View Analytics"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(campaign._id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="glass-card p-6 max-w-sm w-full mx-4 animate-fadeIn">
              <h3 className="text-white font-bold text-lg mb-2">Delete Campaign?</h3>
              <p className="text-gray-400 text-sm mb-6">
                This action cannot be undone. All campaign data and analytics will be permanently deleted.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate(confirmDelete)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
                >
                  {deleteMutation.isPending ? <Spinner size="xs" color="white" /> : <Trash2 className="w-4 h-4" />}
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Campaigns
