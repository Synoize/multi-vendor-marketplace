import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Wallet, History, Plus, CreditCard, Check } from 'lucide-react'

export default function Payouts() {
  const queryClient = useQueryClient()
  const [showReleaseModal, setShowReleaseModal] = useState(false)
  const [form, setForm] = useState({
    vendorId: '',
    orderIdsRaw: '',
    amount: '',
    transactionRef: '',
  })

  // Fetch payout history
  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: async () => {
      const res = await api.get('/admin/payouts')
      return res.data.data || []
    }
  })

  // Fetch vendors list to populate dropdown
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payouts</h1>
          <p className="text-gray-500 text-sm">Release bank settlements and monitor payout transaction history</p>
        </div>
        <button
          onClick={() => setShowReleaseModal(true)}
          className="flex items-center gap-1.5 bg-[#2874F0] hover:bg-[#1a5de0] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Transaction Details</th>
                  <th className="p-4">Vendor Store</th>
                  <th className="p-4">Owner Email</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Settled At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {payouts.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-mono text-xs font-bold text-gray-900">{p.transaction_ref || `settle_${p.id}`}</p>
                      <p className="text-[10px] text-gray-400">Orders: {p.order_ids || '[]'}</p>
                    </td>
                    <td className="p-4">{p.store_name}</td>
                    <td className="p-4 text-xs text-gray-500">{p.email}</td>
                    <td className="p-4 font-bold text-gray-900">
                      ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(p.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Release Payout Modal */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[#2874F0]" /> Release Settlement Payout
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Vendor *</label>
                <select
                  required
                  value={form.vendorId}
                  onChange={e => setForm(f => ({ ...f, vendorId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] bg-white text-gray-700"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Order IDs (comma-separated, optional)</label>
                <input
                  type="text"
                  placeholder="e.g. order_1, order_2"
                  value={form.orderIdsRaw}
                  onChange={e => setForm(f => ({ ...f, orderIdsRaw: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] font-mono"
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
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={releaseMutation.isPending}
                  className="px-4 py-2 bg-[#2874F0] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5de0] flex items-center gap-1"
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
