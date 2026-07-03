import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, Plus, CreditCard, Wallet, Truck, Check, ChevronRight } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'
import Spinner from '@/components/ui/Spinner'

const STEPS = ['Delivery Address', 'Order Summary', 'Payment']

export default function Checkout() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [placing, setPlacing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddress, setNewAddress] = useState({ name: '', phone: '', line1: '', city: '', state: '', pincode: '' })

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get('/users/me/addresses'); return data.data || [] },
  })

  const { data: cart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => { const { data } = await api.get('/cart'); return data.data },
  })

  const handleAddAddress = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users/me/addresses', { ...newAddress, is_default: addresses.length === 0 })
      toast.success('Address added')
      setShowAddForm(false)
      refetchAddresses()
    } catch { toast.error('Failed to add address') }
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) { toast.error('Please select a delivery address'); return }
    if (!cart?.items?.length) { toast.error('Your cart is empty'); return }

    setPlacing(true)
    try {
      const items = cart.items.map(i => ({ productId: i.product_id, variantId: i.variant_id, quantity: i.quantity }))
      const { data } = await api.post('/orders', { addressId: selectedAddress.id, items, paymentMethod, notes: '' })

      if (paymentMethod === 'cod') {
        toast.success('Order placed successfully!')
        navigate(`/orders/${data.data.orderId}`)
      } else {
        // Razorpay flow
        const { data: paymentData } = await api.post('/payments/create-order', { orderId: data.data.orderId })
        const rzp = new window.Razorpay({
          key: paymentData.data.key,
          amount: paymentData.data.amount,
          currency: 'INR',
          name: 'Damini Marketplace',
          description: `Order #${paymentData.data.orderNumber}`,
          order_id: paymentData.data.razorpayOrderId,
          handler: async (response) => {
            await api.post('/payments/verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              orderId: data.data.orderId,
            })
            toast.success('Payment successful! Order placed.')
            navigate(`/orders/${data.data.orderId}`)
          },
          prefill: { name: selectedAddress.name, contact: selectedAddress.phone },
          theme: { color: '#2874F0' },
        })
        rzp.open()
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  const subtotal = cart?.items?.reduce((s, i) => s + i.unit_price * i.quantity, 0) || 0
  const shipping = subtotal >= 499 ? 0 : 40
  const total = subtotal + shipping

  return (
    <>
      <Helmet><title>Checkout - Damini</title></Helmet>
      {/* Add Razorpay script */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />

      <div className="max-w-5xl mx-auto px-3 md:px-4 py-5">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 ${i <= step ? 'text-[#2874F0]' : 'text-gray-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? 'bg-green-500 border-green-500 text-white' : i === step ? 'border-[#2874F0] text-[#2874F0]' : 'border-gray-300'}`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="text-sm font-medium hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-12 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: Steps */}
          <div className="lg:col-span-3 space-y-4">
            {/* Step 0: Address */}
            {step === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#2874F0]" /> Select Delivery Address
                </h2>
                <div className="space-y-3">
                  {addresses.map(addr => (
                    <label key={addr.id} className={`flex gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedAddress?.id === addr.id ? 'border-[#2874F0] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" checked={selectedAddress?.id === addr.id} onChange={() => setSelectedAddress(addr)} className="accent-[#2874F0] mt-1 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{addr.name} <span className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded ml-1">{addr.type}</span></p>
                        <p className="text-sm text-gray-600 mt-0.5">{addr.line1}{addr.line2 && `, ${addr.line2}`}</p>
                        <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Mobile: {addr.phone}</p>
                      </div>
                    </label>
                  ))}

                  {/* Add New Address */}
                  {showAddForm ? (
                    <form onSubmit={handleAddAddress} className="border-2 border-dashed border-[#2874F0] rounded-lg p-4 space-y-3">
                      <h3 className="font-semibold text-sm text-gray-800">Add New Address</h3>
                      {['name', 'phone', 'line1', 'city', 'state', 'pincode'].map(field => (
                        <input key={field} required placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                          value={newAddress[field]} onChange={e => setNewAddress(a => ({ ...a, [field]: e.target.value }))}
                          className="w-full border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-[#2874F0]" />
                      ))}
                      <div className="flex gap-2">
                        <button type="submit" className="bg-[#2874F0] text-white px-4 py-2 rounded text-sm font-semibold">Save</button>
                        <button type="button" onClick={() => setShowAddForm(false)} className="border border-gray-200 px-4 py-2 rounded text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 text-[#2874F0] font-semibold text-sm p-3 border-2 border-dashed border-blue-200 rounded-lg w-full hover:bg-blue-50 transition-colors">
                      <Plus className="h-4 w-4" /> Add New Address
                    </button>
                  )}
                </div>
                <button disabled={!selectedAddress} onClick={() => setStep(1)}
                  className="mt-4 bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-50 text-white font-bold px-8 py-3 rounded transition-colors text-sm">
                  Deliver Here →
                </button>
              </div>
            )}

            {/* Step 1: Order Summary */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 mb-4">
                  {cart?.items?.map(item => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/80`} alt="" className="w-14 h-14 object-contain bg-gray-50 rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product_name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-sm">₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-green-500" />
                  Delivering to: {selectedAddress?.line1}, {selectedAddress?.city}
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setStep(0)} className="border border-gray-200 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-50">← Back</button>
                  <button onClick={() => setStep(2)} className="bg-[#FB641B] hover:bg-[#e55a18] text-white font-bold px-8 py-2.5 rounded text-sm transition-colors">
                    Continue to Payment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#2874F0]" /> Payment Options
                </h2>
                <div className="space-y-3">
                  {[
                    { value: 'cod', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when your order arrives' },
                    { value: 'razorpay', label: 'Online Payment', icon: '💳', desc: 'Cards, UPI, Netbanking, Wallets' },
                  ].map(opt => (
                    <label key={opt.value} className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${paymentMethod === opt.value ? 'border-[#2874F0] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input type="radio" checked={paymentMethod === opt.value} onChange={() => setPaymentMethod(opt.value)} className="accent-[#2874F0] mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{opt.icon} {opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 mt-5">
                  <button onClick={() => setStep(1)} className="border border-gray-200 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-50">← Back</button>
                  <button onClick={handlePlaceOrder} disabled={placing}
                    className="flex-1 bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded text-sm transition-colors">
                    {placing ? '⏳ Placing Order...' : `✓ Place Order — ₹${total.toLocaleString('en-IN')}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-20">
              <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-4">Price Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">Items ({cart?.items?.length || 0})</span><span>₹{subtotal.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Delivery</span><span className={shipping === 0 ? 'text-green-600 font-medium' : ''}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                <hr className="border-gray-100" />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total.toLocaleString('en-IN')}</span></div>
              </div>
              {selectedAddress && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Delivering To</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAddress.name}</p>
                  <p className="text-xs text-gray-500">{selectedAddress.line1}, {selectedAddress.city} - {selectedAddress.pincode}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
