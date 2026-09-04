import { useState, useRef } from 'react'
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
  Eye,
  MousePointerClick,
} from 'lucide-react'
import api from '../lib/axios'
import StatusBadge from '../components/ui/StatusBadge'
import ProgressBar from '../components/ui/ProgressBar'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import DataTable from '../components/ui/DataTable'

const STATUS_FILTERS = ['all', 'active', 'paused', 'exhausted', 'rejected', 'pending', 'scheduled', 'completed']

function Campaigns() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const actionLock = useRef(false)

  const { data, isLoading } = useQuery({
    queryKey: ['ads-campaigns'],
    queryFn: () => api.get('/ads/vendor').then((r) => r.data),
  })

  const campaigns = data?.data?.campaigns || []

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

  const isAnyPending = pauseMutation.isPending || resumeMutation.isPending || deleteMutation.isPending

  const confirmDeleteHandler = (id) => {
    if (isAnyPending) return
    setConfirmDelete(id)
  }

  const runAction = (fn, id) => {
    if (actionLock.current || isAnyPending) return
    actionLock.current = true
    fn(id, { onSettled: () => { actionLock.current = false } })
  }

  const pauseHandler = (id) => runAction(pauseMutation.mutate.bind(pauseMutation), id)
  const resumeHandler = (id) => runAction(resumeMutation.mutate.bind(resumeMutation), id)

  const filtered = campaigns.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    const matchSearch = !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchStatus && matchSearch
  })

  const columns = [
    {
      key: 'name',
      label: 'Campaign',
      render: (_, campaign) => (
        <button onClick={() => navigate(`/campaigns/${campaign._id}`)} className="text-left">
          <p className="text-sm font-medium text-secondary-950 hover:text-primary transition-colors truncate max-w-[180px]">
            {campaign.name}
          </p>
          <p className="text-xs text-secondary-700 mt-0.5">
            {campaign.bidAmount ? `₹${campaign.bidAmount} bid` : ''}
          </p>
        </button>
      ),
      sortable: true,
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, campaign) => (
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full uppercase font-medium">
          {campaign.type || 'CPC'}
        </span>
      ),
    },
    {
      key: 'products',
      label: 'Products',
      render: (_, campaign) => (
        <span className="text-sm text-secondary-900">{campaign.products?.length || 0}</span>
      ),
      sortable: false,
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, campaign) => <StatusBadge status={campaign.status} />,
      sortable: true,
    },
    {
      key: 'impressions',
      label: 'Impressions',
      render: (_, campaign) => (
        <div className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-secondary-700" />
          <span className="text-sm text-secondary-900">
            {(campaign.impressions || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'clicks',
      label: 'Clicks',
      render: (_, campaign) => (
        <div className="flex items-center gap-1.5">
          <MousePointerClick className="w-3.5 h-3.5 text-secondary-700" />
          <span className="text-sm text-secondary-900">
            {(campaign.clicks || 0).toLocaleString('en-IN')}
          </span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'budgetProgress',
      label: 'Budget Progress',
      render: (_, campaign) => (
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <ProgressBar
            value={campaign.totalSpend || 0}
            max={campaign.totalBudget || 1}
            showPercentage={false}
            size="sm"
          />
          <div className="flex items-center justify-between text-[11px] text-secondary-800">
            <span>₹{(campaign.totalSpend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span>₹{(campaign.totalBudget || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      ),
      sortable: false,
    },
    {
      key: 'period',
      label: 'Period',
      render: (_, campaign) => (
        <span className="text-xs text-secondary-800 whitespace-nowrap">
          {campaign.startDate ? format(parseISO(campaign.startDate), 'dd MMM') : '—'}
          <span className="mx-1">→</span>
          {campaign.endDate ? format(parseISO(campaign.endDate), 'dd MMM yy') : 'Open'}
        </span>
      ),
      sortable: false,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, campaign) => {
        const isActive = campaign.status === 'active'
        const isPaused = campaign.status === 'paused'
        return (
          <div className="flex items-center gap-1">
            {isActive && (
              <button
                onClick={() => pauseHandler(campaign._id)}
                disabled={isAnyPending}
                className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Pause"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => resumeHandler(campaign._id)}
                disabled={isAnyPending}
                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Resume"
              >
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => navigate(`/campaigns/${campaign._id}`)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              title="View Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => confirmDeleteHandler(campaign._id)}
              disabled={isAnyPending}
              className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      },
      sortable: false,
    },
  ]

  return (
    <>
      <Helmet>
        <title>Campaigns — Damini Ads Manager</title>
      </Helmet>

      <div className="flex flex-col gap-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-secondary-950">Campaigns</h1>
            <p className="text-secondary-800 text-sm mt-0.5">
              {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={() => navigate('/campaigns/create')}
            className="flex items-center gap-2 bg-primary hover:bg-primary-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-800" />
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
            <Filter className="w-4 h-4 text-secondary-800 flex-shrink-0" />
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-white text-secondary-900 hover:text-primary hover:bg-secondary-200 border border-secondary-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <DataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage={
              searchQuery || statusFilter !== 'all'
                ? 'No campaigns match your filters'
                : 'No campaigns yet'
            }
            enablePagination={false}
            enableSearch={false}
            muiTableBodyRowProps={() => ({
              className: 'group',
            })}
          />
        </div>

        <ConfirmDialog
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => runAction(deleteMutation.mutate.bind(deleteMutation), confirmDelete)}
          loading={deleteMutation.isPending}
          title="Delete Campaign?"
          description="This action cannot be undone. All campaign data and analytics will be permanently deleted."
          confirmLabel="Delete"
          variant="danger"
        />
      </div>
    </>
  )
}

export default Campaigns
