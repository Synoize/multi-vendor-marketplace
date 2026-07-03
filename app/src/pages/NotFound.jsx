import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <>
      <Helmet><title>Page Not Found - Damini</title></Helmet>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-6">😕</div>
          <h1 className="text-5xl font-bold text-[#2874F0] mb-2">404</h1>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Page Not Found</h2>
          <p className="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="flex items-center justify-center gap-2 bg-[#2874F0] hover:bg-[#1a5de0] text-white font-bold px-6 py-3 rounded-full transition-colors">
              <Home className="h-4 w-4" /> Go Home
            </Link>
            <Link to="/products" className="flex items-center justify-center gap-2 border border-[#2874F0] text-[#2874F0] font-bold px-6 py-3 rounded-full hover:bg-blue-50 transition-colors">
              <Search className="h-4 w-4" /> Browse Products
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
