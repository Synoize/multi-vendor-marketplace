import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import Spinner from './components/ui/Spinner'
import { assets } from './assets/assets'

// Lazy-loaded pages (code-split so each route loads on demand)
const Login = lazy(() => import('./pages/auth/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const CampaignCreate = lazy(() => import('./pages/CampaignCreate'))
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'))
const Billing = lazy(() => import('./pages/Billing'))
const Settings = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center shadow-lg shadow-primary/30">
          <img src={assets.logoIcon} alt="" className="w-9 h-9 object-contain" />
        </div>
        <Spinner size="md" />
        <p className="text-gray-400 text-sm">Loading Damini Ads...</p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'vendor') {
    return <Navigate to="/login" replace />
  }

  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  const { checkAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      await checkAuth()
      setLoading(false)
    }
    init()
  }, [checkAuth])

  if (loading) {
    return <PageLoader />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="campaigns/create" element={<CampaignCreate />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="billing" element={<Billing />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
