import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, Minus, Tag, ShoppingBag, ArrowRight, Heart, RotateCcw } from 'lucide-react'
import api from '@/lib/axios'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'

export default function Cart() {
  const navigate = useNavigate()
  const { fetchCart } = useCartStore()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const { data: cart, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data } = await api.get('/cart')
      return data.data
    },
  })

  const updateQty = async (itemId, quantity) => {
    try {
      await api.put(`/cart/${itemId}`, { quantity })
      refetch(); fetchCart()
    } catch { toast.error('Failed to update quantity') }
  }

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`)
      toast.success('Item removed from cart')
      refetch(); fetchCart()
    } catch { toast.error('Failed to remove item') }
  }

  const saveForLater = async (itemId) => {
    try {
      await api.post(`/cart/${itemId}/save-for-later`)
      toast.success('Saved for later')
      refetch(); fetchCart()
    } catch { toast.error('Failed to save for later') }
  }

  const moveToCart = async (itemId) => {
    try {
      await api.post(`/cart/${itemId}/move-to-cart`)
      toast.success('Moved to cart')
      refetch(); fetchCart()
    } catch { toast.error('Failed to move to cart') }
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, cartTotal: cart?.total || 0 })
      setAppliedCoupon({ code: couponCode, discount: data.data?.discount || 0 })
      toast.success(`Coupon applied! Saved ₹${data.data?.discount}`)
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid coupon code') }
    finally { setCouponLoading(false) }
  }

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>

  const items = cart?.items || []
  const savedItems = cart?.savedForLater || []
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const discount = appliedCoupon?.discount || 0
  const shipping = subtotal >= 499 ? 0 : 40
  const total = subtotal - discount + shipping

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <>
        <Helmet><title>Shopping Cart - Damini</title></Helmet>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="bg-white rounded-2xl shadow-sm p-12">
            <ShoppingBag className="h-20 w-20 text-gray-200 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty!</h2>
            <p className="text-gray-500 mb-8">Add items to your cart and shop the best deals</p>
            <Link to="/products" className="bg-[#2874F0] hover:bg-[#1a5de0] text-white font-bold px-8 py-3.5 rounded-full text-sm transition-colors inline-flex items-center gap-2">
              Start Shopping <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Helmet><title>Shopping Cart ({items.length} items) - Damini</title></Helmet>
      <div className="max-w-6xl mx-auto px-3 md:px-4 py-5">
        <div className="flex flex-col lg:flex-row gap-5">
          {/* Cart Items */}
          <div className="flex-1 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 flex gap-4">
                <Link to={`/products/${item.product_slug || item.product_id}`} className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded overflow-hidden">
                  <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/200`} alt={item.product_name}
                    className="w-full h-full object-contain" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.product_slug || item.product_id}`} className="text-sm font-medium text-gray-800 hover:text-[#2874F0] line-clamp-2">
                    {item.product_name}
                  </Link>
                  {item.variant_name && <p className="text-xs text-gray-500 mt-0.5">{item.variant_name}</p>}
                  <p className="text-[#2874F0] text-xs mt-1">{item.vendor_name || 'Damini Store'}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-bold text-gray-900">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</span>
                    {item.mrp && item.mrp > item.unit_price && (
                      <span className="text-gray-400 line-through text-xs">₹{parseFloat(item.mrp).toLocaleString('en-IN')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {/* Quantity */}
                    <div className="flex items-center gap-2 border border-gray-200 rounded">
                      <button onClick={() => item.quantity > 1 ? updateQty(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button onClick={() => saveForLater(item.id)} className="text-xs text-[#2874F0] hover:underline flex items-center gap-1">
                      <Heart className="h-3 w-3" /> Save for later
                    </button>
                    <button onClick={() => removeItem(item.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{(parseFloat(item.unit_price) * item.quantity).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}

            {/* Coupon */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-4 w-4 text-[#2874F0]" />
                <h3 className="font-semibold text-sm text-gray-800">Have a coupon?</h3>
              </div>
              <div className="flex gap-2">
                <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code" disabled={!!appliedCoupon}
                  className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm uppercase font-mono outline-none focus:border-[#2874F0]" />
                {appliedCoupon ? (
                  <button onClick={() => { setAppliedCoupon(null); setCouponCode('') }}
                    className="px-4 py-2 border border-red-200 text-red-500 rounded text-sm font-semibold hover:bg-red-50 transition-colors">
                    Remove
                  </button>
                ) : (
                  <button onClick={applyCoupon} disabled={couponLoading}
                    className="px-4 py-2 bg-[#2874F0] text-white rounded text-sm font-semibold hover:bg-[#1a5de0] transition-colors disabled:opacity-60">
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {appliedCoupon && (
                <p className="mt-2 text-green-600 text-xs font-medium">✓ Coupon "{appliedCoupon.code}" applied — Saved ₹{appliedCoupon.discount}</p>
              )}
            </div>

            {/* Saved for Later */}
            {savedItems.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-bold text-gray-800 mb-3">Saved for Later ({savedItems.length})</h3>
                <div className="space-y-3">
                  {savedItems.map(item => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <img src={item.product_image || `https://picsum.photos/seed/${item.product_id}/100`} alt="" className="w-16 h-16 object-contain bg-gray-50 rounded" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.product_name}</p>
                        <p className="font-bold text-gray-900 text-sm">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => moveToCart(item.id)} className="text-xs text-[#2874F0] border border-[#2874F0] px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                          Move to Cart
                        </button>
                        <button onClick={() => removeItem(item.id)} className="text-xs text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price Summary */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-5 sticky top-20">
              <h3 className="font-bold text-gray-500 text-xs uppercase tracking-widest mb-4">Price Details</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Price ({items.length} items)</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>− ₹{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Charges</span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">FREE</span>
                  ) : (
                    <span>₹{shipping}</span>
                  )}
                </div>
                <hr className="border-gray-100" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total Amount</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {discount > 0 && (
                  <p className="text-green-600 text-xs font-medium">You will save ₹{discount.toLocaleString('en-IN')} on this order 🎉</p>
                )}
              </div>
              <button onClick={() => navigate('/checkout')}
                className="mt-5 w-full bg-[#FB641B] hover:bg-[#e55a18] text-white font-bold py-3.5 rounded text-sm transition-colors flex items-center justify-center gap-2">
                Place Order <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                <span>🔒</span> Safe and Secure Payments
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
