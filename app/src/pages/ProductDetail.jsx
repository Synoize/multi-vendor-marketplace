import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Heart, Star, Shield, Truck, RotateCcw, ChevronRight, Minus, Plus, MapPin, CheckCircle, Share2 } from 'lucide-react'
import api from '@/lib/axios'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import ProductCard from '@/components/product/ProductCard'
import { SkeletonCard } from '@/components/ui/SkeletonCard'
import { toast } from 'sonner'

function RatingBar({ stars, percent }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-4 text-right">{stars}★</span>
      <div className="flex-1 bg-gray-100 rounded h-2">
        <div className="bg-green-500 h-2 rounded" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-gray-500 w-8">{percent}%</span>
    </div>
  )
}

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [pincode, setPincode] = useState('')
  const [pincodechk, setPincodechk] = useState(null)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [adding, setAdding] = useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await api.get(`/products/${slug}`)
      return data.data
    },
  })

  const { data: related = [] } = useQuery({
    queryKey: ['related', product?.id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${product.id}/related`)
      return data.data || []
    },
    enabled: !!product?.id,
  })

  const { data: reviewData } = useQuery({
    queryKey: ['reviews', product?.id],
    queryFn: async () => {
      const { data } = await api.get(`/reviews/${product.id}?limit=5`)
      return data.data
    },
    enabled: !!product?.id,
  })

  const handleAddToCart = async () => {
    if (!isAuthenticated) { toast.error('Please login to add to cart'); navigate('/login'); return }
    setAdding(true)
    try {
      await addItem(product.id, selectedVariant?.id || null, quantity)
      toast.success('Added to cart!')
    } catch { toast.error('Failed to add to cart') }
    finally { setAdding(false) }
  }

  const handleBuyNow = async () => {
    if (!isAuthenticated) { navigate('/login'); return }
    await handleAddToCart()
    navigate('/checkout')
  }

  const handleWishlist = async () => {
    if (!isAuthenticated) { toast.error('Please login first'); return }
    try {
      if (isWishlisted) { await api.delete(`/wishlist/${product.id}`); setIsWishlisted(false) }
      else { await api.post('/wishlist', { productId: product.id }); setIsWishlisted(true) }
    } catch { toast.error('Failed to update wishlist') }
  }

  const checkPincode = () => {
    if (!pincode.match(/^\d{6}$/)) { toast.error('Enter a valid 6-digit pincode'); return }
    setPincodechk({ deliverable: true, days: 3 })
  }

  const currentPrice = selectedVariant?.price ?? product?.price
  const currentMrp = selectedVariant?.mrp ?? product?.mrp
  const discount = currentMrp && currentPrice < currentMrp ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100) : null
  const images = product?.images || []
  const activeImageUrl = images[activeImage]?.url || product?.primary_image || `https://picsum.photos/seed/${slug}/600/600`

  if (isLoading) return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />)}
        </div>
      </div>
    </div>
  )

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <p className="text-4xl mb-4">😕</p>
      <h2 className="text-2xl font-bold text-gray-800">Product not found</h2>
    </div>
  )

  return (
    <>
      <Helmet>
        <title>{product.name} - Damini Marketplace</title>
        <meta name="description" content={product.seo_description || product.short_description || product.description?.slice(0, 155)} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
          <a href="/" className="hover:text-[#2874F0]">Home</a>
          <ChevronRight className="h-3 w-3" />
          {product.category_name && <><a href={`/products?category=${product.category_slug}`} className="hover:text-[#2874F0]">{product.category_name}</a><ChevronRight className="h-3 w-3" /></>}
          <span className="text-gray-700 line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Image Gallery */}
          <div className="md:col-span-1 lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-20">
              {/* Main Image */}
              <div className="aspect-square mb-3 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                <img src={activeImageUrl} alt={product.name}
                  className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-300"
                  style={{ maxHeight: '400px' }} />
              </div>
              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-14 h-14 border-2 rounded overflow-hidden ${activeImage === i ? 'border-[#2874F0]' : 'border-gray-200'}`}>
                      <img src={img.url} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              {/* Share */}
              <button className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#2874F0] transition-colors">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>

          {/* Product Info */}
          <div className="md:col-span-1 lg:col-span-2 bg-white rounded-lg shadow-sm p-5">
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2 leading-tight">{product.name}</h1>

            {/* Brand & Rating */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {product.brand_name && (
                <span className="text-sm text-gray-500">by <span className="text-[#2874F0] font-medium">{product.brand_name}</span></span>
              )}
              {product.rating && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    {parseFloat(product.rating).toFixed(1)} <Star className="h-3 w-3 fill-white" />
                  </div>
                  <span className="text-gray-500 text-xs">({product.total_reviews?.toLocaleString('en-IN')} reviews)</span>
                </div>
              )}
            </div>

            <hr className="mb-4" />

            {/* Price */}
            <div className="mb-4">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">₹{parseFloat(currentPrice).toLocaleString('en-IN')}</span>
                {currentMrp && parseFloat(currentMrp) > parseFloat(currentPrice) && (
                  <>
                    <span className="text-gray-400 line-through text-lg">₹{parseFloat(currentMrp).toLocaleString('en-IN')}</span>
                    <span className="text-green-600 font-bold text-lg">{discount}% off</span>
                  </>
                )}
              </div>
              <p className="text-green-600 text-sm mt-1">Inclusive of all taxes</p>
            </div>

            {/* Offers */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h3 className="font-semibold text-sm text-gray-800 mb-2">🏷️ Available Offers</h3>
              <ul className="space-y-1.5 text-xs text-gray-700">
                <li className="flex gap-2"><span className="text-[#2874F0] font-bold">Bank Offer</span> 10% off on HDFC Bank Credit Cards</li>
                <li className="flex gap-2"><span className="text-[#2874F0] font-bold">No Cost EMI</span> Starting from ₹{Math.round(currentPrice / 12).toLocaleString('en-IN')}/month</li>
                {product.is_cod_available && <li className="flex gap-2"><CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" /> Cash on Delivery available</li>}
              </ul>
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-2">Available Options</h3>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      disabled={!v.stock}
                      className={`px-3 py-1.5 text-xs border-2 rounded transition-all ${selectedVariant?.id === v.id ? 'border-[#2874F0] text-[#2874F0] bg-blue-50 font-semibold' : 'border-gray-200 text-gray-700 hover:border-[#2874F0]'} ${!v.stock ? 'opacity-40 cursor-not-allowed' : ''}`}>
                      {v.name} {v.price && `- ₹${parseFloat(v.price).toLocaleString('en-IN')}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-sm font-semibold text-gray-800">Quantity:</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(10, quantity + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {product.stock < 10 && product.stock > 0 && (
                <span className="text-red-500 text-xs font-medium">Only {product.stock} left!</span>
              )}
            </div>

            {/* CTAs */}
            <div className="flex gap-3 mb-5">
              <button onClick={handleAddToCart} disabled={adding || !product.stock}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF9F00] hover:bg-[#f59b00] disabled:opacity-60 text-white font-bold py-3.5 rounded transition-colors text-sm">
                <ShoppingCart className="h-4 w-4" /> {adding ? 'Adding...' : 'Add to Cart'}
              </button>
              <button onClick={handleBuyNow} disabled={!product.stock}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded transition-colors text-sm">
                ⚡ Buy Now
              </button>
            </div>

            <button onClick={handleWishlist}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-500 transition-colors">
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`} />
              {isWishlisted ? 'Saved to Wishlist' : 'Save to Wishlist'}
            </button>

            {/* Delivery Check */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-[#2874F0]" />
                <span className="text-sm font-semibold text-gray-800">Check Delivery</span>
              </div>
              <div className="flex gap-2">
                <input value={pincode} onChange={e => setPincode(e.target.value.slice(0, 6))}
                  placeholder="Enter 6-digit pincode"
                  className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm outline-none focus:border-[#2874F0]" />
                <button onClick={checkPincode} className="text-[#2874F0] font-bold text-sm px-3 border border-[#2874F0] rounded hover:bg-blue-50 transition-colors">
                  Check
                </button>
              </div>
              {pincodechk && (
                <p className={`mt-2 text-xs font-medium flex items-center gap-1 ${pincodechk.deliverable ? 'text-green-600' : 'text-red-500'}`}>
                  {pincodechk.deliverable ? <><CheckCircle className="h-3.5 w-3.5" /> Delivery in {pincodechk.days} days</> : '❌ Not deliverable to this pincode'}
                </p>
              )}
            </div>
          </div>

          {/* Seller & Policy Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Seller Info */}
            {product.store_name && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Sold by</h3>
                <p className="text-[#2874F0] font-semibold text-sm">{product.store_name}</p>
                {product.vendor_rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                      {parseFloat(product.vendor_rating).toFixed(1)} ★
                    </span>
                    <span className="text-gray-400 text-xs">Seller Rating</span>
                  </div>
                )}
              </div>
            )}

            {/* Policy */}
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <Truck className="h-4 w-4 text-[#2874F0] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Free Delivery</p>
                  <p className="text-xs text-gray-500">On orders above ₹499</p>
                </div>
              </div>
              {product.is_returnable && (
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{product.return_window}-day Returns</p>
                    <p className="text-xs text-gray-500">{product.return_type?.replace('_', ' ')}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">100% Authentic</p>
                  <p className="text-xs text-gray-500">All products verified</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {product.short_description && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-2">About this product</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.short_description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Specifications & Reviews */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Description */}
          {product.description && (
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="font-bold text-lg text-gray-900 mb-3">Product Description</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Ratings & Reviews</h2>
            {reviewData ? (
              <div className="flex gap-6 mb-5">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">{parseFloat(reviewData.stats?.avg_rating || 0).toFixed(1)}</div>
                  <div className="text-yellow-400 text-lg">{'★'.repeat(Math.round(reviewData.stats?.avg_rating || 0))}</div>
                  <div className="text-gray-400 text-xs mt-1">{reviewData.total?.toLocaleString('en-IN')} ratings</div>
                </div>
                <div className="flex-1 space-y-1">
                  {[5,4,3,2,1].map(s => {
                    const count = reviewData.stats?.[`${['','one','two','three','four','five'][s]}_star`] || 0
                    const pct = reviewData.total ? Math.round((count / reviewData.total) * 100) : 0
                    return <RatingBar key={s} stars={s} percent={pct} />
                  })}
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
            )}

            {reviewData?.reviews?.map((r) => (
              <div key={r.id} className="border-t border-gray-50 pt-3 mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">{r.rating}★</div>
                  <span className="text-sm font-semibold text-gray-800">{r.title}</span>
                  {r.is_verified && <span className="text-[#2874F0] text-xs font-medium">✓ Verified Purchase</span>}
                </div>
                <p className="text-sm text-gray-600">{r.comment}</p>
                <p className="text-xs text-gray-400 mt-1">{r.reviewer_name} · {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-5">
            <h2 className="font-bold text-lg text-gray-900 mb-4">Similar Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
