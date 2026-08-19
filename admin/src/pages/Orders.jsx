import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'
import { Search, Edit, Check, Download } from 'lucide-react'

export default function Orders() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState([])
  const [editStatusModal, setEditStatusModal] = useState(null)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, page, pageSize, sorting],
    queryFn: async () => {
      const statusParam = status ? `&status=${status}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const sortParam = sorting.length > 0 ? `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}` : ''
      const res = await api.get(`/orders/admin?page=${page}&limit=${pageSize}${statusParam}${searchParam}${sortParam}`)
      return res.data.data
    }
  })

  const orders = data?.orders || []
  const total = data?.total || 0

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => api.patch(`/orders/admin/${orderId}/status`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order status updated'); setEditStatusModal(null); },
    onError: () => toast.error('Failed to update order status')
  })

  const handleUpdateStatus = (e) => {
    e.preventDefault()
    updateStatusMutation.mutate({ orderId: editStatusModal, status: newStatus })
  }

  const columns = [
    {
      key: 'order_number', label: 'Order Details',
      render: (val, row) => (
        <div>
          <p className="font-bold text-gray-900">#{val}</p>
          <p className="text-xs text-gray-400 font-mono">{row.id}</p>
        </div>
      )
    },
    {
      key: 'delivery_name', label: 'Customer',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-gray-700">{val || 'Customer'}</p>
          <p className="text-xs text-gray-400">{row.delivery_phone}</p>
        </div>
      )
    },
    { key: 'item_count', label: 'Items', render: (val) => <span className="text-gray-600">{val ?? '—'}</span> },
    { key: 'total', label: 'Total Price', render: (val) => <span className="font-semibold text-gray-900">₹{parseFloat(val).toLocaleString('en-IN')}</span> },
    { key: 'status', label: 'Order Status', render: (val) => <StatusBadge status={val} type="order" /> },
    {
      key: 'payment_status', label: 'Payment Status',
      render: (val) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{val}</span>
      )
    },
    {
      key: 'created_at', label: 'Order Date',
      render: (val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    {
      key: 'id', label: 'Actions', sortable: false,
      render: (val, row) => (
        <button onClick={() => { setEditStatusModal(row.id); setNewStatus(row.status) }}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors" title="Update Status">
          <Edit className="h-4 w-4" />
        </button>
      )
    }
  ]

  const handleExport = (tableData) => {
    if (!tableData.length) return;
    const exportCols = columns.filter(c => c.sortable !== false);
    const headers = exportCols.map(c => c.label).join(',');
    const rows = tableData.map(row => exportCols.map(c => { const s = String(row[c.key] ?? ''); return s.includes(',') ? `"${s}"` : s; }).join(','));
    const csv = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `orders_${status || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-gray-500 text-sm">Monitor all platform transactions and customer orders</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300">
            <option value="">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search order number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-300" />
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
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => { setPage(newPage); if (newPageSize !== pageSize) setPageSize(newPageSize); }}
          sorting={sorting}
          onSortingChange={setSorting}
          manualPagination
          manualSorting
          enableExport
          enableColumnVisibility
          renderTopToolbarCustomActions={({ table }) => (
            <button onClick={() => handleExport(table.getPrePaginationRowModel().rows.map(r => r.original))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        />
      )}

      {editStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Update Order Status</h3>
            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status *</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300">
                  <option value="placed">Placed</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditStatusModal(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
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
