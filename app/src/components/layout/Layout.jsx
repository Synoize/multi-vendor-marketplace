import { Outlet, NavLink, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import {
  Home,
  Search,
  ShoppingBag,
  ThumbsUp,
  CircleUser,
  ShoppingBasket,
} from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { useOrderStore } from "@/store/orderStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export default function Layout() {
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { isAuthenticated } = useAuthStore();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Fetch order count for badge (shared query key with Navbar)
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

  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: Home,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: ShoppingBasket,
      badge: orderCount,
    },
    {
      label: "Products",
      path: "/products",
      icon: ShoppingBag,
    },
    {
      label: "Wishlist",
      path: "/wishlist",
      icon: ThumbsUp,
      badge: wishlistCount,
    },
    {
      label: "Account",
      path: "/profile",
      icon: CircleUser,
    },
  ];

  const hideBottomNav =
    pathname === "/cart" ||
    pathname === "/checkout" ||
    (pathname.startsWith("/products/") && pathname !== "/products");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Outlet */}
      <main className="flex-1 pb-10 md:pb-0">
        <Outlet />
      </main>

      {/* Desktop Footer (hidden on mobile to feel like a native app) */}
      <div className={hideBottomNav ? "sm:mb-0" : "mb-16 sm:mb-0"}>
        <Footer />
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background shadow-[0_-3px_12px_rgba(0,0,0,0.06)] md:hidden flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-colors relative ${
                    isActive ? "text-primary" : "text-gray-500"
                  }`
                }
              >
                <div className="relative">
                  <Icon className="h-5 w-5" strokeWidth={1} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-accent px-1 text-[9px] font-bold leading-none text-white">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium mt-0.5 font-sans tracking-wide">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
