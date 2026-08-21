import { lazy, Suspense, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Layout from "@/components/layout/Layout";
import Spinner from "@/components/ui/Spinner";
import SplashScreen from "@/components/ui/SplashScreen";
import { useEffect } from "react";

// Lazy-loaded pages
const Home = lazy(() => import("@/pages/Home"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Cart = lazy(() => import("@/pages/Cart"));
const Wishlist = lazy(() => import("@/pages/Wishlist"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Orders = lazy(() => import("@/pages/Orders"));
const OrderDetail = lazy(() => import("@/pages/OrderDetail"));
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const Profile = lazy(() => import("@/pages/Profile"));

const SellerRegister = lazy(() => import("@/pages/SellerRegister"));
const VendorStore = lazy(() => import("@/pages/VendorStore"));
const Support = lazy(() => import("@/pages/Support"));
const Legal = lazy(() => import("@/pages/Legal"));
const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Careers = lazy(() => import("@/pages/Careers"));
const Payments = lazy(() => import("@/pages/Payments"));
const Shipping = lazy(() => import("@/pages/Shipping"));
const CancellationReturns = lazy(() => import("@/pages/CancellationReturns"));
const Faq = lazy(() => import("@/pages/Faq"));
const Security = lazy(() => import("@/pages/Security"));
const Sitemap = lazy(() => import("@/pages/Sitemap"));
const Advertise = lazy(() => import("@/pages/Advertise"));
const NotFound = lazy(() => import("@/pages/NotFound"));

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (!isAuthenticated && isLoading) return <Spinner />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public-only Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to="/" replace />;
};

import { useCartStore } from "@/store/cartStore";

export default function App() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const { fetchCart } = useCartStore();
  const [splash, setSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated]);

  // Track when page finishes loading
  useEffect(() => {
    if (document.readyState === "complete") {
      setPageLoaded(true);
    } else {
      const onLoad = () => setPageLoaded(true);
      window.addEventListener("load", onLoad);
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  // Minimum 2s timer
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fade only when both page loaded AND min 2s passed
  useEffect(() => {
    if (pageLoaded && minTimePassed) {
      setSplashFading(true);
    }
  }, [pageLoaded, minTimePassed]);

  // Lock body scroll while splash is visible so no scrollbar shows behind it
  useEffect(() => {
    if (splash) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }
  }, [splash]);

  useEffect(() => {
    if (splashFading) {
      const hideTimer = setTimeout(() => setSplash(false), 500);
      return () => clearTimeout(hideTimer);
    }
  }, [splashFading]);

  return (
    <>
      {splash && <SplashScreen fading={splashFading} />}
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          {/* Public routes with main layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:slug" element={<ProductDetail />} />
            <Route path="/seller-register" element={<SellerRegister />} />
            <Route path="/store/:vendorId" element={<VendorStore />} />
            <Route path="/support" element={<Support />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route
              path="/cancellation-returns"
              element={<CancellationReturns />}
            />
            <Route path="/faq" element={<Faq />} />
            <Route path="/security" element={<Security />} />
            <Route path="/sitemap" element={<Sitemap />} />
            <Route path="/advertise" element={<Advertise />} />

            {/* Protected customer routes */}
            <Route
              path="/cart"
              element={
                <ProtectedRoute>
                  <Cart />
                </ProtectedRoute>
              }
            />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-success/:id"
              element={
                <ProtectedRoute>
                  <OrderSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Auth routes (no main layout) */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
