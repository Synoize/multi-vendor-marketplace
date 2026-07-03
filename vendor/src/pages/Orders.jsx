import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import { Search, ShoppingBag, Eye, Check, Truck, CheckCircle } from 'lucide-react'

export default function Orders() {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [shippingModal, setShippingModal] = useState(null) // orderId if open
  const [trackingId, setTrackingId] = useState('')
  const [courierName, setCourierName] = useState('')

  const queryClient = useQueryClient()

  // Get orders
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders', activeTab, search, page],
    queryFn: async () => {
      const statusParam = activeTab !== 'all' ? `&status=${activeTab}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const res = await api.get(`/orders/vendor?page=${page}&limit=10${statusParam}${searchParam}`)
      return res.data.data
    }
  })

  const orders = data?.orders || []
  const totalPages = Math.ceil((data?.total || 0) / 10)

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, action, body }) => {
      return api.patch(`/orders/vendor/${orderId}/${action}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] })
      toast.success('Order status updated successfully')
      setShippingModal(null)
      setTrackingId('')
      setCourierName('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update order status')
    }
  })

  const handleConfirm = (orderId) => {
    updateStatusMutation.mutate({ orderId, action: 'confirm' })
  }

  const handleShipSubmit = (e) => {
    e.preventDefault()
    if (!trackingId || !courierName) {
      toast.error('Please fill in tracking ID and Courier details')
      return
    }
    updateStatusMutation.mutate({
      orderId: shippingModal,
      action: 'ship',
      body: { trackingId, courierName }
    })
  }

  const handleDeliver = (orderId) => {
    updateStatusMutation.mutate({ orderId, action: 'deliver' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-500 text-sm">Fulfill and track customer orders</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'all', label: 'All Orders' },
          { id: 'placed', label: 'New' },
          { id: 'processing', label: 'Processing' },
          { id: 'shipped', label: 'Shipped' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' }
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

      {/* Main Body */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-10 w-10 text-gray-400" />}
          title="No orders found"
          description="You don't have any orders matching the selection."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Order Details</th>
                  <th className="p-4">Products</th>
                  <th className="p-4">Total Price</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">#{order.order_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.delivery_name || 'Customer'}</p>
                      <p className="text-xs text-gray-400">{order.delivery_phone}</p>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-medium truncate">{order.product_names || order.product_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Qty: {order.quantity || order.item_count}</p>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      ₹{parseFloat(order.total || order.total_price).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={order.status} type="order" />
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'placed' && (
                          <button
                            onClick={() => handleConfirm(order.order_id || order.id)}
                            className="bg-blue-50 text-[#2874F0] hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Confirm Order"
                          >
                            <Check className="h-4 w-4" /> Confirm
                          </button>
                        )}
                        {order.status === 'processing' && (
                          <button
                            onClick={() => setShippingModal(order.order_id || order.id)}
                            className="bg-orange-50 text-[#FB641B] hover:bg-orange-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Mark Shipped"
                          >
                            <Truck className="h-4 w-4" /> Ship
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleDeliver(order.order_id || order.id)}
                            className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Mark Delivered"
                          >
                            <CheckCircle className="h-4 w-4" /> Deliver
                          </button>
                        )}
                      </div>
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
                className="px-3 py-1.5 border border-gray-200 rounded text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border border-gray-200 rounded text-xs font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Shipment Tracking details</h3>
            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Courier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueDart, Delhivery"
                  value={courierName}
                  onChange={e => setCourierName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">AWB / Tracking ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234567890"
                  value={trackingId}
                  onChange={e => setTrackingId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-[#2874F0] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5de0]"
                >
                  {updateStatusMutation.isPending ? 'Saving...' : 'Submit Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
