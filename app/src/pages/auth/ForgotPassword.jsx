import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import api from '@/lib/axios'
import { toast } from 'sonner'

export default function ForgotPassword() {
  const [step, setStep] = useState('email') // email | otp | reset
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOTP = async () => {
    if (!email) { toast.error('Enter your email'); return }
    setLoading(true)
    try { await api.post('/auth/forgot-password', { email }); setStep('otp'); toast.success('OTP sent to your email') }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP') }
    finally { setLoading(false) }
  }

  const resetPassword = async () => {
    setLoading(true)
    try { await api.post('/auth/reset-password', { email, otp, newPassword }); toast.success('Password reset! Please login.'); setStep('done') }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to reset password') }
    finally { setLoading(false) }
  }

  return (
    <>
      <Helmet><title>Forgot Password - Damini</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-[#2874F0] to-[#0d4bbf] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6"><span className="text-[#2874F0] font-bold text-3xl">damini</span></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>

          {step === 'email' && <>
            <p className="text-gray-500 text-sm mb-5">Enter your email and we'll send you a reset OTP</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] mb-4" />
            <button onClick={sendOTP} disabled={loading} className="w-full bg-[#FB641B] text-white font-bold py-3.5 rounded-lg text-sm">{loading ? 'Sending...' : 'Send OTP'}</button>
          </>}

          {step === 'otp' && <>
            <p className="text-gray-500 text-sm mb-5">OTP sent to <strong>{email}</strong></p>
            <input value={otp} onChange={e => setOtp(e.target.value.slice(0, 6))} placeholder="6-digit OTP" maxLength={6}
              className="w-full border-2 border-gray-200 rounded-lg px-4 py-4 text-2xl font-mono tracking-widest text-center outline-none focus:border-[#2874F0] mb-3" />
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] mb-4" />
            <button onClick={resetPassword} disabled={loading || otp.length !== 6 || newPassword.length < 8}
              className="w-full bg-[#FB641B] text-white font-bold py-3.5 rounded-lg text-sm disabled:opacity-60">{loading ? 'Resetting...' : 'Reset Password'}</button>
          </>}

          {step === 'done' && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <h2 className="font-bold text-gray-900 text-lg mb-2">Password Reset Successful!</h2>
              <p className="text-gray-500 text-sm mb-5">You can now login with your new password</p>
              <Link to="/login" className="bg-[#2874F0] text-white font-bold px-6 py-2.5 rounded text-sm">Go to Login</Link>
            </div>
          )}

          <p className="text-center text-sm text-gray-600 mt-5">
            Remember your password? <Link to="/login" className="text-[#2874F0] font-bold">Login</Link>
          </p>
        </div>
      </div>
    </>
  )
}
