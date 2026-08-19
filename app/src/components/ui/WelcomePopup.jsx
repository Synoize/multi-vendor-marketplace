import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, Heart, Package, User } from 'lucide-react'

export default function WelcomePopup({ user, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(onDismiss, 300)
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'

  const quickLinks = [
    { to: '/profile', label: 'My Profile', icon: User },
    { to: '/orders', label: 'My Orders', icon: Package },
    { to: '/wishlist', label: 'Wishlist', icon: Heart },
    { to: '/products', label: 'Start Shopping', icon: ShoppingBag },
  ]

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/60" onClick={handleDismiss} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-300 ${visible ? 'scale-100' : 'scale-90'}`}>
        <button onClick={handleDismiss} className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors z-10">
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 pt-8 pb-10 text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mx-auto flex items-center justify-center mb-3 shadow-lg ring-2 ring-white/30">
            <span className="text-white font-bold text-xl">{initials}</span>
          </div>
          <h2 className="text-white text-xl font-bold">Welcome, {user?.name?.split(' ')[0] || 'Guest'}!</h2>
          <p className="text-blue-200 text-sm mt-1">We're thrilled to have you on Damini.</p>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-sm text-center">Start exploring and enjoy a seamless shopping experience.</p>

          <div className="grid grid-cols-2 gap-2">
            {quickLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={handleDismiss}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-sm font-medium text-gray-700 hover:text-primary-600">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <button onClick={handleDismiss}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm">
            Start Shopping
          </button>
        </div>
      </div>
    </div>
  )
}
