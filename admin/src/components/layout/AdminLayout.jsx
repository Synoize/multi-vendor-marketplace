import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  ShoppingCart,
  Tag,
  Image,
  Video,
  Megaphone,
  Wallet,
  BarChart3,
  HeadphonesIcon,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  Shield,
  AlertCircle,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import api from '../../lib/axios';

const navSections = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Vendors', path: '/vendors', icon: Store, pendingKey: 'pending_vendors' },
      { label: 'Products', path: '/products', icon: Package, pendingKey: 'pending_products' },
      { label: 'Users', path: '/users', icon: Users },
      { label: 'Orders', path: '/orders', icon: ShoppingCart },
      { label: 'Coupons', path: '/coupons', icon: Tag },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payouts', path: '/payouts', icon: Wallet },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Banners', path: '/banners', icon: Image },
      { label: 'Videos', path: '/videos', icon: Video },
      { label: 'Ads', path: '/ads', icon: Megaphone },
    ],
  },
  {
    label: 'Support & Config',
    items: [
      { label: 'Support', path: '/support', icon: HeadphonesIcon },
      { label: 'Settings', path: '/settings', icon: Settings },
    ],
  },
];

function getBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [{ label: 'Admin', path: '/' }];
  let current = '';
  segments.forEach((seg) => {
    current += `/${seg}`;
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    crumbs.push({ label, path: current });
  });
  return crumbs;
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch pending counts for badges
  const { data: pendingData } = useQuery({
    queryKey: ['admin-pending-counts'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard/pending-counts');
      return res.data?.data || res.data || {};
    },
    refetchInterval: 60000,
    retry: false,
  });

  const breadcrumbs = getBreadcrumbs(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setProfileOpen(false);
      setNotifOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className={`flex items-center gap-3 p-5 border-b border-white/5 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white">Damini Admin</h1>
            <p className="text-xs text-gray-500">Control Panel</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-2 px-2">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const pendingCount = item.pendingKey ? (pendingData?.[item.pendingKey] || 0) : 0;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'} ${collapsed ? 'justify-center' : ''}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon className="w-4 h-4" />
                      {pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
                          {pendingCount > 9 ? '9+' : pendingCount}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.label}</span>
                        {pendingCount > 0 && (
                          <span className="bg-red-500/20 text-red-400 text-xs px-1.5 py-0.5 rounded-full font-semibold border border-red-500/20">
                            {pendingCount}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className={`p-3 border-t border-white/5`}>
        <div className={`flex items-center gap-3 p-2 rounded-xl ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-600/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-500/30">
            <span className="text-xs font-bold text-blue-300">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#080B12] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-[#0f172a] border-r border-white/5 transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 bottom-20 translate-x-full -mr-3 w-6 h-6 bg-[#1e293b] border border-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors duration-200 z-10"
          style={{ left: collapsed ? '52px' : '228px', transition: 'left 0.3s ease' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0f172a] border-r border-white/5 z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[#0f172a] border-b border-white/5 flex items-center gap-4 px-4 flex-shrink-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.path} className="flex items-center gap-1.5 min-w-0">
                {idx > 0 && <span className="text-gray-600">/</span>}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-white font-medium truncate">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-gray-400 hover:text-white transition-colors truncate"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Global Search */}
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 w-56 hover:border-blue-500/30 transition-colors">
            <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full"
            />
          </div>

          {/* Notifications */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
              className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <Bell className="w-5 h-5" />
              {(pendingData?.total_pending || 0) > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-72 glass-card border border-white/10 z-50 shadow-2xl">
                <div className="p-3 border-b border-white/10">
                  <h4 className="text-sm font-semibold text-white">Notifications</h4>
                </div>
                <div className="p-4">
                  {(pendingData?.pending_vendors || 0) > 0 && (
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => { navigate('/vendors'); setNotifOpen(false); }}>
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">{pendingData.pending_vendors} vendors awaiting KYC approval</p>
                        <p className="text-xs text-gray-500 mt-0.5">Review now</p>
                      </div>
                    </div>
                  )}
                  {(pendingData?.pending_products || 0) > 0 && (
                    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => { navigate('/products'); setNotifOpen(false); }}>
                      <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-white">{pendingData.pending_products} products awaiting approval</p>
                        <p className="text-xs text-gray-500 mt-0.5">Review now</p>
                      </div>
                    </div>
                  )}
                  {!pendingData?.pending_vendors && !pendingData?.pending_products && (
                    <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Avatar Dropdown */}
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="w-7 h-7 bg-blue-600/30 rounded-full flex items-center justify-center border border-blue-500/30">
                <span className="text-xs font-bold text-blue-300">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <span className="hidden sm:block text-sm text-gray-300 font-medium max-w-[100px] truncate">
                {user?.name || 'Admin'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-48 glass-card border border-white/10 z-50 shadow-2xl py-1">
                <div className="px-3 py-2 border-b border-white/10">
                  <p className="text-xs font-semibold text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { navigate('/settings'); setProfileOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
