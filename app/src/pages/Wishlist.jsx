import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react'
import api from '@/lib/axios'
import { useCartStore } from '@/store/cartStore'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export default function Wishlist() {
  const { addItem } = useCartStore()
  const { data: wishlist = [], isLoading, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => { const { data } = await api.get('/wishlist'); return data.data?.items || [] },
  })

  const removeItem = async (productId) => {
    try { await api.delete(`/wishlist/${productId}`); refetch(); toast.success('Removed from wishlist') }
    catch { toast.error('Failed to remove') }
  }

  const moveToCart = async (productId) => {
    try { await addItem(productId, null, 1); toast.success('Moved to cart!') }
    catch { toast.error('Failed to add to cart') }
  }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 border-2 border-[#2874F0] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <>
      <Helmet><title>My Wishlist - Damini</title></Helmet>
      <div className="max-w-5xl mx-auto px-3 md:px-4 py-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500 fill-red-500" /> My Wishlist ({wishlist.length})
        </h1>
        {wishlist.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-16 text-center">
            <Heart className="h-16 w-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 mb-6">Save items you love and shop them anytime</p>
            <Link to="/products" className="bg-[#2874F0] text-white font-bold px-6 py-2.5 rounded text-sm">Explore Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {wishlist.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm overflow-hidden group relative">
                <button onClick={() => removeItem(item.product_id)} className="absolute top-2 right-2 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <Link to={`/products/${item.product_slug || item.product_id}`}>
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                    <img src={item.primary_image || `https://picsum.photos/seed/${item.product_id}/300`} alt={item.product_name}
                      className="max-w-full max-h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 mb-1">{item.product_name}</p>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-bold text-gray-900">₹{parseFloat(item.price).toLocaleString('en-IN')}</span>
                      {item.mrp && item.mrp > item.price && <span className="text-gray-400 text-xs line-through">₹{parseFloat(item.mrp).toLocaleString('en-IN')}</span>}
                    </div>
                  </div>
                </Link>
                <button onClick={() => moveToCart(item.product_id)}
                  className="w-full bg-[#FF9F00] hover:bg-[#f59b00] text-white text-xs font-bold py-2 flex items-center justify-center gap-1.5 transition-colors">
                  <ShoppingCart className="h-3.5 w-3.5" /> Move to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
