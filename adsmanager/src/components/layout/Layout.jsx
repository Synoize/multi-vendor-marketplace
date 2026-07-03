import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  Plus,
  CreditCard,
  Settings,
  LogOut,
  Bell,
  Wallet,
  Menu,
  X,
  ChevronDown,
  Zap,
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/axios'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/campaigns/create', label: 'Create Campaign', icon: Plus },
  { to: '/billing', label: 'Billing', icon: CreditCard },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: walletData } = useQuery({
    queryKey: ['ads-wallet'],
    queryFn: () => api.get('/ads/wallet').then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })

  const balance = walletData?.balance ?? 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FB641B] to-[#e04f09] flex items-center justify-center shadow-lg shadow-orange-500/25 flex-shrink-0">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">Damini Ads</p>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest">Manager</p>
          </div>
        </div>
      </div>

      {/* Wallet balance pill */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 bg-[#FB641B]/10 border border-[#FB641B]/20 rounded-xl px-3 py-2.5">
          <Wallet className="w-4 h-4 text-[#FB641B] flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">Ad Balance</span>
            <span className="text-sm font-bold text-white">
              ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="ml-auto text-[10px] bg-[#FB641B] text-white px-2 py-0.5 rounded-md font-semibold hover:bg-[#e04f09] transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#FB641B]' : ''}`}
                  style={isActive ? { color: '#FB641B' } : undefined}
                />
                <span>{item.label}</span>
                {item.to === '/campaigns/create' && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-[#FB641B]/20 border border-[#FB641B]/30 flex items-center justify-center">
                    <Plus className="w-3 h-3 text-[#FB641B]" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FB641B]/40 to-[#2874F0]/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'V'}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-white truncate">{user?.name || 'Vendor'}</span>
            <span className="text-[11px] text-gray-500 truncate">{user?.email || ''}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#080B12] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[#0d1424] border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0d1424] border-r border-white/5 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-white/5 bg-[#080B12] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-white">Damini Ads Manager</h1>
              <p className="text-xs text-gray-500">Manage your ad campaigns</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick balance display (desktop) */}
            <div className="hidden md:flex items-center gap-2 bg-[#FB641B]/10 border border-[#FB641B]/20 rounded-xl px-3 py-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#FB641B]" />
              <span className="text-xs font-semibold text-white">
                ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Notifications */}
            <button className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FB641B]" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 hover:bg-white/10 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FB641B]/60 to-[#2874F0]/60 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || 'V'}
                  </span>
                </div>
                <span className="text-sm text-white hidden sm:block max-w-[120px] truncate">
                  {user?.storeName || user?.name || 'Vendor'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-card py-1 z-50 shadow-2xl">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/settings'); setProfileOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
