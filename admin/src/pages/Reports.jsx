import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, Download, TrendingUp, ShoppingBag, Users as UsersIcon, Megaphone } from 'lucide-react'

export default function Reports() {
  const [activeTab, setActiveTab] = useState('sales')
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
  const [to, setTo] = useState(new Date().toISOString().split('T')[0])

  // Sales Report
  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['admin-reports-sales', from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/sales?from=${from}&to=${to}`)
      return res.data.data || []
    },
    enabled: activeTab === 'sales'
  })

  // Vendors Report
  const { data: vendorsData = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['admin-reports-vendors'],
    queryFn: async () => {
      const res = await api.get('/reports/vendors')
      return res.data.data || []
    },
    enabled: activeTab === 'vendors'
  })

  // Users Report
  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-reports-users'],
    queryFn: async () => {
      const res = await api.get('/reports/users')
      return res.data.data || []
    },
    enabled: activeTab === 'users'
  })

  // Ads Report
  const { data: adsData = [], isLoading: adsLoading } = useQuery({
    queryKey: ['admin-reports-ads'],
    queryFn: async () => {
      const res = await api.get('/reports/ads')
      return res.data.data || []
    },
    enabled: activeTab === 'ads'
  })

  // Reusable CSV Downloader
  const downloadCSV = (filename, data) => {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map(row =>
      Object.values(row).map(val => {
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`
        return val
      }).join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Reports</h1>
          <p className="text-gray-500 text-sm">Download analytical sales, vendor, user, and ad data</p>
        </div>

        {activeTab === 'sales' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#2874F0]"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#2874F0]"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'sales', label: 'Sales Report', icon: <TrendingUp className="h-4 w-4" /> },
          { id: 'vendors', label: 'Vendor Performance', icon: <ShoppingBag className="h-4 w-4" /> },
          { id: 'users', label: 'User Registrations', icon: <UsersIcon className="h-4 w-4" /> },
          { id: 'ads', label: 'Sponsored Ads', icon: <Megaphone className="h-4 w-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-[#2874F0] text-[#2874F0]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Sales Report Tab */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {salesLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : salesData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-10 w-10 text-gray-400" />}
              title="No data found"
              description="No sales data found for the selected dates."
            />
          ) : (
            <>
              {/* Chart */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">Revenue Trend</h3>
                  <button
                    onClick={() => downloadCSV(`sales_report_${from}_to_${to}.csv`, salesData)}
                    className="flex items-center gap-1.5 text-[#2874F0] hover:underline text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#2874F0" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-4">Date</th>
                      <th className="p-4">Orders</th>
                      <th className="p-4">Discounts</th>
                      <th className="p-4">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {salesData.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-4 font-mono text-xs">{new Date(s.date).toLocaleDateString('en-IN')}</td>
                        <td className="p-4">{s.orders}</td>
                        <td className="p-4 text-red-500">₹{parseFloat(s.discounts || 0).toLocaleString('en-IN')}</td>
                        <td className="p-4 font-bold text-gray-900">₹{parseFloat(s.revenue || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Vendor Tab */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          {vendorsLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : vendorsData.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-10 w-10 text-gray-400" />}
              title="No vendors"
              description="No vendor performance data available."
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Vendor Rankings</h3>
                <button
                  onClick={() => downloadCSV('vendor_performance.csv', vendorsData)}
                  className="flex items-center gap-1.5 text-[#2874F0] hover:underline text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-4">Store Name</th>
                      <th className="p-4">KYC Status</th>
                      <th className="p-4">Total Sales</th>
                      <th className="p-4">Orders count</th>
                      <th className="p-4">Commission Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {vendorsData.map((v, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-4 font-semibold">{v.store_name}</td>
                        <td className="p-4 uppercase text-xs">{v.kyc_status}</td>
                        <td className="p-4 font-bold">₹{parseFloat(v.total_sales || 0).toLocaleString('en-IN')}</td>
                        <td className="p-4 text-gray-500">{v.orders}</td>
                        <td className="p-4 text-green-600 font-bold">₹{parseFloat(v.commission || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {usersLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : usersData.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-10 w-10 text-gray-400" />}
              title="No user data"
              description="No user registrations in the last 30 days."
            />
          ) : (
            <>
              {/* Chart */}
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">User Registration Growth</h3>
                  <button
                    onClick={() => downloadCSV('user_registrations.csv', usersData)}
                    className="flex items-center gap-1.5 text-[#2874F0] hover:underline text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </button>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usersData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="new_users" stroke="#FB641B" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Ads Tab */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {adsLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : adsData.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-10 w-10 text-gray-400" />}
              title="No campaigns"
              description="No sponsorship campaign metrics found."
            />
          ) : (
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">Campaign CTR & Spend</h3>
                <button
                  onClick={() => downloadCSV('campaign_performance.csv', adsData)}
                  className="flex items-center gap-1.5 text-[#2874F0] hover:underline text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-4">Campaign</th>
                      <th className="p-4">Store</th>
                      <th className="p-4">Impressions / Clicks</th>
                      <th className="p-4">Spent / Budget</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {adsData.map((c, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="p-4 font-semibold">{c.name}</td>
                        <td className="p-4">{c.store_name}</td>
                        <td className="p-4 text-xs">
                          <p><span className="font-bold">{c.impressions}</span> Imps</p>
                          <p><span className="font-bold">{c.clicks}</span> Clicks</p>
                        </td>
                        <td className="p-4 text-xs">
                          <p>Spent: <span className="font-bold text-red-500">₹{parseFloat(c.spent).toFixed(0)}</span></p>
                          <p>Limit: <span className="font-bold text-gray-900">₹{parseFloat(c.total_budget).toFixed(0)}</span></p>
                        </td>
                        <td className="p-4 uppercase text-xs">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
