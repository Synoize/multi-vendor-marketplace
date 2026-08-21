import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Store,
  Package,
  FolderTree,
  BadgeCheck,
  Users,
  ShoppingCart,
  Tag,
  Gift,
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
  Menu,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import api from "../../lib/axios";
import ConfirmDialog from "../ui/ConfirmDialog";
import { assets } from "../../assets/assets";

const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Vendors",
        path: "/vendors",
        icon: Store,
        pendingKey: "pending_vendors",
      },
      {
        label: "Products",
        path: "/products",
        icon: Package,
        pendingKey: "pending_products",
      },
      { label: "Categories", path: "/categories", icon: FolderTree },
      { label: "Brands", path: "/brands", icon: BadgeCheck },
      { label: "Users", path: "/users", icon: Users },
      { label: "Orders", path: "/orders", icon: ShoppingCart },
      { label: "Coupons", path: "/coupons", icon: Tag },
      { label: "Offers", path: "/offers", icon: Gift },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Payouts", path: "/payouts", icon: Wallet },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Banners", path: "/banners", icon: Image },
      { label: "Festival Sales", path: "/festival-sales", icon: Gift },
      { label: "Videos", path: "/videos", icon: Video },
      { label: "Ads", path: "/ads", icon: Megaphone },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Support", path: "/support", icon: HeadphonesIcon },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

function getBreadcrumbs(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [{ label: "Admin", path: "/" }];
  let current = "";
  segments.forEach((seg) => {
    current += `/${seg}`;
    const label = seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
    crumbs.push({ label, path: current });
  });
  return crumbs;
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: pendingData } = useQuery({
    queryKey: ["admin-pending-counts"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard/pending-counts");
      return res.data?.data || res.data || {};
    },
    refetchInterval: 60000,
    retry: false,
  });

  const breadcrumbs = getBreadcrumbs(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => {
      setProfileOpen(false);
      setNotifOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center gap-3 px-5 py-5 ${collapsed ? "justify-center px-3" : ""}`}
      >
        <img
          src={assets.logo}
          alt="The Damini Edit"
          className="w-9 h-9 rounded-xl object-contain"
        />
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight">
              The Damini Edit
            </h1>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
              Admin Panel
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const pendingCount = item.pendingKey
                  ? pendingData?.[item.pendingKey] || 0
                  : 0;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({ isActive: active }) =>
                      `group flex items-center gap-3 h-10 px-3 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                        active
                          ? "bg-primary-50 text-primary shadow-sm"
                          : "text-secondary-900 hover:bg-secondary hover:text-secondary-950"
                      } ${collapsed ? "justify-center px-0 w-10 mx-auto" : ""}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="relative flex-shrink-0">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                      {collapsed && pendingCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center border-2 border-white">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      )}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {pendingCount > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold flex items-center justify-center">
                            {pendingCount > 99 ? "99+" : pendingCount}
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

      <div className="p-3 border-t border-gray-100">
        <div
          className={`flex items-center gap-3 p-2 rounded-xl ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {user?.email || ""}
                </p>
              </div>
              <button
                onClick={() => setLogoutConfirm(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute bottom-24 translate-x-full -mr-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-md transition-all duration-200 z-10 shadow-sm"
          style={{
            left: collapsed ? "52px" : "228px",
            transition: "left 0.3s ease",
          }}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 lg:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center gap-4 px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <div
                key={crumb.path}
                className="flex items-center gap-1.5 min-w-0"
              >
                {idx > 0 && <span className="text-gray-300">/</span>}
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-gray-900 font-semibold truncate">
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => navigate(crumb.path)}
                    className="text-gray-400 hover:text-gray-600 transition-colors truncate"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-secondary border rounded-xl px-3 py-2 w-56 transition-colors focus-within:border-secondary-600 focus-within:bg-white">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-900 outline-none w-full placeholder-gray-400"
            />
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-all"
            >
              <Bell strokeWidth={1.5} className="w-5 h-5" />
              {(pendingData?.total_pending || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 bg-white top-12 w-72 border border-gray-200 rounded-2xl z-50 shadow-xl shadow-gray-200/50">
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-900">
                    Notifications
                  </h4>
                </div>
                <div className="p-2">
                  {(pendingData?.pending_vendors || 0) > 0 && (
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        navigate("/vendors");
                        setNotifOpen(false);
                      }}
                    >
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertCircle
                          strokeWidth={1.5}
                          className="w-4 h-4 text-amber-500"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {pendingData.pending_vendors} vendors awaiting KYC
                          approval
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Review now
                        </p>
                      </div>
                    </div>
                  )}
                  {(pendingData?.pending_products || 0) > 0 && (
                    <div
                      className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        navigate("/products");
                        setNotifOpen(false);
                      }}
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertCircle
                          strokeWidth={1.5}
                          className="w-4 h-4 text-blue-500"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {pendingData.pending_products} products awaiting
                          approval
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Review now
                        </p>
                      </div>
                    </div>
                  )}
                  {!pendingData?.pending_vendors &&
                    !pendingData?.pending_products && (
                      <p className="text-xs text-gray-400 text-center py-6">
                        No new notifications
                      </p>
                    )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-all"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <span className="hidden sm:block text-sm text-gray-700 font-medium max-w-[100px] truncate">
                {user?.name || "Admin"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 z-50 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setProfileOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                >
                  <Settings className="w-4 h-4" /> Settings
                </button>
                <button
                  onClick={() => {
                    setLogoutConfirm(true);
                    setProfileOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-secondary">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        isOpen={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={() => {
          setLogoutConfirm(false);
          logout();
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        variant="danger"
      />
    </div>
  );
}
