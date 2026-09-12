import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
  CheckCheck,
  Trash2,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/axios";
import { assets } from "../../assets/assets";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/campaigns/create", label: "Create Campaign", icon: Plus },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/docs", label: "Documentation", icon: BookOpen },
];

function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const notifRef = useRef(null);

  const { data: walletData } = useQuery({
    queryKey: ["ads-wallet"],
    queryFn: () => api.get("/users/me/wallet").then((r) => r.data.data),
  });

  const balance = walletData?.wallet?.balance ?? 0;

  const loadUnreadCount = async () => {
    try {
      const { data } = await api.get("/notifications/unread-count");
      setUnreadCount(data?.data?.count || 0);
    } catch {
      /* ignore */
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const { data } = await api.get("/notifications?limit=20");
      setNotifications(data?.data?.notifications || data?.notifications || []);
    } catch {
      /* ignore */
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const id = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (notifOpen) loadNotifications();
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await api.patch(`/notifications/${notification.id}/read`);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: 1 } : n,
          ),
        );
      } catch {
        /* ignore */
      }
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-3.5 border-b border-secondary-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center shadow-lg shadow-primary/25 flex-shrink-0">
            <img src={assets.logoIcon} alt="Damini" className="w-7 h-7 object-contain" />
          </div>
          <div>
            <p className="text-secondary-950 font-bold text-base leading-tight">
              The Damini Edit Ads
            </p>
            <p className="text-secondary-700 text-[10px] uppercase tracking-widest">
              Manager
            </p>
          </div>
        </div>
      </div>

      {/* Wallet balance pill */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-secondary border border-secondary-600 rounded-xl px-3 py-2.5">
          <Wallet className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-secondary-800 uppercase tracking-wide">
              Ad Balance
            </span>
            <span className="text-sm font-bold text-secondary-950">
              ₹
              {balance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <button
            onClick={() => navigate("/billing")}
            className="ml-auto text-[10px] bg-primary text-white px-2 py-0.5 rounded-md font-semibold hover:bg-primary-800 transition-colors"
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
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-secondary-900 hover:bg-secondary-200 hover:text-secondary-950"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-secondary-700"}`}
                />
                <span>{item.label}</span>
                {item.to === "/campaigns/create" && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Plus className="w-3 h-3 text-primary" />
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-secondary-300">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary-200 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || "V"}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium text-secondary-950 truncate">
              {user?.name || "Vendor"}
            </span>
            <span className="text-[11px] text-secondary-700 truncate">
              {user?.email || ""}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-secondary-700 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white border-r border-secondary-300">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-secondary-300 transform transition-transform duration-300 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-secondary-800 hover:text-secondary-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-secondary-300 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-secondary-800 hover:text-secondary-950 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src={assets.logo}
              alt="Damini Ads Manager"
              className="h-9 w-auto object-contain select-none"
            />
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-secondary-950">
                Damini Ads Manager
              </h1>
              <p className="text-xs text-secondary-700">
                Manage your ad campaigns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick balance display (desktop) */}
            <div className="hidden md:flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-1.5">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-secondary-950">
                ₹
                {balance.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative w-9 h-9 rounded-xl bg-secondary border border-secondary-300 flex items-center justify-center text-secondary-800 hover:text-primary hover:bg-secondary-200 transition-all"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 glass-card z-50 overflow-hidden shadow-2xl">
                  <div className="px-4 py-3 border-b border-secondary-300 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-secondary-950 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" /> Notifications
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {loadingNotifs ? (
                      <div className="flex justify-center py-10">
                        <RefreshCw className="w-5 h-5 text-secondary-700 animate-spin" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-10 px-4">
                        <Bell className="w-8 h-8 text-secondary-500 mx-auto mb-2" />
                        <p className="text-sm text-secondary-800">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`group flex items-start gap-3 px-4 py-3 border-b border-secondary-300 cursor-pointer hover:bg-secondary-100 transition-colors ${
                            !n.is_read ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-secondary-950">
                              {n.title}
                            </p>
                            <p className="text-xs text-secondary-800 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-secondary-700 mt-1">
                              {new Date(n.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNotification(n.id);
                            }}
                            className="p-1 rounded-md text-secondary-700 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-secondary-300 flex justify-between items-center">
                    <p className="text-[10px] text-secondary-700">
                      Refreshes every 30s
                    </p>
                    <button
                      onClick={loadNotifications}
                      className="text-xs font-semibold text-secondary-800 hover:text-primary flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-secondary border border-secondary-300 rounded-xl px-3 py-1.5 hover:bg-secondary-200 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {user?.name?.charAt(0)?.toUpperCase() || "V"}
                  </span>
                </div>
                <span className="text-sm text-secondary-950 hidden sm:block max-w-[120px] truncate">
                  {user?.storeName || user?.name || "Vendor"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-secondary-800" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 glass-card py-1 z-50 shadow-xl">
                  <div className="px-3 py-2 border-b border-secondary-300">
                    <p className="text-xs font-semibold text-secondary-950 truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-secondary-800 truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-secondary-900 hover:text-primary hover:bg-secondary-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
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

      <ConfirmDialog
        isOpen={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={() => {
          setLogoutConfirm(false);
          (async () => {
            await logout();
            navigate("/login");
          })();
        }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        variant="danger"
      />
    </div>
  );
}

export default Layout;
