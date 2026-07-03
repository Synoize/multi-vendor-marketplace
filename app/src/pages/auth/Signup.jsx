import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import api from '@/lib/axios'
import { toast } from 'sonner'

export default function Signup() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [step, setStep] = useState('register') // 'register' | 'otp'
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  const onRegister = async (data) => {
    try {
      await api.post('/auth/register', data)
      setEmail(data.email)
      setStep('otp')
      toast.success('Account created! Check your email for OTP')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed')
    }
  }

  const onVerifyOTP = async () => {
    if (!otp || otp.length !== 6) { toast.error('Enter a 6-digit OTP'); return }
    try {
      await api.post('/auth/verify-email', { email, otp })
      toast.success('Email verified! Please login.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP')
    }
  }

  return (
    <>
      <Helmet><title>Create Account - Damini Marketplace</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#2874F0] to-[#0d4bbf] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <span className="text-[#2874F0] font-bold text-3xl">damini</span>
          </div>

          {step === 'register' ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
              <p className="text-gray-500 text-sm mb-6">Join millions of happy shoppers on Damini</p>
              <form onSubmit={handleSubmit(onRegister)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Too short' } })}
                    placeholder="Your full name"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input type="email" {...register('email', { required: 'Email is required' })}
                    placeholder="you@example.com"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number (optional)</label>
                  <input type="tel" {...register('phone')} placeholder="10-digit mobile number"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'}
                      {...register('password', {
                        required: 'Password is required',
                        minLength: { value: 8, message: 'Minimum 8 characters' },
                        pattern: { value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, message: 'Must include uppercase, lowercase, number & special char' }
                      })}
                      placeholder="Create a strong password"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 pr-10 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100" />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (optional)</label>
                  <input {...register('referralCode')} placeholder="Enter referral code"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100" />
                </div>
                <p className="text-xs text-gray-500">By creating an account, you agree to our <Link to="#" className="text-[#2874F0]">Terms</Link> and <Link to="#" className="text-[#2874F0]">Privacy Policy</Link></p>
                <button type="submit" disabled={isSubmitting}
                  className="w-full bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg transition-colors text-sm">
                  {isSubmitting ? '⏳ Creating Account...' : 'Create Account'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
              <p className="text-gray-500 text-sm mb-6">We've sent a 6-digit OTP to <span className="font-semibold text-gray-800">{email}</span></p>
              <input value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-2xl font-mono tracking-widest text-center outline-none focus:border-[#2874F0]" />
              <button onClick={onVerifyOTP} disabled={otp.length !== 6}
                className="mt-4 w-full bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-3.5 rounded-lg text-sm">
                Verify OTP
              </button>
              <button onClick={() => api.post('/auth/resend-otp', { email }).then(() => toast.success('New OTP sent!'))}
                className="mt-3 w-full text-sm text-[#2874F0] hover:underline">
                Resend OTP
              </button>
            </>
          )}

          <p className="text-center text-sm text-gray-600 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2874F0] font-bold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </>
  )
}
