import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import Spinner from './components/ui/Spinner'

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Products = lazy(() => import('./pages/Products'))
const ProductForm = lazy(() => import('./pages/ProductForm'))
const Orders = lazy(() => import('./pages/Orders'))
const Returns = lazy(() => import('./pages/Returns'))
const Payouts = lazy(() => import('./pages/Payouts'))
const Shipments = lazy(() => import('./pages/Shipments'))
const Ads = lazy(() => import('./pages/Ads'))
const AdsCreate = lazy(() => import('./pages/AdsCreate'))
const Settings = lazy(() => import('./pages/Settings'))

// Full-screen loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-gray-500 font-medium">Loading…</p>
    </div>
  </div>
)

// Auth loading state
const AuthLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#2874F0] flex items-center justify-center">
        <span className="text-white font-bold text-xl">D</span>
      </div>
      <Spinner size="md" />
    </div>
  </div>
)

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <AuthLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Auth route – redirect to dashboard if already logged in
function AuthRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  if (isLoading) return <AuthLoader />
  if (isAuthenticated) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public auth routes */}
        <Route
          path="/login"
          element={
            <AuthRoute>
              <Login />
            </AuthRoute>
          }
        />

        {/* Protected vendor routes inside Layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="products/add" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders" element={<Orders />} />
          <Route path="returns" element={<Returns />} />
          <Route path="payouts" element={<Payouts />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="ads" element={<Ads />} />
          <Route path="ads/create" element={<AdsCreate />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all → dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
