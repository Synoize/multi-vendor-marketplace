import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import DataTable from '../components/ui/DataTable'
import { Wallet, History, Plus, CreditCard, Check, Download } from 'lucide-react'

export default function Payouts() {
  const queryClient = useQueryClient()
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [form, setForm] = useState({
    vendorId: '',
    orderIdsRaw: '',
    amount: '',
    transactionRef: '',
  })

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const res = await api.get('/admin/payouts')
      return res.data.data || []
    }
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['admin-vendors-dropdown'],
    queryFn: async () => {
      const res = await api.get('/admin/vendors?limit=100')
      return res.data.data?.data || []
    }
  })

  const releaseMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/admin/payouts/release', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })
      toast.success('Payout released successfully')
      resetForm()
    },
    onError: () => {
      toast.error('Failed to release payout')
    }
  })

  const resetForm = () => {
    setForm({
      vendorId: '',
      orderIdsRaw: '',
      amount: '',
      transactionRef: '',
    })
    setShowReleaseModal(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.vendorId || !form.amount) return
    const orderIds = form.orderIdsRaw ? form.orderIdsRaw.split(',').map(s => s.trim()) : []
    releaseMutation.mutate({
      vendorId: form.vendorId,
      amount: parseFloat(form.amount),
      orderIds,
      transactionRef: form.transactionRef,
    })
  }

  const columns = [
    {
      key: 'transaction_ref',
      label: 'Transaction Details',
      render: (_, p) => (
        <div>
          <p className="font-mono text-xs font-bold text-gray-900">{p.transaction_ref || `settle_${p.id}`}</p>
          <p className="text-[10px] text-gray-400">Orders: {p.order_ids || '[]'}</p>
        </div>
      )
    },
    { key: 'store_name', label: 'Vendor Store' },
    { key: 'email', label: 'Owner Email' },
    {
      key: 'amount',
      label: 'Amount',
      render: (_, p) => (
        <span className="font-bold text-gray-900">
          ₹{parseFloat(p.amount).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, p) => (
        <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
          {p.status}
        </span>
      )
    },
    {
      key: 'created_at',
      label: 'Settled At',
      render: (_, p) => (
        <span className="text-xs text-gray-400">
          {new Date(p.created_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}
        </span>
      )
    },
  ]

  const handleExport = (rows) => {
    const headers = ['Transaction', 'Store', 'Email', 'Amount', 'Status', 'Date']
    const csvRows = rows.map(p => [
      p.transaction_ref || `settle_${p.id}`,
      p.store_name,
      p.email,
      parseFloat(p.amount).toLocaleString('en-IN'),
      p.status,
      new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    ])
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'payouts.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderTopToolbarCustomActions = ({ table }) => (
    <button
      onClick={() => handleExport(table.getFilteredRowModel().rows.map(r => r.original))}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
    >
      <Download className="h-4 w-4" /> Export
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Vendor Payouts</h1>
          <p className="text-gray-500 text-sm">Release bank settlements and monitor payout transaction history</p>
        </div>
        <button
          onClick={() => setShowReleaseModal(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Release Payout
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : payouts.length === 0 ? (
        <EmptyState
          icon={<History className="h-10 w-10 text-gray-400" />}
          title="No payouts"
          description="Settlement history will appear here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={payouts}
          loading={isLoading}
          emptyMessage="No payouts found"
          enableSearch
          enableExport
          enableColumnVisibility
          enablePagination
          renderTopToolbarCustomActions={renderTopToolbarCustomActions}
        />
      )}

      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" /> Release Settlement Payout
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Vendor *</label>
                <select
                  required
                  value={form.vendorId}
                  onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                >
                  <option value="">-- Choose Vendor --</option>
                  {vendorsData?.map(v => (
                    <option key={v.id} value={v.id}>{v.store_name} ({v.owner_name})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payout Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order IDs (comma-separated, optional)</label>
                <input
                  type="text"
                  placeholder="e.g. order_1, order_2"
                  value={form.orderIdsRaw}
                  onChange={e => setForm(f => ({ ...f, orderIdsRaw: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Transaction Reference / UTR *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN123456789"
                  value={form.transactionRef}
                  onChange={e => setForm(f => ({ ...f, transactionRef: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 text-gray-900 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-red-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releaseMutation.isPending}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Check className="h-4 w-4" /> {releaseMutation.isPending ? 'Processing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
