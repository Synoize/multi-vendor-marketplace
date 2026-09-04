import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import DataTable from '../components/ui/DataTable'
import { CreditCard, Wallet, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { toast } from 'sonner'
import { assets } from '../assets/assets'

export default function Billing() {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('500')
  const [loading, setLoading] = useState(false)

  // Fetch wallet details & transactions
  const { data, isLoading } = useQuery({
    queryKey: ['ads-wallet'],
    queryFn: async () => {
      const res = await api.get('/users/me/wallet')
      return res.data.data
    }
  })

  const wallet = data?.wallet || { balance: 0 }
  const transactions = data?.transactions || []

  // Load Razorpay checkout script once, then reuse it
  let razorpayPromise = null
  const loadRazorpay = () => {
    if (window.Razorpay) return Promise.resolve()
    if (razorpayPromise) return razorpayPromise
    razorpayPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        razorpayPromise = null
        reject(new Error('Could not load Razorpay checkout. Check your internet connection.'))
      }
      document.head.appendChild(script)
    })
    return razorpayPromise
  }

  const handleRecharge = async (e) => {
    e.preventDefault()
    if (!amount || parseFloat(amount) < 100) {
      toast.error('Minimum recharge amount is ₹100')
      return
    }
    setLoading(true)
    try {
      // 1. Create a real Razorpay order for the wallet recharge
      const { data: orderRes } = await api.post('/payments/wallet-recharge', {
        amount: parseFloat(amount),
      })
      const payment = orderRes?.data ?? orderRes
      if (!payment || typeof payment.key !== 'string') {
        throw new Error('Unexpected recharge order response')
      }

      await loadRazorpay()
      if (!window.Razorpay) {
        throw new Error('Razorpay checkout failed to initialize')
      }

      let settled = false
      const settle = (msg, ok) => {
        if (settled) return
        settled = true
        setLoading(false)
        if (msg) {
          if (ok) toast.success(msg)
          else toast.error(msg)
        }
      }

      const rzp = new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: 'INR',
        name: 'Damini Ads Manager',
        description: 'Ads Wallet Recharge',
        // Public build-time URL so the real Damini logo shows in the Razorpay modal.
        image: assets.logo
          ? new URL(assets.logo, window.location.origin).href
          : undefined,
        order_id: payment.razorpayOrderId,
        handler: async (response) => {
          try {
            await api.post('/payments/wallet-verify', {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            settle('Funds added to your ads wallet!', true)
            queryClient.invalidateQueries({ queryKey: ['ads-wallet'] })
          } catch (err) {
            settle(err.response?.data?.message || 'Payment verification failed. Please contact support.', false)
          }
        },
        modal: {
          ondismiss: () => {
            if (!settled) settle('Payment cancelled. No funds were added.', false)
          },
        },
        theme: { color: '#9F0202' },
      })

      rzp.on('payment.failed', () => {
        settle('Payment failed. Please try again.', false)
      })

      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start recharge')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Wallet</h1>
        <p className="text-secondary-800 text-sm">Manage your ad budget funds and review billing statement history</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Funds Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallet Info Card */}
            <div className="bg-gradient-to-r from-primary to-primary-800 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Ad Wallet Balance</p>
                <h3 className="text-3xl font-extrabold">₹{parseFloat(wallet.balance || 0).toLocaleString('en-IN')}</h3>
                <p className="text-white/70 text-xs mt-2">Funds are deducted automatically as clicks/impressions occur.</p>
              </div>
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Transactions */}
            <div className="bg-white rounded-lg border border-gray-100 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-secondary-800" />
                <h3 className="font-bold text-gray-900 text-sm font-sans">Recent Wallet Transactions</h3>
              </div>

              <DataTable
                columns={[
                  {
                    key: 'id',
                    label: 'Transaction ID',
                    render: (value) => (
                      <span className="font-mono text-xs text-secondary-900">{value}</span>
                    ),
                  },
                  {
                    key: 'description',
                    label: 'Description',
                    render: (value) => (
                      <span className="text-gray-800">{value || 'Campaign Spend'}</span>
                    ),
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    render: (value, row) => {
                      const isCredit = row.type === 'credit'
                      return (
                        <span className={`font-bold flex items-center gap-1 ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                          {isCredit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                          ₹{parseFloat(value).toLocaleString('en-IN')}
                        </span>
                      )
                    },
                  },
                  {
                    key: 'created_at',
                    label: 'Date',
                    render: (value) => (
                      <span className="text-xs text-secondary-800">
                        {new Date(value).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    ),
                  },
                ]}
                data={transactions}
                loading={isLoading}
                emptyMessage="No transactions yet. Your billing transaction statements will appear here."
                enablePagination={false}
                enableSearch={false}
              />
            </div>
          </div>

          {/* Recharge Side Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-3">
              <Plus className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-gray-900 text-sm font-sans">Add Ad Funds</h3>
            </div>
            <form onSubmit={handleRecharge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-secondary-800 uppercase">Amount (INR) *</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-secondary-800 text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="100"
                    placeholder="e.g. 1000"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full border border-secondary-300 rounded-lg pl-8 pr-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['500', '1000', '2000', '5000'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`px-3 py-1 border text-xs rounded-full font-bold transition-all ${
                      amount === val
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-secondary-300 text-secondary-800 hover:bg-secondary-200'
                    }`}
                  >
                    +₹{val}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-800 text-white py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-primary/20"
              >
                {loading ? 'Recharging...' : 'Pay with Razorpay'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
