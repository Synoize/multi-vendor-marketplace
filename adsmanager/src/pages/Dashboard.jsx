import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  Megaphone,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import api from '../lib/axios'
import MetricCard from '../components/ui/MetricCard'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-4 py-3 text-sm shadow-2xl">
      <p className="text-gray-400 text-xs mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {entry.value?.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  )
}

function Dashboard() {
  const navigate = useNavigate()

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['ads-dashboard-summary'],
    queryFn: () => api.get('/ads/vendor/summary').then((r) => r.data),
  })

  const { data: performanceData, isLoading: perfLoading } = useQuery({
    queryKey: ['ads-performance-30d'],
    queryFn: () => api.get('/ads/vendor/analytics?days=30').then((r) => r.data),
  })

  const { data: campaignsData, isLoading: campaignsLoading } = useQuery({
    queryKey: ['ads-campaigns-list'],
    queryFn: () => api.get('/ads/vendor').then((r) => r.data),
  })

  const summary = summaryData?.summary || {}
  const chartData = performanceData?.daily || []
  const campaigns = campaignsData?.campaigns || []

  const totalSpend = summary.totalSpend || 0
  const totalImpressions = summary.totalImpressions || 0
  const totalClicks = summary.totalClicks || 0
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const activeCampaigns = summary.activeCampaigns || 0
  const roas = summary.roas || (totalSpend > 0 ? (summary.revenue / totalSpend).toFixed(2) : '0.00')

  const formattedChartData = chartData.map((d) => ({
    ...d,
    date: d.date ? format(parseISO(d.date), 'dd MMM') : d.date,
  }))

  const METRIC_CARDS = [
    {
      label: 'Total Spend',
      value: `₹${totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      iconBg: 'bg-[#FB641B]/10',
      change: summary.spendChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Total Impressions',
      value: totalImpressions,
      icon: Eye,
      iconBg: 'bg-blue-500/10',
      change: summary.impressionsChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Total Clicks',
      value: totalClicks,
      icon: MousePointerClick,
      iconBg: 'bg-purple-500/10',
      change: summary.clicksChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Average CTR',
      value: `${ctr}%`,
      icon: Percent,
      iconBg: 'bg-emerald-500/10',
      change: summary.ctrChange,
      changeLabel: 'vs last period',
    },
    {
      label: 'Active Campaigns',
      value: activeCampaigns,
      icon: Megaphone,
      iconBg: 'bg-yellow-500/10',
      change: null,
    },
    {
      label: 'ROAS',
      value: `${roas}x`,
      icon: TrendingUp,
      iconBg: 'bg-teal-500/10',
      change: summary.roasChange,
      changeLabel: 'vs last period',
    },
  ]

  const campaignColumns = [
    {
      key: 'name',
      label: 'Campaign',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white truncate max-w-[180px]">
            {row.name}
          </span>
          <span className="text-xs text-gray-500 capitalize">{row.type}</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'impressions',
      label: 'Impressions',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-gray-300">
          {(row.impressions || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'clicks',
      label: 'Clicks',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-gray-300">
          {(row.clicks || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'ctr',
      label: 'CTR',
      render: (_, row) => {
        const ctrVal = row.impressions > 0
          ? ((row.clicks / row.impressions) * 100).toFixed(2)
          : '0.00'
        return <span className="text-sm text-gray-300">{ctrVal}%</span>
      },
    },
    {
      key: 'totalSpend',
      label: 'Spend',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-gray-300">
          ₹{(row.totalSpend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'dailyBudget',
      label: 'Daily Budget',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-gray-300">
          ₹{(row.dailyBudget || 0).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      key: 'period',
      label: 'Period',
      render: (_, row) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {row.startDate ? format(parseISO(row.startDate), 'dd MMM') : '—'}
          {' → '}
          {row.endDate ? format(parseISO(row.endDate), 'dd MMM yy') : 'Ongoing'}
        </span>
      ),
    },
  ]

  return (
    <>
      <Helmet>
        <title>Dashboard — Damini Ads Manager</title>
      </Helmet>

      <div className="flex flex-col gap-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Overview of your ad campaigns performance</p>
          </div>
          <button
            onClick={() => navigate('/campaigns/create')}
            className="btn-primary"
            style={{ background: 'linear-gradient(to right, #FB641B, #e04f09)', border: 'none' }}
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {METRIC_CARDS.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              iconBg={card.iconBg}
              change={card.change}
              changeLabel={card.changeLabel}
              loading={summaryLoading}
            />
          ))}
        </div>

        {/* Performance Chart */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Performance (Last 30 Days)</h2>
              <p className="text-gray-500 text-xs mt-0.5">Daily impressions and clicks trend</p>
            </div>
          </div>

          {perfLoading ? (
            <div className="h-64 skeleton w-full" />
          ) : formattedChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center flex-col gap-3">
              <Eye className="w-10 h-10 text-gray-600" />
              <p className="text-gray-500 text-sm">No performance data yet. Launch your first campaign!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={formattedChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="impressions"
                  orientation="left"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                />
                <YAxis
                  yAxisId="clicks"
                  orientation="right"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                  formatter={(value) => (
                    <span style={{ color: '#9ca3af' }}>{value}</span>
                  )}
                />
                <Line
                  yAxisId="impressions"
                  type="monotone"
                  dataKey="impressions"
                  name="Impressions"
                  stroke="#2874F0"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  yAxisId="clicks"
                  type="monotone"
                  dataKey="clicks"
                  name="Clicks"
                  stroke="#FB641B"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Campaigns Table */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div>
              <h2 className="text-base font-semibold text-white">Campaign Performance</h2>
              <p className="text-gray-500 text-xs mt-0.5">All your ad campaigns at a glance</p>
            </div>
            <button
              onClick={() => navigate('/campaigns')}
              className="btn-ghost text-xs"
            >
              View All
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            {campaignsLoading ? (
              <div className="p-6 flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-12 w-full" />
                ))}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FB641B]/10 flex items-center justify-center">
                  <Megaphone className="w-8 h-8 text-[#FB641B]" />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold">No campaigns yet</p>
                  <p className="text-gray-500 text-sm mt-1">Create your first campaign to start advertising</p>
                </div>
                <button
                  onClick={() => navigate('/campaigns/create')}
                  className="btn-primary"
                  style={{ background: 'linear-gradient(to right, #FB641B, #e04f09)', border: 'none' }}
                >
                  <Plus className="w-4 h-4" />
                  Create Campaign
                </button>
              </div>
            ) : (
              <DataTable
                columns={campaignColumns}
                data={campaigns.slice(0, 8)}
                loading={campaignsLoading}
                emptyMessage="No campaigns yet"
                enablePagination={false}
                enableSearch={false}
                onRowClick={(row) => navigate('/campaigns/' + row._id)}
              />
            )}
          </div>
        </div>

        {/* Quick CTA */}
        {campaigns.length > 0 && campaigns.length < 3 && (
          <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-[#FB641B]/20 bg-[#FB641B]/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FB641B]/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-[#FB641B]" />
              </div>
              <div>
                <p className="text-white font-semibold">Boost your reach</p>
                <p className="text-gray-400 text-sm">Add more campaigns to promote more products</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/campaigns/create')}
              className="flex-shrink-0 flex items-center gap-2 bg-[#FB641B] hover:bg-[#e04f09] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default Dashboard
