import { Helmet } from 'react-helmet-async'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, MapPin, CreditCard, Truck, CheckCircle, XCircle, RotateCcw, Download } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'

const STATUS_STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cancelling, setCancelling] = useState(false)

  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => { const { data } = await api.get(`/orders/my/${id}`); return data.data },
  })

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      await api.delete(`/orders/${id}/cancel`, { data: { reason: 'Cancelled by customer' } })
      toast.success('Order cancelled successfully')
      refetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel order') }
    finally { setCancelling(false) }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>
  if (!order) return <div className="text-center py-20 text-gray-500">Order not found</div>

  const currentStepIdx = STATUS_STEPS.indexOf(order.status)
  const isCancellable = ['placed', 'confirmed'].includes(order.status) &&
    order.cancel_deadline && new Date() < new Date(order.cancel_deadline)

  return (
    <>
      <Helmet><title>Order #{order.order_number} - Damini</title></Helmet>
      <div className="max-w-4xl mx-auto px-3 md:px-4 py-5 space-y-4">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Order #{order.order_number}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isCancellable && (
              <button onClick={handleCancel} disabled={cancelling}
                className="flex items-center gap-1.5 border border-red-200 text-red-600 px-3 py-2 rounded text-sm font-semibold hover:bg-red-50 transition-colors">
                <XCircle className="h-4 w-4" /> {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
            {order.status === 'delivered' && (
              <button className="flex items-center gap-1.5 border border-gray-200 text-gray-700 px-3 py-2 rounded text-sm font-semibold hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4" /> Invoice
              </button>
            )}
          </div>
        </div>

        {/* Order Status Timeline */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-5">Order Status</h2>
            <div className="flex items-center">
              {STATUS_STEPS.map((status, i) => {
                const isDone = i <= currentStepIdx
                const isActive = i === currentStepIdx
                return (
                  <div key={status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isDone ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'} ${isActive ? 'ring-4 ring-green-100' : ''}`}>
                        {isDone ? <CheckCircle className="h-4 w-4 text-white" /> : <span className="w-2 h-2 bg-gray-300 rounded-full" />}
                      </div>
                      <p className={`text-[10px] font-medium mt-1.5 text-center capitalize ${isDone ? 'text-green-600' : 'text-gray-400'}`}>
                        {status.replace('_', ' ')}
                      </p>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${i < currentStepIdx ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Order Cancelled</p>
              {order.cancel_reason && <p className="text-red-600 text-sm">{order.cancel_reason}</p>}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map(item => (
              <div key={item.id} className="flex gap-4 items-start">
                <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/100`} alt="" className="w-20 h-20 object-contain bg-gray-50 rounded" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 text-sm">{item.product_name}</p>
                  {item.variant_name && <p className="text-xs text-gray-500">{item.variant_name}</p>}
                  <p className="text-xs text-gray-500 mt-0.5">Sold by {item.vendor_name}</p>
                  <p className="text-sm mt-1">Qty: {item.quantity} × ₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{parseFloat(item.total_price).toLocaleString('en-IN')}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${item.status === 'delivered' ? 'bg-green-100 text-green-700' : item.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {item.status}
                  </span>
                  {item.status === 'delivered' && (
                    <div className="mt-2">
                      <button className="text-xs text-[#2874F0] hover:underline flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" /> Return
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment & Delivery Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-[#2874F0]" /> Delivery Address</h3>
            <p className="text-sm font-semibold text-gray-800">{order.delivery_name}</p>
            <p className="text-sm text-gray-600">{order.line1}{order.line2 ? `, ${order.line2}` : ''}</p>
            <p className="text-sm text-gray-600">{order.city}, {order.state} - {order.pincode}</p>
            <p className="text-sm text-gray-500 mt-1">📞 {order.delivery_phone}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#2874F0]" /> Payment Summary</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{parseFloat(order.subtotal).toLocaleString('en-IN')}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>− ₹{parseFloat(order.discount).toLocaleString('en-IN')}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{parseFloat(order.shipping_charges) === 0 ? 'FREE' : `₹${parseFloat(order.shipping_charges)}`}</span></div>
              <hr className="border-gray-100" />
              <div className="flex justify-between font-bold"><span>Total</span><span>₹{parseFloat(order.total).toLocaleString('en-IN')}</span></div>
              <p className="text-gray-500 text-xs mt-1 capitalize">Payment: {order.payment_method} · Status: <span className={order.payment_status === 'paid' ? 'text-green-600' : 'text-orange-500'}>{order.payment_status}</span></p>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.shipment && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Truck className="h-4 w-4 text-[#2874F0]" /> Tracking Info</h3>
            <p className="text-sm text-gray-700">AWB: <span className="font-mono font-semibold">{order.shipment.awb_code}</span></p>
            <p className="text-sm text-gray-700">Courier: {order.shipment.courier_name}</p>
          </div>
        )}
      </div>
    </>
  )
}
