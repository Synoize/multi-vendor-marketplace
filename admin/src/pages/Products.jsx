import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import { Check, X, Ban, Search, ShieldAlert } from 'lucide-react'

export default function Products() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [rejectModal, setRejectModal] = useState(null) // productId if open
  const [rejectReason, setRejectReason] = useState('')

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', activeTab, search, page],
    queryFn: async () => {
      const statusParam = activeTab ? `&status=${activeTab}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const res = await api.get(`/products?page=${page}&limit=10${statusParam}${searchParam}`)
      return res.data.data
    }
  })

  const products = data?.products || []
  const total = data?.total || 0

  // Approve product mutation
  const approveMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/products/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product approved successfully')
    },
    onError: () => {
      toast.error('Failed to approve product')
    }
  })

  // Reject product mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) => {
      return api.patch(`/products/${id}/reject`, { reason })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product rejected successfully')
      setRejectModal(null)
      setRejectReason('')
    },
    onError: () => {
      toast.error('Failed to reject product')
    }
  })

  // Block product mutation
  const blockMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/products/${id}/block`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product blocked successfully')
    },
    onError: () => {
      toast.error('Failed to block product')
    }
  })

  const handleApprove = (id) => {
    approveMutation.mutate(id)
  }

  const handleRejectSubmit = (e) => {
    e.preventDefault()
    if (!rejectReason.trim()) return
    rejectMutation.mutate({ id: rejectModal, reason: rejectReason })
  }

  const handleBlock = (id) => {
    if (confirm('Are you sure you want to block this product? It will be hidden from customer storefront.')) {
      blockMutation.mutate(id)
    }
  }

  const columns = [
    {
      header: 'Product',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.primary_image || `https://picsum.photos/seed/${row.id}/100`}
            alt=""
            className="h-10 w-10 object-contain bg-gray-50 border border-gray-100 rounded"
          />
          <div className="min-w-0 max-w-xs">
            <p className="font-semibold text-gray-900 truncate">{row.name}</p>
            <p className="text-xs text-gray-500">SKU: {row.sku}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Vendor Store',
      accessor: 'store_name'
    },
    {
      header: 'Category',
      accessor: 'category_name'
    },
    {
      header: 'Price',
      accessor: (row) => `₹${parseFloat(row.price).toLocaleString('en-IN')}`
    },
    {
      header: 'Stock',
      accessor: 'stock'
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} type="product" />
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => handleApprove(row.id)}
                className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRejectModal(row.id)}
                className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === 'active' && (
            <button
              onClick={() => handleBlock(row.id)}
              className="bg-gray-100 text-gray-600 hover:bg-gray-200 p-2 rounded-lg transition-colors"
              title="Block"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Approvals</h1>
          <p className="text-gray-500 text-sm">Review vendor products and manage listings</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2874F0]"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'pending', label: 'Pending Approval' },
          { id: 'active', label: 'Active Listings' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'blocked', label: 'Blocked' }
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
      ) : (
        <DataTable
          columns={columns}
          data={products}
          total={total}
          page={page}
          onPageChange={setPage}
        />
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)}>
          <h3 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" /> Reject Product Listing
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Provide a feedback reason so the vendor can rectify and resubmit.
          </p>
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rejection Reason *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe why this product is being rejected (e.g. low-quality images, invalid specs)..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejectMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold"
              >
                {rejectMutation.isPending ? 'Saving...' : 'Reject Product'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
