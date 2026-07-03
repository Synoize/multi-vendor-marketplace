import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { Store, Shield, TrendingUp, Star, Zap, CheckCircle } from 'lucide-react'

const STEPS = ['Basic Info', 'Business Info', 'Bank Details', 'Verify']

export default function SellerRegister() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuthStore()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    business_name: '', business_type: 'sole_proprietorship',
    gst_number: '', pan_number: '',
    store_name: '', store_description: '',
    bank_name: '', account_number: '', ifsc_code: '', account_holder: '',
    pickup_name: '', pickup_phone: '', pickup_line1: '', pickup_city: '', pickup_state: '', pickup_pincode: '',
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      if (!isAuthenticated) {
        toast.error('Please login first to register as a seller')
        navigate('/login')
        return
      }
      await api.post('/vendors/kyc', form)
      toast.success('KYC submitted successfully! Our team will review within 24-48 hours.')
      navigate('/profile')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Helmet>
        <title>Sell on Damini - Register as a Seller</title>
        <meta name="description" content="Join Damini Marketplace as a seller and reach millions of customers across India. Easy registration, instant payouts, and powerful seller tools." />
      </Helmet>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#2874F0] to-[#0d4bbf] text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Store className="h-14 w-14 text-[#FFE11B]" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Sell on Damini</h1>
          <p className="text-blue-200 text-lg md:text-xl max-w-2xl mx-auto">
            Join 50,000+ sellers and reach crores of customers across India. Start selling today for free!
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
            {[['🚀', 'Quick Setup', '15 min onboarding'], ['💰', 'Low Fees', 'Only 3-5% commission'], ['📈', 'Analytics', 'Real-time insights'], ['🎯', 'Ads Platform', 'Boost your sales']].map(([icon, title, sub]) => (
              <div key={title} className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold">{title}</div>
                <div className="text-blue-300 text-xs">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registration Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {isAuthenticated && user?.role === 'vendor' ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're already a seller!</h2>
            <p className="text-gray-500 mb-5">Manage your store from the Vendor Dashboard</p>
            <a href="http://localhost:5174" target="_blank" rel="noreferrer"
              className="bg-[#2874F0] text-white font-bold px-8 py-3 rounded-full text-sm hover:bg-[#1a5de0] transition-colors inline-block">
              Go to Seller Hub →
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Stepper */}
            <div className="bg-gray-50 px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < step ? 'bg-green-500 text-white' : i === step ? 'bg-[#2874F0] text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {i < step ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-[#2874F0]' : 'text-gray-500'}`}>{s}</span>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6">
              {step === 0 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg text-gray-900">Basic Information</h2>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Name *</label>
                    <input value={form.store_name} onChange={e => update('store_name', e.target.value)} placeholder="e.g. Ravi Electronics"
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
                    <textarea value={form.store_description} onChange={e => update('store_description', e.target.value)} rows={3}
                      placeholder="Tell customers about your store..."
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0] resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
                    <select value={form.business_type} onChange={e => update('business_type', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#2874F0]">
                      {['sole_proprietorship', 'partnership', 'llp', 'private_limited', 'public_limited'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  {!isAuthenticated && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-[#2874F0]">
                      💡 Please <a href="/login" className="font-bold underline">login</a> or <a href="/signup" className="font-bold underline">create an account</a> before completing registration.
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg text-gray-900">Business & Tax Info</h2>
                  {[
                    { label: 'Business/Legal Name *', key: 'business_name', placeholder: 'Registered business name' },
                    { label: 'GST Number', key: 'gst_number', placeholder: '15-digit GST number' },
                    { label: 'PAN Number *', key: 'pan_number', placeholder: 'AAAAA0000A' },
                    { label: 'Pickup Address *', key: 'pickup_line1', placeholder: 'Full pickup address' },
                    { label: 'City *', key: 'pickup_city', placeholder: 'City' },
                    { label: 'State *', key: 'pickup_state', placeholder: 'State' },
                    { label: 'Pincode *', key: 'pickup_pincode', placeholder: '6-digit pincode' },
                    { label: 'Contact Name *', key: 'pickup_name', placeholder: 'Contact person name' },
                    { label: 'Contact Phone *', key: 'pickup_phone', placeholder: '10-digit mobile' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#2874F0]" />
                    </div>
                  ))}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <h2 className="font-bold text-lg text-gray-900">Bank Details</h2>
                  <p className="text-gray-500 text-sm">Your payouts will be deposited to this account</p>
                  {[
                    { label: 'Bank Name *', key: 'bank_name', placeholder: 'e.g. State Bank of India' },
                    { label: 'Account Holder Name *', key: 'account_holder', placeholder: 'Registered name on account' },
                    { label: 'Account Number *', key: 'account_number', placeholder: 'Bank account number' },
                    { label: 'IFSC Code *', key: 'ifsc_code', placeholder: 'e.g. SBIN0001234' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input value={form[key]} onChange={e => update(key, e.target.value)} placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#2874F0]" />
                    </div>
                  ))}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                    🔒 Your bank details are encrypted and stored securely. Payouts are processed within 7 business days.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Submit!</h2>
                  <p className="text-gray-500 mb-6">Review your information and submit for verification. Our team will review within 24-48 hours.</p>
                  <div className="bg-gray-50 rounded-lg p-4 text-left text-sm space-y-2 mb-6">
                    <div className="flex justify-between"><span className="text-gray-500">Store Name</span><span className="font-medium">{form.store_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Business</span><span className="font-medium">{form.business_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">PAN</span><span className="font-medium">{form.pan_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium">{form.bank_name}</span></div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)} className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                    ← Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button onClick={() => setStep(s => s + 1)} className="flex-1 bg-[#2874F0] hover:bg-[#1a5de0] text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                    Continue →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={loading}
                    className="flex-1 bg-[#FB641B] hover:bg-[#e55a18] disabled:opacity-60 text-white font-bold py-2.5 rounded-lg text-sm transition-colors">
                    {loading ? '⏳ Submitting...' : '🚀 Submit for Review'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {[
            { icon: <Shield className="h-6 w-6 text-[#2874F0]" />, title: 'Secure Payouts', desc: 'Weekly payouts directly to your bank account' },
            { icon: <TrendingUp className="h-6 w-6 text-[#2874F0]" />, title: 'Seller Analytics', desc: 'Track sales, revenue and customer insights' },
            { icon: <Zap className="h-6 w-6 text-[#2874F0]" />, title: 'Ad Campaigns', desc: 'Boost product visibility with targeted ads' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-5 shadow-sm text-center">
              <div className="flex justify-center mb-2">{icon}</div>
              <h3 className="font-bold text-gray-900 mb-1 text-sm">{title}</h3>
              <p className="text-gray-500 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
