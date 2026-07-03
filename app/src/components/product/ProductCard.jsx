import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import { useState } from 'react'
import api from '@/lib/axios'

function RatingStars({ rating, size = 'sm' }) {
  const stars = Math.round(rating * 2) / 2
  const cls = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${cls} ${s <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
      ))}
    </div>
  )
}

export default function ProductCard({ product, onWishlistChange }) {
  const { isAuthenticated } = useAuthStore()
  const { addItem } = useCartStore()
  const [isWishlisted, setIsWishlisted] = useState(product.isWishlisted || false)
  const [addingToCart, setAddingToCart] = useState(false)

  const discountPercent = product.mrp && product.price < product.mrp
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : null

  const handleAddToCart = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) { toast.error('Please login to add to cart'); return }
    setAddingToCart(true)
    try {
      await addItem(product.id, null, 1)
      toast.success('Added to cart!')
    } catch { toast.error('Failed to add to cart') }
    finally { setAddingToCart(false) }
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) { toast.error('Please login to save to wishlist'); return }
    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`)
        setIsWishlisted(false)
        toast.success('Removed from wishlist')
      } else {
        await api.post('/wishlist', { productId: product.id })
        setIsWishlisted(true)
        toast.success('Added to wishlist!')
      }
      onWishlistChange?.()
    } catch { toast.error('Failed to update wishlist') }
  }

  return (
    <Link to={`/products/${product.slug}`}
      className="group bg-white rounded-sm border border-gray-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-all duration-300 overflow-hidden flex flex-col relative">
      
      {/* Discount Badge */}
      {discountPercent >= 5 && (
        <div className="absolute top-2 left-2 z-10 bg-[#2874F0] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {discountPercent}% off
        </div>
      )}

      {/* Sponsored Badge */}
      {product.isSponsored && (
        <div className="absolute top-2 right-2 z-10 bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-sm">
          Sponsored
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute top-2 right-2 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
        aria-label="Toggle wishlist"
      >
        <Heart className={`h-4 w-4 ${isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
      </button>

      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-gray-50 flex items-center justify-center">
        <img
          src={product.primary_image || `https://picsum.photos/seed/${product.id}/300/300`}
          alt={product.name}
          className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-1 leading-tight">{product.name}</p>
        
        {/* Brand */}
        {product.brand_name && (
          <p className="text-xs text-gray-400 mb-1">{product.brand_name}</p>
        )}

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1 bg-green-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
              {parseFloat(product.rating).toFixed(1)} <Star className="h-2.5 w-2.5 fill-white" />
            </div>
            {product.total_reviews && (
              <span className="text-gray-400 text-[11px]">({product.total_reviews?.toLocaleString('en-IN')})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-gray-900 font-bold text-base">₹{parseFloat(product.price).toLocaleString('en-IN')}</span>
          {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
            <span className="text-gray-400 text-xs line-through">₹{parseFloat(product.mrp).toLocaleString('en-IN')}</span>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          {product.is_cod_available && (
            <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">COD</span>
          )}
          {product.is_featured && (
            <span className="text-[10px] text-[#2874F0] bg-blue-50 px-1.5 py-0.5 rounded font-medium">✦ Assured</span>
          )}
        </div>

        {/* Add to Cart */}
        <button
          onClick={handleAddToCart}
          disabled={addingToCart}
          className="mt-auto w-full bg-[#FF9F00] hover:bg-[#f59b00] disabled:opacity-60 text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {addingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  )
}
