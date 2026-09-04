import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import DataTable from '../components/ui/DataTable'
import { Wallet, History, Plus, CreditCard, Check, Download, RefreshCw, AlertTriangle } from 'lucide-react'

export default function Payouts() {
  const queryClient = useQueryClient()
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [form, setForm] = useState({
    vendorId: '',
    orderIdsRaw: '',
    amount: '',
    transactionRef: '',
  })

  const loadPreview = async () => {
    setPreviewLoading(true)
    try {
      const res = await api.get('/admin/payouts/preview')
      setPreviewData(res.data?.data || res.data || {})
      setShowPreviewModal(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load settlement preview')
    } finally {
      setPreviewLoading(false)
    }
  }

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
      return res.data?.data || res.data || []
    }
  })

  const releaseMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/admin/payouts/release', payload)
    },
    onSuccess: (res) => {
      const r = res.data?.data || {}
      const amt = parseFloat(r.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
      toast.success(`Payout of ₹${amt} released${r.order_count ? ` (${r.order_count} order(s))` : ''}`)
      resetForm()
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Failed to release payout')
    }
  })

  const runCycleMutation = useMutation({
    mutationFn: async () => {
      return api.post('/admin/payouts/run-cycle')
    },
    onSuccess: (res) => {
      const r = res.data?.data || {}
      const msg = r.created
        ? `Settlement cycle complete: ${r.created} payout(s) released, ${r.skippedUnderMin || 0} below minimum, ${r.skippedNoBank || 0} missing bank details`
        : 'Settlement cycle complete: no eligible payouts above the minimum threshold'
      toast.success(msg)
      setShowPreviewModal(false)
      setPreviewData(null)
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: () => {
      toast.error('Failed to run settlement cycle')
    }
  })

  const [settlingVendorId, setSettlingVendorId] = useState(null)
  const settleVendorMutation = useMutation({
    mutationFn: async (vendorId) => api.post('/admin/payouts/settle-vendor', { vendorId }),
    onSuccess: async (res) => {
      const r = res.data?.data || {}
      toast.success(`Payout of ₹${parseFloat(r.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })} released to ${r.store_name || 'vendor'}`)
      try {
        const fres = await api.get('/admin/payouts/preview')
        setPreviewData(fres.data?.data || fres.data)
      } catch { /* keep current preview */ }
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] })
    },
    onError: (e) => {
      toast.error(e.response?.data?.message || 'Failed to release this vendor')
    },
    onSettled: () => setSettlingVendorId(null),
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
        <div className="flex gap-2">
          <button
            onClick={loadPreview}
            disabled={previewLoading}
            className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-60"
          >
            {previewLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {previewLoading ? 'Checking...' : 'Run Settlement Cycle'}
          </button>
          <button
            onClick={() => setShowReleaseModal(true)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Release Payout
          </button>
        </div>
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

      {showPreviewModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Settlement Cycle Preview</h3>
                <p className="text-xs text-gray-500">Vendors eligible for auto-settlement on the next run</p>
              </div>
              <button
                onClick={() => { setShowPreviewModal(false); setPreviewData(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {previewLoading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" /></div>
            ) : !previewData || !previewData.vendors?.length ? (
              <div className="px-6 py-16 text-center">
                <Check className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold">No eligible settlements right now</p>
                <p className="text-xs text-gray-400 mt-1">
                  No delivered orders past their return window available to pay out.
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 text-sm text-emerald-700">
                  <span className="font-semibold">{previewData.will_release_count || 0}</span> vendor(s) will be paid · Total{" "}
                  <span className="font-bold">₹{(previewData.will_release_total || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>{" "}
                  · Minimum threshold ₹{previewData.min_payout ?? 0}
                </div>
                <div className="overflow-y-auto px-6 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-2 pr-2">Vendor</th>
                        <th className="pb-2 pr-2">Eligible (Orders)</th>
                        <th className="pb-2 pr-2">Amount</th>
                        <th className="pb-2 pr-2">Status</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.vendors.map((v) => (
                        <tr key={v.vendor_id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 pr-2">
                            <p className="font-medium text-gray-900">{v.store_name || v.vendor_id}</p>
                            <p className="text-[11px] text-gray-400 truncate max-w-[180px]">{v.owner_name || v.email}</p>
                          </td>
                          <td className="py-2.5 pr-2 text-gray-600">{v.order_count}</td>
                          <td className="py-2.5 pr-2 font-semibold text-gray-900">
                            ₹{parseFloat(v.payable).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 pr-2">
                            {v.will_release ? (
                              <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-0.5 rounded-full">Will be paid</span>
                            ) : v.below_min && !v.has_bank ? (
                              <span className="bg-amber-50 text-amber-600 text-xs font-medium px-2 py-0.5 rounded-full">Below min & no bank</span>
                            ) : v.below_min ? (
                              <span className="bg-amber-50 text-amber-600 text-xs font-medium px-2 py-0.5 rounded-full">Below minimum</span>
                            ) : (
                              <span className="bg-red-50 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">No bank details</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            {v.will_release && (
                              <button
                                disabled={settlingVendorId === v.vendor_id}
                                onClick={() => {
                                  if (window.confirm(`Release ₹${parseFloat(v.payable).toLocaleString('en-IN', { maximumFractionDigits: 2 })} to ${v.store_name || 'this vendor'}?`)) {
                                    setSettlingVendorId(v.vendor_id)
                                    settleVendorMutation.mutate(v.vendor_id)
                                  }
                                }}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                              >
                                {settlingVendorId === v.vendor_id ? 'Releasing...' : 'Settle'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                  <button
                    onClick={() => { setShowPreviewModal(false); setPreviewData(null); }}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => runCycleMutation.mutate()}
                    disabled={runCycleMutation.isPending || (previewData.will_release_count || 0) === 0}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle className="h-4 w-4" /> {runCycleMutation.isPending ? 'Processing...' : `Confirm & Release (${previewData.will_release_count || 0})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
