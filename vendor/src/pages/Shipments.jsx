import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Truck, CheckCircle, Search, Compass, RefreshCw } from 'lucide-react'

export default function Shipments() {
  const [pickup, setPickup] = useState('')
  const [delivery, setDelivery] = useState('')
  const [weight, setWeight] = useState('0.5')
  const [couriers, setCouriers] = useState([])
  const [checking, setChecking] = useState(false)

  // Fetch shipped orders to display active shipments
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-shipments'],
    queryFn: async () => {
      const res = await api.get('/orders/vendor?status=shipped')
      return res.data.data
    }
  })

  const orders = data?.orders || []

  const handleCheckServiceability = async (e) => {
    e.preventDefault()
    if (!pickup || !delivery) return
    setChecking(true)
    try {
      const res = await api.get(`/shipments/serviceability?pickupPincode=${pickup}&deliveryPincode=${delivery}&weight=${weight}`)
      setCouriers(res.data.data?.couriers || [])
    } catch (err) {
      setCouriers([])
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shipments & Logistics</h1>
        <p className="text-gray-500 text-sm">Check courier serviceability and track active shipments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Serviceability Checker */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Compass className="h-5 w-5 text-[#2874F0]" />
            <h3 className="font-bold text-gray-900 text-sm">Check Courier Serviceability</h3>
          </div>
          <form onSubmit={handleCheckServiceability} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Pickup Pincode *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 560001"
                value={pickup}
                onChange={e => setPickup(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Delivery Pincode *</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 110001"
                value={delivery}
                onChange={e => setDelivery(e.target.value.replace(/\D/g, ''))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={weight}
                onChange={e => setWeight(e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <button
              type="submit"
              disabled={checking}
              className="w-full bg-[#2874F0] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#1a5de0] transition-colors"
            >
              {checking ? 'Checking...' : 'Check Rates & Availability'}
            </button>
          </form>

          {/* Results */}
          {couriers.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-gray-50 max-h-60 overflow-y-auto">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Available Couriers</h4>
              {couriers.map((c, i) => (
                <div key={i} className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{c.courier_name}</p>
                    <p className="text-gray-400">Rating: {c.rating || 'N/A'}</p>
                  </div>
                  <p className="font-bold text-[#2874F0]">₹{c.rate || 'Check Label'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Shipments Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <h3 className="font-bold text-gray-900 text-sm">Active Shipments ({orders.length})</h3>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Spinner size="lg" /></div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={<Truck className="h-10 w-10 text-gray-400" />}
                title="No active shipments"
                description="Orders currently marked as shipped will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                      <th className="p-4">Order details</th>
                      <th className="p-4">Delivery Customer</th>
                      <th className="p-4">Tracking AWB</th>
                      <th className="p-4">Shipped Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <p className="font-bold text-gray-900">#{order.order_number}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{order.product_names || order.product_name}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{order.delivery_name || 'Customer'}</p>
                          <p className="text-xs text-gray-400">{order.delivery_phone}</p>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                            {order.awb_code || 'Self Ship'}
                          </span>
                          {order.courier_name && (
                            <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">{order.courier_name}</p>
                          )}
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
