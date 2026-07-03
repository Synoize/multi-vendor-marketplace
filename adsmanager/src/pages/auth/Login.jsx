import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Zap, Megaphone, TrendingUp, BarChart3 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import useAuthStore from '../../store/authStore'
import Spinner from '../../components/ui/Spinner'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const FEATURES = [
  { icon: Megaphone, label: 'Promote your products', desc: 'Reach millions of shoppers on Damini' },
  { icon: TrendingUp, label: 'Track performance', desc: 'Real-time impressions, clicks & ROAS' },
  { icon: BarChart3, label: 'Smart analytics', desc: 'Campaign-level and product-level insights' },
]

function Login() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      await login(data.email, data.password)
      toast.success('Welcome back! Loading your campaigns...')
      navigate('/')
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In — Damini Ads Manager</title>
      </Helmet>

      <div className="min-h-screen bg-[#080B12] flex">
        {/* Left Panel — Branding */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#0d1424] to-[#0a0f1e] border-r border-white/5 p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FB641B] to-[#e04f09] flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">Damini Ads</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest">Manager</p>
            </div>
          </div>

          {/* Hero */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#FB641B]/10 border border-[#FB641B]/20 rounded-full px-3 py-1.5 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FB641B] animate-pulse" />
                <span className="text-[#FB641B] text-xs font-medium">Vendor Advertising Platform</span>
              </div>
              <h1 className="text-4xl font-black text-white leading-tight">
                Manage your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FB641B] to-[#ff8c47]">
                  Damini Ad
                </span>{' '}
                Campaigns
              </h1>
              <p className="text-gray-400 mt-4 text-base leading-relaxed">
                Create high-performance ad campaigns, track real-time analytics, and grow your sales on India's fastest-growing marketplace.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[#FB641B]/10 border border-[#FB641B]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#FB641B]/20 transition-colors">
                    <Icon className="w-5 h-5 text-[#FB641B]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '2M+', label: 'Monthly Shoppers' },
              { value: '₹50Cr+', label: 'Ad Spend Managed' },
              { value: '10x', label: 'Avg. ROAS' },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3 text-center">
                <p className="text-xl font-black text-[#FB641B]">{stat.value}</p>
                <p className="text-gray-400 text-[11px] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FB641B] to-[#e04f09] flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base">Damini Ads</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-widest">Manager</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Vendor Sign In</h2>
              <p className="text-gray-400 text-sm mt-1.5">
                Access your advertising dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="vendor@store.com"
                  className="input-dark w-full"
                />
                {errors.email && (
                  <p className="text-red-400 text-xs">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="input-dark w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-xs">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FB641B] to-[#e04f09] hover:from-[#e04f09] hover:to-[#cc3d00] text-white font-semibold rounded-xl px-4 py-3 text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 mt-2"
              >
                {loading ? (
                  <>
                    <Spinner size="xs" color="white" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Ads Manager'
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
              <p className="text-xs text-blue-400 font-medium">🔐 Vendor accounts only</p>
              <p className="text-xs text-gray-500 mt-1">
                This portal is exclusive to registered Damini vendors. Contact support if you need access.
              </p>
            </div>

            <p className="text-center text-gray-600 text-xs mt-6">
              © 2025 Damini Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default Login
