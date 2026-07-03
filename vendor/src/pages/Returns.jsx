import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { Check, X, RotateCcw, MessageSquare, AlertCircle } from 'lucide-react'

export default function Returns() {
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [decisionModal, setDecisionModal] = useState(null) // return request object if open
  const [adminNotes, setAdminNotes] = useState('')

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-returns', activeTab, page],
    queryFn: async () => {
      const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : ''
      const res = await api.get(`/returns/vendor?page=${page}&limit=10${statusParam}`)
      return res.data
    }
  })

  // Normalize API response since it returns { data, total, page, limit }
  const returns = data?.data || []
  const totalPages = Math.ceil((data?.total || 0) / 10)

  const updateStatusMutation = useMutation({
    mutationFn: async ({ returnId, status, notes }) => {
      return api.patch(`/returns/${returnId}/status`, { status, adminNotes: notes })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] })
      toast.success('Return request updated successfully')
      setDecisionModal(null)
      setAdminNotes('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update return request')
    }
  })

  const handleUpdate = (returnId, status, notes) => {
    updateStatusMutation.mutate({ returnId, status, notes })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
        <p className="text-gray-500 text-sm">Manage customer product returns and refunds</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: 'All Returns' },
          { id: 'under_review', label: 'Under Review' },
          { id: 'approved', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'pickup_scheduled', label: 'Pickup Scheduled' },
          { id: 'completed', label: 'Completed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1) }}
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
      ) : returns.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-10 w-10 text-gray-400" />}
          title="No return requests"
          description="Customer return requests will appear here."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Order Info</th>
                  <th className="p-4">Product Details</th>
                  <th className="p-4">Return Reason</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Request Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {returns.map(req => (
                  <tr key={req.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">#{req.order_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Item ID: #{req.order_item_id}</p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-medium truncate">{req.product_name}</p>
                      {req.variant_name && <p className="text-xs text-gray-500">{req.variant_name}</p>}
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800">{req.reason}</p>
                      {req.description && <p className="text-xs text-gray-500 mt-0.5">{req.description}</p>}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={req.status} type="return" />
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(req.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'under_review' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDecisionModal({ ...req, action: 'approved' })}
                            className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <Check className="h-4 w-4" /> Approve
                          </button>
                          <button
                            onClick={() => setDecisionModal({ ...req, action: 'rejected' })}
                            className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                          >
                            <X className="h-4 w-4" /> Reject
                          </button>
                        </div>
                      )}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleUpdate(req.id, 'pickup_scheduled', 'Pickup scheduled by vendor')}
                          className="bg-blue-50 text-[#2874F0] hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Schedule Pickup
                        </button>
                      )}
                      {req.status === 'pickup_scheduled' && (
                        <button
                          onClick={() => handleUpdate(req.id, 'completed', 'Refund initiated and return completed')}
                          className="bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        >
                          Process Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex items-center justify-between">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border border-gray-200 rounded text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Decision Modal */}
      {decisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-2 capitalize flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${decisionModal.action === 'approved' ? 'text-green-500' : 'text-red-500'}`} />
              {decisionModal.action} Return Request
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Order #{decisionModal.order_number} for product {decisionModal.product_name}
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Response Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder={`Reason for ${decisionModal.action}...`}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDecisionModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdate(decisionModal.id, decisionModal.action, adminNotes)}
                  disabled={!adminNotes.trim() || updateStatusMutation.isPending}
                  className={`px-4 py-2 text-white rounded-lg text-sm font-semibold ${
                    decisionModal.action === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {updateStatusMutation.isPending ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
