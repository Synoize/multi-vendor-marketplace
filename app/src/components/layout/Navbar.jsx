import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  Home,
  Heart,
  Search,
  MapPin,
  User,
  Menu,
  X,
  ChevronDown,
  Info,
  Phone,
  FileText,
  ShieldCheck,
  Bell,
  LogOut,
  Settings,
  Store,
  ShoppingBag,
  Headphones,
  ThumbsUp,
  ShoppingBasket,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useProductStore } from "@/store/productStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useOrderStore } from "@/store/orderStore";
import { useQuery } from "@tanstack/react-query";
import { assets } from "../../assets/assets";

// Custom debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Navbar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { count: cartCount } = useCartStore();
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || "",
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const searchRef = useRef(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch search suggestions
  const { data: suggestions = [] } = useQuery({
    queryKey: ["search-suggestions", debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const { fetchSearchSuggestions } = useProductStore.getState();
      return await fetchSearchSuggestions(debouncedSearch);
    },
    enabled: debouncedSearch.length >= 2,
  });

  // Fetch categories for mega menu
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { fetchCategories } = useProductStore.getState();
      return await fetchCategories();
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch wishlist count for badge
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      const { fetchWishlist } = useWishlistStore.getState();
      return await fetchWishlist();
    },
    enabled: isAuthenticated,
  });

  const wishlistCount = wishlist.length;

  // Fetch order count for badge
  const { data: orderData } = useQuery({
    queryKey: ["order-count"],
    queryFn: async () => {
      if (!isAuthenticated) return { total: 0 };
      return await useOrderStore.getState().fetchOrders("?limit=1");
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  const orderCount = orderData?.total || 0;

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const placeholders = [
    "Search for products",
    "Search for watches",
    "Search for shoes",
    "Search for fashion",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  return (
    <>
      {/* Main Navbar */}
      <header className="sticky top-0 z-50 w-full shadow-sm">
        {/* Top Header */}
        <div className="max-w-[1920px] mx-auto px-2 md:px-8 lg:px-12 bg-primary">
          <div className="flex items-center justify-between h-14 md:h-16 gap-2 md:gap-8">
            {/* Left Section */}
            <div className="flex items-center gap-1.5 md:gap-8 flex-1 min-w-0">
              {/* Mobile Menu */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden text-white p-1 rounded-md hover:bg-white/10 transition"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              {/* Logo */}
              <Link to="/" className="shrink-0 select-none flex gap-0.5">
                <img
                  src={assets.logoIcon}
                  alt="Damini Logo"
                  className="h-8 md:h-11 "
                />
                <div className="leading-none">
                  <h1 className="text-white font-medium text-sm md:text-lg tracking-tight">
                    The Damini Edit<sup className="ml-0.5">™</sup>
                  </h1>
                  <p className="text-[9px] md:text-[11px] italic text-accent">
                    Explore <span className="text-white">Plus</span> ✦
                  </p>
                </div>
              </Link>

              {/* Desktop Search */}
              <div
                ref={searchRef}
                className="hidden md:flex flex-1 max-w-2xl relative"
              >
                <form onSubmit={handleSearch} className="w-full">
                  <div className="flex items-center bg-white rounded-xl overflow-hidden shadow-sm">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      placeholder={placeholders[placeholderIndex]}
                      className="w-full pl-4 py-2.5 text-sm text-secondary-950 outline-none"
                    />

                    <button
                      type="submit"
                      className="px-4 text-secondary-700 hover:text-secondary-800 transition"
                    >
                      <Search strokeWidth={1.5} className="h-5 w-5" />
                    </button>
                  </div>
                </form>

                {/* Suggestions */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 overflow-y-auto rounded bg-white shadow-sm animate-in fade-in slide-in-from-top-2 duration-200 max-h-[62vh] scrollbar-thin">
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/products/${item.slug}`);
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition border-b last:border-b-0 border-secondary-200"
                      >
                        {item.primary_image && (
                          <img
                            src={item.primary_image}
                            alt={item.name}
                            className="w-10 h-10 object-contain rounded"
                          />
                        )}

                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm truncate">{item.name}</p>
                          <p className="text-xs text-green-600 font-medium">
                            ₹{item.price?.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`flex items-center gap-4 md:gap-8 ${isAuthenticated && "flex-row-reverse md:flex-row"}`}
            >
              {/* User */}
              {isAuthenticated ? (
                <div
                  className="relative"
                  onMouseEnter={() => setShowUserMenu(true)}
                  onMouseLeave={() => setShowUserMenu(false)}
                >
                  <button className="flex items-center gap-2 text-white rounded-md transition">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium uppercase">
                      {user?.name?.[0] || "U"}
                    </div>

                    <span className="hidden lg:block text-sm font-medium  truncate">
                      {user?.name?.split(" ")[0]}
                    </span>

                    <ChevronDown className="hidden lg:block h-4 w-4" />
                  </button>

                  {/* Hover Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-48 bg-white shadow-sm rounded-md py-1 border border-gray-100 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b bg-gray-50/50">
                        <p className="text-[10px] text-secondary-700 uppercase">
                          Logged in as
                        </p>
                        <p className="text-xs font-medium text-secondary-950 truncate ">
                          {user?.name}
                        </p>
                      </div>
                      {[
                        { to: "/profile", label: "My Profile" },
                        { to: "/orders", label: "My Orders" },
                        { to: "/wishlist", label: "Wishlist" },
                        { to: "/support", label: "Help & Support" },
                      ].map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setShowUserMenu(false)}
                          className="block px-4 py-2.5 text-xs font-medium text-secondary-900 hover:bg-secondary-200 transition"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => {
                          logout().then(() => navigate("/login"));
                          setShowUserMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/signup"
                  className="bg-white text-secondary-950 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-accent transition"
                >
                  Signup
                </Link>
              )}

              {/* Seller */}
              <Link
                to="/seller-register"
                className="hidden md:block text-white text-sm font-medium transition whitespace-nowrap"
              >
                Become a Seller
              </Link>

              <div className="relative hidden md:block group">
                <button className="flex items-center gap-1 text-sm font-medium text-white whitespace-nowrap">
                  More
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-hover:rotate-180" />
                </button>

                <div className="absolute right-0 top-full mt-3 w-48 overflow-hidden rounded-md border border-gray-100 bg-white py-1 shadow-sm z-50 opacity-0 invisible -translate-y-2 transition-all duration-150 ease-out group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {[
                    { to: "/about", label: "About Us", icon: Info },
                    { to: "/contact", label: "Contact Us", icon: Phone },
                    {
                      to: "/terms",
                      label: "Terms & Conditions",
                      icon: FileText,
                    },
                    {
                      to: "/privacy",
                      label: "Privacy Policy",
                      icon: ShieldCheck,
                    },
                    {
                      to: "/seller-register",
                      label: "Become a Seller",
                      icon: Store,
                    },
                  ].map(({ to, label, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-secondary-900 hover:bg-secondary-200 transition"
                    >
                      <Icon strokeWidth={1.5} className="h-4 w-4" />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Right Section */}
              {isAuthenticated && (
                <div className="flex items-center gap-2">
                  {/* Wishlist */}
                  <Link
                    to="/wishlist"
                    className="relative hidden md:flex text-white p-2 rounded-md transition"
                  >
                    <ThumbsUp className="h-5 w-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                        {wishlistCount > 9 ? "9+" : wishlistCount}
                      </span>
                    )}
                  </Link>

                  {/* Cart */}
                  <Link
                    to="/cart"
                    className="relative flex items-center gap-2 text-white p-2 rounded-md transition"
                  >
                    <ShoppingCart className="h-5 w-5" />

                    <span className="hidden sm:block text-sm font-medium">
                      Cart
                    </span>

                    {cartCount > 0 && (
                      <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                        {cartCount > 9 ? "9+" : cartCount}
                      </span>
                    )}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Search */}
          <div ref={searchRef} className="md:hidden pb-3">
            <form onSubmit={handleSearch} className="w-full">
              <div className="flex items-center bg-white rounded-xl overflow-hidden shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={placeholders[placeholderIndex]}
                  className="w-full pl-4 py-2.5 text-sm text-secondary-950 outline-none"
                />

                <button
                  type="submit"
                  className="px-3 text-secondary-700 hover:text-secondary-800 transition"
                >
                  <Search className="h-5 w-5" />
                </button>
              </div>
            </form>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white overflow-y-auto shadow-sm rounded-b-lg z-50 overflow-hidden border animate-in fade-in slide-in-from-top-2 duration-200 max-h-[60vh] scrollbar-thin">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(`/products/${item.slug}`);
                      setShowSuggestions(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-gray-50 transition"
                  >
                    {item.primary_image && (
                      <img
                        src={item.primary_image}
                        alt={item.name}
                        className="w-10 h-10 object-contain rounded"
                      />
                    )}

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-green-600 font-medium">
                        ₹{item.price?.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Bar */}
        <div
          className="hidden md:block relative"
          onMouseLeave={() => setMegaOpen(false)}
        >
          <div className="bg-secondary-100">
            <div className="max-w-[1920px] mx-auto px-5 md:px-8">
              <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide whitespace-nowrap">
                {categories.slice(0, 10).map((cat) => (
                  <div
                    key={cat.id}
                    onMouseEnter={() => {
                      setActiveCat(cat);
                      setMegaOpen(true);
                    }}
                    className={`group flex items-center gap-3 rounded-lg py-2 transition-colors duration-150 cursor-default`}
                  >
                    <Link
                      to={`/products?category=${cat.slug}`}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-secondary-200 group-hover:border-secondary-400"
                    >
                      <img
                        src={cat.icon || cat.image}
                        alt={cat.name}
                        className="h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110"
                      />
                    </Link>

                    <span className="flex-1 truncate text-sm font-thin">
                      {cat.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mega menu — rendered outside the scroll container so it isn't clipped */}
          {activeCat && (
            <div
              className={`absolute left-0 right-0 top-full z-50 transition-all duration-200 ease-out ${
                megaOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-2.5 pointer-events-none"
              }`}
            >
              <div className="max-w-[1920px] mx-auto px-6 md:px-10">
                <div className="bg-secondary-100 rounded-b-2xl border border-t-0 border-secondary-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center gap-3 border-b border-secondary-200 pb-3 mb-3">
                      {activeCat.icon && (
                        <img
                          src={activeCat.icon || activeCat.image}
                          alt={activeCat.name}
                          className="h-12 w-12 object-contain"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font--medium">
                          {activeCat.name}
                        </h3>
                        <p className="text-xs text-secondary-800">
                          {(activeCat.children?.length || 0) > 0
                            ? `${activeCat.children.length} subcategories`
                            : "All products"}
                        </p>
                      </div>
                      <Link
                        to={`/products?category=${activeCat.slug}`}
                        className=" self-start text-sm text-primary hover:underline transition-colors"
                      >
                        View all products
                      </Link>
                    </div>

                    {activeCat.children?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-2.5">
                        {activeCat.children.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/products?category=${sub.slug}`}
                            className="flex items-center gap-3 rounded-lg bg-white px-4 py-2 transition-colors duration-400 hover:bg-secondary-200"
                          >
                            {(sub.image || sub.icon) && (
                              <img
                                src={sub.image || sub.icon}
                                alt=""
                                className="h-12 w-12 shrink-0 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <span className="truncate text-sm text-secondary-950">
                              {sub.name}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Link
                        to={`/products?category=${activeCat.slug}`}
                        className="text-sm text-secondary-800 hover:text-primary transition-colors"
                      >
                        Browse all {activeCat.name} products
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[999] md:hidden transition-all duration-300 ${
          mobileOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col transition-transform duration-300 ease-in-out ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-primary px-4 py-6">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </div>

                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-secondary text-xs truncate">
                    {user?.email || "No email"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-white font-semibold text-lg mb-3">
                  Welcome!
                </p>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center rounded bg-white px-6 py-2 text-sm font-semibold text-secondary-800"
                >
                  Login / Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto py-2">
            {[
              { to: "/", label: "Home", icon: Home },
              { to: "/products", label: "All Products", icon: ShoppingBag },

              // Protected Routes
              {
                to: "/cart",
                label: "Cart",
                icon: ShoppingCart,
                protected: true,
              },
              {
                to: "/wishlist",
                label: "Wishlist",
                icon: ThumbsUp,
                protected: true,
              },
              {
                to: "/orders",
                label: "My Orders",
                icon: ShoppingBasket,
                protected: true,
              },
              {
                to: "/profile",
                label: "Profile",
                icon: User,
                protected: true,
              },

              // Public Routes
              { to: "/seller-register", label: "Sell on Damini", icon: Store },
              { to: "/support", label: "Support", icon: Headphones },
              { to: "/about", label: "About", icon: Info },
            ]
              .filter((item) => !item.protected || isAuthenticated)
              .map(({ to, label, icon: Icon }) => {
                const count =
                  to === "/cart"
                    ? cartCount
                    : to === "/wishlist"
                      ? wishlistCount
                      : to === "/orders"
                        ? orderCount
                        : 0;

                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-secondary-950 hover:bg-secondary hover:text-primary transition-colors"
                  >
                    <div className="relative">
                      <Icon className="h-5 w-5" strokeWidth={1.5} />

                      {count > 0 && (
                        <span className="absolute -top-2 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                    </div>

                    <span>{label}</span>
                  </Link>
                );
              })}
          </nav>

          {/* Logout */}
          {isAuthenticated && (
            <button
              onClick={() => {
                logout().then(() => navigate("/login"));
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 border-t px-5 py-6 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
