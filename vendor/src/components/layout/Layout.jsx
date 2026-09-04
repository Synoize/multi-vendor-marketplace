import React, { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  RotateCcw,
  Wallet,
  Truck,
  Megaphone,
  Settings,
  Headphones,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User,
  Store,
  CheckCheck,
  Trash2,
  RefreshCw,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import { useNotificationStore } from "../../store/notificationStore";
import ConfirmDialog from "../ui/ConfirmDialog";
import { assets } from "../../assets/assets";

const NAV_LINKS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
  { to: "/returns", label: "Returns", icon: RotateCcw },
  { to: "/payouts", label: "Payouts", icon: Wallet },
  { to: "/shipments", label: "Shipments", icon: Truck },
  { to: "/ads", label: "Ads & Campaigns", icon: Megaphone },
  { to: "/support", label: "Support", icon: Headphones },
  { to: "/settings", label: "Settings", icon: Settings },
];

const pageTitleMap = {
  "/": "Dashboard",
  "/products": "Products",
  "/products/add": "Add Product",
  "/orders": "Orders",
  "/returns": "Returns",
  "/payouts": "Payouts",
  "/shipments": "Shipments",
  "/ads": "Ads & Campaigns",
  "/ads/create": "Create Campaign",
  "/support": "Support",
  "/details": "My Details",
  "/settings": "Settings",
};

function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showLabels = !isDesktop || expanded;

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
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
    fixed top-0 left-0 h-full
    bg-white border-r border-secondary-300
    z-30
    flex flex-col
    overflow-hidden
    transition-[width,transform] duration-300 ease-in-out
    w-56
    ${expanded ? "lg:w-64" : "lg:w-20"}
    ${isOpen ? "translate-x-0" : "-translate-x-full"}
    lg:translate-x-0 lg:static lg:z-auto
  `}
      >
        {/* Logo */}
        <div
          className={`flex items-center py-2.5 border-b border-secondary-300 transition-all duration-300 ${
            showLabels ? "justify-between px-4" : "justify-center px-3"
          }`}
        >
          <div className="flex items-center overflow-hidden">
            <img
              src={assets.logoIcon}
              alt="Logo"
              className="h-11 flex-shrink-0 bg-primary rounded-lg px-2 py-2"
            />

            <div
              className={`
          overflow-hidden transition-all duration-300
          ${showLabels ? "w-36 opacity-100 ml-3" : "w-0 opacity-0 ml-0"}
        `}
            >
              <h2 className="text-sm font-semibold text-secondary-900 whitespace-nowrap">
                The Damini Edit
              </h2>

              <p className="text-[10px] text-secondary-700 whitespace-nowrap">
                Vendor Hub
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden text-secondary-400 hover:text-white"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/*  Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar">
          <ul className="space-y-1">
            {NAV_LINKS.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  title={label}
                  className={({ isActive }) => `
              group
              flex items-center
              rounded-xl
              px-3 py-2.5
              transition-all duration-300
              hover:translate-x-1 text-xs sm:text-sm font-thin

              ${showLabels ? "justify-start" : "justify-center"}

              ${
                isActive
                  ? "bg-primary text-white border border-white/10"
                  : "text-secondary-900 hover:bg-secondary hover:text-black"
              }
            `}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        size={18}
                        strokeWidth={1.5}
                        className={`
                    flex-shrink-0 transition-colors
                    ${
                      isActive
                        ? "text-white"
                        : "text-secondary-900 group-hover:text-black"
                    }
                  `}
                      />

                      <span
                        className={`
                    whitespace-nowrap overflow-hidden
                    transition-all duration-300 font-medium
                    ${showLabels ? "w-40 opacity-100 ml-3" : "w-0 opacity-0 ml-0"}
                  `}
                      >
                        {label}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="mt-auto border-t border-white/10 px-4 py-2.5">
          <button
            onClick={() => setLogoutConfirm(true)}
            title="Logout"
            className={`
      group
      relative
      flex items-center
      w-full
      px-3 py-2.5
      rounded-xl
      transition-all
      duration-300
      ease-in-out
      bg-primary
      ${showLabels ? "justify-start gap-3 px-3" : "justify-center"}
      hover:bg-opacity-90 text-white
    `}
          >
            {/* Icon */}

            <LogOut
              size={18}
              strokeWidth={1.5}
              className="group-hover:text-white "
            />

            {/* Label */}
            <span
              className={`
        overflow-hidden
        whitespace-nowrap
        text-xs sm:text-sm 
        transition-all
        duration-300
