import React, { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  RotateCcw,
  Wallet,
  Truck,
  Megaphone,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  Store,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/returns', label: 'Returns', icon: RotateCcw },
  { to: '/payouts', label: 'Payouts', icon: Wallet },
  { to: '/shipments', label: 'Shipments', icon: Truck },
  { to: '/ads', label: 'Ads & Campaigns', icon: Megaphone },
  { to: '/settings', label: 'Settings', icon: Settings },
]

const pageTitleMap = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/products/add': 'Add Product',
  '/orders': 'Orders',
  '/returns': 'Returns',
  '/payouts': 'Payouts',
  '/shipments': 'Shipments',
  '/ads': 'Ads & Campaigns',
  '/ads/create': 'Create Campaign',
  '/settings': 'Settings',
}

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1e293b] z-30 flex flex-col transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2874F0] flex items-center justify-center font-bold text-white text-lg">
              D
            </div>
            <div>
              <span className="text-white font-bold text-lg tracking-tight">Damini</span>
              <p className="text-slate-400 text-xs -mt-0.5">Vendor Panel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor store info */}
        <div className="px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
            <div className="w-8 h-8 rounded-lg bg-[#2874F0]/20 flex items-center justify-center flex-shrink-0">
              <Store className="w-4 h-4 text-[#2874F0]" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">
                {user?.store_name || user?.storeName || 'My Store'}
              </p>
              <p className="text-slate-400 text-xs truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold px-3 mb-2">
            Main Menu
          </p>
          <ul className="space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
                    ${
                      isActive
                        ? 'bg-[#2874F0] text-white shadow-lg shadow-blue-900/30'
                        : 'text-slate-400 hover:bg-slate-700/60 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                        size={18}
                      />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-slate-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 group"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 transition-colors" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

function Header({ onMenuClick, notificationCount = 0 }) {
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const pageTitle =
    Object.entries(pageTitleMap)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => location.pathname === path)?.[1] ||
    (location.pathname.includes('/edit') ? 'Edit Product' : 'Vendor Panel')

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'V'

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <button className="relative w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <Bell className="w-4.5 h-4.5 text-gray-600" size={18} />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </button>

        {/* User Avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 hover:bg-gray-100 rounded-xl px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#2874F0] flex items-center justify-center text-white text-sm font-bold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-none">
                {user?.name || 'Vendor'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Vendor</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Vendor'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  navigate('/settings')
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <User className="w-4 h-4" />
                Profile & Settings
              </button>
              <div className="border-t border-gray-100 mt-1" />
              <button
                onClick={() => useAuthStore.getState().logout()}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          notificationCount={0}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
