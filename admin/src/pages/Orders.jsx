import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'
import { Search, Edit, Check } from 'lucide-react'

export default function Orders() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [editStatusModal, setEditStatusModal] = useState(null) // orderId if open
  const [newStatus, setNewStatus] = useState('')

  // Fetch orders
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, page],
    queryFn: async () => {
      const statusParam = status ? `&status=${status}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const res = await api.get(`/orders/admin?page=${page}&limit=10${statusParam}${searchParam}`)
      return res.data.data
    }
  })

  const orders = data?.orders || []
  const total = data?.total || 0

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      return api.patch(`/orders/admin/${orderId}/status`, { status })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      toast.success('Order status updated')
      setEditStatusModal(null)
    },
    onError: () => {
      toast.error('Failed to update order status')
    }
  })

  const handleUpdateStatus = (e) => {
    e.preventDefault()
    updateStatusMutation.mutate({ orderId: editStatusModal, status: newStatus })
  }

  const columns = [
    {
      header: 'Order Details',
      accessor: (row) => (
        <div>
          <p className="font-bold text-gray-900">#{row.order_number}</p>
          <p className="text-xs text-gray-500 font-mono">{row.id}</p>
        </div>
      )
    },
    {
      header: 'Customer',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-gray-800">{row.delivery_name || 'Customer'}</p>
          <p className="text-xs text-gray-500">{row.delivery_phone}</p>
        </div>
      )
    },
    {
      header: 'Items',
      accessor: 'item_count'
    },
    {
      header: 'Total Price',
      accessor: (row) => `₹${parseFloat(row.total).toLocaleString('en-IN')}`
    },
    {
      header: 'Order Status',
      accessor: (row) => <StatusBadge status={row.status} type="order" />
    },
    {
      header: 'Payment Status',
      accessor: (row) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          row.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {row.payment_status}
        </span>
      )
    },
    {
      header: 'Order Date',
      accessor: (row) => new Date(row.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <button
          onClick={() => { setEditStatusModal(row.id); setNewStatus(row.status) }}
          className="bg-blue-50 text-[#2874F0] hover:bg-blue-100 p-2 rounded-lg transition-colors"
          title="Update Status"
        >
          <Edit className="h-4 w-4" />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm">Monitor all platform transactions and customer orders</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] bg-white text-gray-700"
          >
            <option value="">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search order number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2874F0]"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
          total={total}
          page={page}
          onPageChange={setPage}
        />
      )}

      {/* Edit Status Modal */}
      {editStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Update Order Status</h3>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status *</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                >
                  <option value="placed">Placed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStatusModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-[#2874F0] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5de0]"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