group-hover:text-white font-medium
        ${showLabels ? "max-w-[120px] opacity-100" : "max-w-0 opacity-0"}
      `}
            >
              Logout
            </span>
          </button>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={logoutConfirm}
        onClose={() => setLogoutConfirm(false)}
        onConfirm={() => { setLogoutConfirm(false); logout(); }}
        title="Logout"
        message="Are you sure you want to logout?"
        confirmLabel="Logout"
        variant="danger"
      />
    </>
  );
}

function Header({ onMenuClick }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const pageTitle =
    Object.entries(pageTitleMap)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => location.pathname === path)?.[1] ||
    (location.pathname.includes("/edit") ? "Edit Product" : "Vendor Panel");

  const loadUnreadCount = async () => {
    try {
      const count = await useNotificationStore.getState().fetchUnreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const list = await useNotificationStore.getState().fetchNotifications();
      setNotifications(list);
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
    if (notifOpen) {
      loadNotifications();
    }
  }, [notifOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await useNotificationStore.getState().markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      /* ignore */
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await useNotificationStore.getState().markRead(notification.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    setNotifOpen(false);
    if (notification.reference_type === "order") navigate("/orders");
    else if (notification.reference_type === "return") navigate("/returns");
    else if (
      notification.reference_type === "refund" ||
      notification.reference_type === "payout"
    )
      navigate("/payouts");
  };

  const handleDeleteNotification = async (id) => {
    try {
      await useNotificationStore.getState().deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      /* ignore */
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "V";

  return (
    <>
    <header className="h-16 bg-white border-b border-secondary-300 flex items-center justify-between px-3 sm:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden transition-colors">
          <Menu strokeWidth={1.5} className="w-6 h-6 text-secondary-900" />
        </button>
        <h1 className="sm:text-lg font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="relative w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary-300 transition-colors"
          >
            <Bell className="w-4.5 h-4.5 text-secondary-900" size={16} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full m-3 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-[#2874F0]" /> Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-semibold text-[#2874F0] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto scrollbar-thin">
                {loadingNotifs ? (
                  <div className="flex justify-center py-10">
                    <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10 px-4">
                    <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      No notifications yet
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !n.is_read ? "bg-blue-50/50" : ""
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#2874F0] mt-1.5 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(n.id);
                        }}
                        className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 flex justify-between items-center">
                <p className="text-[10px] text-gray-400">Refreshes every 30s</p>
                <button
                  onClick={loadNotifications}
                  className="text-xs font-semibold text-gray-500 hover:text-[#2874F0] flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2.5 hover:bg-secondary rounded-xl px-3 py-2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-secondary-950 leading-none">
                {user?.name || "Vendor"}
              </p>
              <p className="text-[9px] text-secondary-800 mt-0.5">Vendor</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-secondary-800 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full m-3 w-52 bg-white rounded-xl shadow-sm border py-1 z-50">
              <div className="px-4 py-2 border-b border-dashed">
                <p className="text-[13px] font-semibold text-secondary-950 truncate">
                  {user?.name || "Vendor"}
                </p>
                <p className="text-[11px] text-secondary-800 truncate">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/details");
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 font-medium text-xs text-secondary-950 hover:bg-secondary transition-colors border-b border-secondary-200"
              >
                <User strokeWidth={1.5} className="w-3.5 h-3.5" />
                Profile
              </button>
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 font-medium text-xs text-secondary-950 hover:bg-secondary transition-colors border-b border-secondary-200"
              >
                <Settings strokeWidth={1.5} className="w-3.5 h-3.5" />
                Settings
              </button>
              <button
                onClick={() => { setDropdownOpen(false); setLogoutConfirm(true); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 font-medium text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut strokeWidth={1.5} className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

    <ConfirmDialog
      isOpen={logoutConfirm}
      onClose={() => setLogoutConfirm(false)}
      onConfirm={() => { setLogoutConfirm(false); logout(); navigate("/login"); }}
      title="Logout"
      message="Are you sure you want to logout?"
      confirmLabel="Logout"
      variant="danger"
    />
    </>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-secondary overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="px-3 py-6 sm:p-8  ">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
