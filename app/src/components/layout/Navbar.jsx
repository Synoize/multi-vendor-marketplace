import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ShoppingCart, Heart, Search, MapPin, User, Menu, X, ChevronDown, Bell, Package, LogOut, Settings, Store } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import api from '@/lib/axios'
import { useQuery } from '@tanstack/react-query'

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function Navbar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { count: cartCount } = useCartStore()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const searchRef = useRef(null)
  const debouncedSearch = useDebounce(searchQuery, 300)

  // Fetch search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ['search-suggestions', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return []
      const { data } = await api.get(`/products/search/suggestions?q=${encodeURIComponent(debouncedSearch)}`)
      return data.data || []
    },
    enabled: debouncedSearch.length >= 2,
  })

  // Fetch categories for mega menu
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data.data || []
    },
    staleTime: 10 * 60 * 1000,
  })

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
      setShowSuggestions(false)
    }
  }

  return (
    <>
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 bg-[#2874F0] shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-4 h-16">
            
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 group">
              <div className="flex flex-col leading-none">
                <span className="text-white font-bold text-2xl tracking-tight font-['Inter']">damini</span>
                <span className="text-[#FFE11B] text-[10px] font-medium italic tracking-wider -mt-0.5">
                  Explore <span className="text-white">Plus</span> ✦
                </span>
              </div>
            </Link>

            {/* Search Bar */}
            <div ref={searchRef} className="flex-1 max-w-2xl relative">
              <form onSubmit={handleSearch}>
                <div className="flex items-center bg-white rounded overflow-hidden shadow-sm">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true) }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search for products, brands and more"
                    className="flex-1 px-4 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  />
                  <button type="submit" className="bg-[#2874F0] hover:bg-[#1a5de0] px-5 py-2.5 text-white transition-colors">
                    <Search className="h-5 w-5" />
                  </button>
                </div>
              </form>

              {/* Search Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-lg overflow-hidden z-50 border border-gray-100">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { navigate(`/products/${item.slug}`); setShowSuggestions(false); setSearchQuery('') }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                    >
                      {item.primary_image && (
                        <img src={item.primary_image} alt={item.name} className="w-8 h-8 object-contain rounded" />
                      )}
                      <div>
                        <p className="text-sm text-gray-800 font-medium line-clamp-1">{item.name}</p>
                        <p className="text-xs text-[#2874F0] font-semibold">₹{item.price?.toLocaleString('en-IN')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              
              {/* Login/User */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 text-white hover:text-[#FFE11B] px-3 py-2 rounded transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#FB641B] flex items-center justify-center text-xs font-bold uppercase">
                      {user?.name?.[0] || 'U'}
                    </div>
                    <span className="text-sm font-medium hidden md:block max-w-[80px] truncate">{user?.name?.split(' ')[0]}</span>
                    <ChevronDown className="h-3 w-3 hidden md:block" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white shadow-2xl rounded-lg overflow-hidden border border-gray-100 z-50">
                      <div className="bg-[#2874F0] px-4 py-3">
                        <p className="text-white font-semibold text-sm truncate">{user?.name}</p>
                        <p className="text-blue-200 text-xs truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        {[
                          { to: '/profile', icon: <User className="h-4 w-4" />, label: 'My Profile' },
                          { to: '/orders', icon: <Package className="h-4 w-4" />, label: 'My Orders' },
                          { to: '/wishlist', icon: <Heart className="h-4 w-4" />, label: 'Wishlist' },
                          { to: '/seller-register', icon: <Store className="h-4 w-4" />, label: 'Sell on Damini' },
                          { to: '/support', icon: <Settings className="h-4 w-4" />, label: 'Help & Support' },
                        ].map(({ to, icon, label }) => (
                          <Link key={to} to={to} onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <span className="text-gray-400">{icon}</span> {label}
                          </Link>
                        ))}
                        <hr className="my-1 border-gray-100" />
                        <button onClick={() => { logout(); setShowUserMenu(false) }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-white hover:text-[#FFE11B] px-3 py-2 text-sm font-medium transition-colors">Login</Link>
                  <Link to="/signup" className="bg-white text-[#2874F0] hover:bg-[#FFE11B] hover:text-[#2874F0] px-4 py-1.5 rounded text-sm font-bold transition-colors">
                    Sign Up
                  </Link>
                </div>
              )}

              {/* Wishlist */}
              <Link to="/wishlist" className="relative text-white hover:text-[#FFE11B] p-2 rounded transition-colors hidden md:flex">
                <Heart className="h-5 w-5" />
              </Link>

              {/* Cart */}
              <Link to="/cart" className="relative text-white hover:text-[#FFE11B] p-2 rounded transition-colors">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#FB641B] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Sell */}
              <Link to="/seller-register" className="text-white hover:text-[#FFE11B] px-3 py-2 text-sm font-medium transition-colors hidden lg:block whitespace-nowrap">
                Sell
              </Link>

              {/* Mobile menu */}
              <button className="text-white p-2 md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Category Bar */}
        <div className="bg-[#1a65d6] hidden md:block">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="flex items-center gap-1.5 text-white text-xs font-medium px-3 py-2.5 hover:text-[#FFE11B] whitespace-nowrap transition-colors"
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#2874F0] px-4 py-6">
              {isAuthenticated ? (
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#FB641B] flex items-center justify-center text-white text-lg font-bold mb-2">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <p className="text-white font-semibold">{user?.name}</p>
                  <p className="text-blue-200 text-sm">{user?.email}</p>
                </div>
              ) : (
                <div>
                  <p className="text-white font-semibold text-lg mb-3">Welcome!</p>
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="bg-white text-[#2874F0] font-bold px-6 py-2 rounded text-sm block text-center">
                    Login / Sign Up
                  </Link>
                </div>
              )}
            </div>

            <nav className="py-2">
              {[
                { to: '/', label: '🏠 Home' },
                { to: '/products', label: '🛍️ All Products' },
                { to: '/cart', label: `🛒 Cart (${cartCount})` },
                { to: '/wishlist', label: '❤️ Wishlist' },
                { to: '/orders', label: '📦 My Orders' },
                { to: '/profile', label: '👤 Profile' },
                { to: '/seller-register', label: '🏪 Sell on Damini' },
                { to: '/support', label: '🎧 Support' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                  className="block px-5 py-3.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50">
                  {label}
                </Link>
              ))}
              {isAuthenticated && (
                <button onClick={() => { logout(); setMobileOpen(false) }}
                  className="block w-full text-left px-5 py-3.5 text-sm text-red-600 hover:bg-red-50">
                  🚪 Logout
                </button>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
