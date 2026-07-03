import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, ChevronRight } from 'lucide-react'
import api from '@/lib/axios'
import Spinner from '@/components/ui/Spinner'

const STATUS_TABS = ['all', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled']
const STATUS_COLORS = {
  placed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-orange-100 text-orange-700',
  out_for_delivery: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function Orders() {
  const [activeTab, setActiveTab] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: async () => {
      const params = activeTab !== 'all' ? `?status=${activeTab}` : ''
      const { data } = await api.get(`/orders${params}`)
      return data.data
    },
  })

  const orders = data?.orders || []

  return (
    <>
      <Helmet><title>My Orders - Damini</title></Helmet>
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">My Orders</h1>

        {/* Status Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-[#2874F0] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-[#2874F0] hover:text-[#2874F0]'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Spinner size="lg" />
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center">
            <Package className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet</p>
            <Link to="/products" className="bg-[#2874F0] text-white font-bold px-6 py-2.5 rounded text-sm hover:bg-[#1a5de0] transition-colors">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-sm text-gray-900">#{order.order_number}</h3>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                        {order.status?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {order.item_count} item{order.item_count !== 1 ? 's' : ''} · Ordered {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {order.product_names && (
                      <p className="text-sm text-gray-700 line-clamp-1">{order.product_names}</p>
                    )}
                    <p className="font-bold text-gray-900 mt-2">₹{parseFloat(order.total).toLocaleString('en-IN')}</p>
                  </div>
                  <Link to={`/orders/${order.id}`}
                    className="flex items-center gap-1 text-[#2874F0] text-sm font-semibold hover:underline whitespace-nowrap mt-1">
                    View Details <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
