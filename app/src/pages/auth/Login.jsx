import React, { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { ShoppingBag, Mail, Lock } from 'lucide-react'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [step, setStep] = useState('email') // 'email' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const handleRequestOTP = async (data) => {
    setLoading(true)
    try {
      await api.post('/auth/login', { email: data.email })
      setEmail(data.email)
      setStep('otp')
      toast.success('OTP sent to your email address!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a 6-digit OTP')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/verify-email', { email, otp })
      localStorage.setItem('accessToken', res.data.data?.accessToken)
      setUser(res.data.data?.user)
      toast.success(`Welcome to Damini!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
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
            <h2 className="text-3xl font-bold mb-4 leading-tight">Fastest & Secure OTP Login</h2>
            <p className="text-blue-200 text-lg leading-relaxed">No passwords needed. Verify your email to instantly access your wishlist, cart, and orders.</p>
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

            {step === 'email' ? (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Login / Signup</h1>
                <p className="text-gray-500 text-sm mb-6">Enter your email to receive a secure login OTP</p>

                <form onSubmit={handleSubmit(handleRequestOTP)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        {...register('email', { required: 'Email is required' })}
                        placeholder="you@example.com"
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all"
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors text-sm"
                  >
                    {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h1>
                <p className="text-gray-500 text-sm mb-6">We've sent a 6-digit verification code to <span className="font-semibold text-gray-800">{email}</span></p>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors text-sm"
                  >
                    {loading ? 'Verifying...' : 'Verify & Log In'}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => api.post('/auth/login', { email }).then(() => toast.success('New OTP sent!'))}
                  className="mt-4 w-full text-center text-sm font-semibold text-[#2874F0] hover:underline"
                >
                  Resend OTP Code
                </button>
              </>
            )}

            <div className="mt-8 text-center">
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
