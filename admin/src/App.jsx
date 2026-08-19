import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuthStore from "./store/authStore";
import AdminLayout from "./components/layout/AdminLayout";
import Spinner from "./components/ui/Spinner";

// Lazy-loaded pages
const Login = lazy(() => import("./pages/auth/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vendors = lazy(() => import("./pages/Vendors"));
const VendorDetail = lazy(() => import("./pages/VendorDetail"));
const Products = lazy(() => import("./pages/Products"));
const Categories = lazy(() => import("./pages/Categories"));
const Brands = lazy(() => import("./pages/Brands"));
const Users = lazy(() => import("./pages/Users"));
const Orders = lazy(() => import("./pages/Orders"));
const Coupons = lazy(() => import("./pages/Coupons"));
const Offers = lazy(() => import("./pages/Offers"));
const Banners = lazy(() => import("./pages/Banners"));
const Videos = lazy(() => import("./pages/Videos"));
const Ads = lazy(() => import("./pages/Ads"));
const Payouts = lazy(() => import("./pages/Payouts"));
const Reports = lazy(() => import("./pages/Reports"));
const Support = lazy(() => import("./pages/Support"));
const Settings = lazy(() => import("./pages/Settings"));
const FestivalSales = lazy(() => import("./pages/FestivalSales"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#080B12]">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, user, checkAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verify = async () => {
      if (isAuthenticated && user?.role === "admin") {
        setChecking(false);
        return;
      }
      await checkAuth();
      setChecking(false);
    };
    verify();
  }, []);

  if (checking) {
    return <PageLoader />;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected admin routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendors/:id" element={<VendorDetail />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="users" element={<Users />} />
          <Route path="orders" element={<Orders />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="offers" element={<Offers />} />
          <Route path="banners" element={<Banners />} />
          <Route path="festival-sales" element={<FestivalSales />} />
          <Route path="videos" element={<Videos />} />
          <Route path="ads" element={<Ads />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="support" element={<Support />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
