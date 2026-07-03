import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, ShoppingBag } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onSubmit = async (data) => {
    try {
      const { data: res } = await api.post('/auth/login', data)
      localStorage.setItem('accessToken', res.data.accessToken)
      setUser(res.data.user)
      toast.success(`Welcome back, ${res.data.user.name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Check your credentials.')
    }
  }

  return (
    <>
      <Helmet><title>Login - Damini Marketplace</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#2874F0] to-[#0d4bbf] flex">
        {/* Left branding */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 text-white">
          <div className="max-w-xs">
            <div className="flex items-center gap-3 mb-8">
              <ShoppingBag className="h-10 w-10" />
              <span className="text-4xl font-bold">damini</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 leading-tight">Login to access millions of products</h2>
            <p className="text-blue-200 text-lg leading-relaxed">Get access to your orders, wishlist, saved addresses and much more.</p>
            <div className="mt-8 space-y-3 text-blue-100">
              {['🛍️ Best prices guaranteed', '🚀 Same day delivery', '🔄 Easy 7-day returns', '🔒 100% secure payments'].map(f => (
                <p key={f} className="flex items-center gap-2 text-sm">{f}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="lg:hidden text-center mb-6">
              <span className="text-[#2874F0] font-bold text-3xl">damini</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back!</h1>
            <p className="text-gray-500 text-sm mb-6">Login to your account to continue shopping</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" {...register('email', { required: 'Email is required' })}
                  placeholder="you@example.com"
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} {...register('password', { required: 'Password is required' })}
                    placeholder="Enter your password"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-[#2874F0]" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-[#2874F0] hover:underline font-medium">Forgot password?</Link>
              </div>

              <button type="submit" disabled={isSubmitting}
                className="w-full bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors text-sm">
                {isSubmitting ? '⏳ Logging in...' : 'Login to Damini'}
              </button>
            </form>

            <div className="relative my-5">
              <hr className="border-gray-200" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-500">or continue with</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[{ icon: 'G', label: 'Google' }, { icon: '📱', label: 'Mobile OTP' }].map(({ icon, label }) => (
                <button key={label}
                  onClick={() => toast.info(`${label} login coming soon`)}
                  className="flex items-center justify-center gap-2 border border-gray-200 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="font-bold">{icon}</span> {label}
                </button>
              ))}
            </div>

            <p className="text-center text-sm text-gray-600 mt-5">
              New to Damini?{' '}
              <Link to="/signup" className="text-[#2874F0] font-bold hover:underline">Create Account</Link>
            </p>

            <div className="mt-4 text-center">
              <Link to="/seller-register" className="text-xs text-gray-500 hover:text-[#2874F0] transition-colors">
                Want to sell on Damini? <span className="font-semibold">Register as Seller →</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
