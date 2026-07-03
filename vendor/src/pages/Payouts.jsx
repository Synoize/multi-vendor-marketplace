import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Wallet, History, CreditCard, ArrowUpRight } from 'lucide-react'

export default function Payouts() {
  const { data: payoutData, isLoading } = useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: async () => {
      const res = await api.get('/vendors/payouts')
      return res.data.data
    }
  })

  const { data: profile } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: async () => {
      const res = await api.get('/vendors/profile')
      return res.data.data
    }
  })

  const payouts = payoutData?.payouts || []
  const pendingAmount = payoutData?.pendingAmount || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payouts & Settlements</h1>
        <p className="text-gray-500 text-sm">View your earnings, pending payouts, and bank settlement history</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Left */}
          <div className="md:col-span-2 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-[#2874F0] to-[#1a5de0] rounded-xl p-6 text-white shadow-md flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Unsettled Balance</p>
                <h3 className="text-3xl font-extrabold">₹{parseFloat(pendingAmount).toLocaleString('en-IN')}</h3>
                <p className="text-blue-200 text-xs mt-2">These earnings will be released in the next automated settlement cycle.</p>
              </div>
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                <h3 className="font-bold text-gray-900 text-sm">Settlement History</h3>
              </div>

              {payouts.length === 0 ? (
                <EmptyState
                  icon={<History className="h-10 w-10 text-gray-400" />}
                  title="No payouts yet"
                  description="Your settlement history will show up here after payouts are processed."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Orders</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Settled At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                      {payouts.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50/50">
                          <td className="p-4 font-mono text-xs">{p.transaction_id || `settle_${p.id}`}</td>
                          <td className="p-4 text-gray-500">
                            {JSON.parse(p.order_ids || '[]').length} orders
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            ₹{parseFloat(p.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4">
                            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-gray-400">
                            {new Date(p.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Bank details side */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
                <CreditCard className="h-5 w-5 text-[#2874F0]" />
                <h3 className="font-bold text-gray-900 text-sm">Settlement Bank Account</h3>
              </div>
              {profile?.bank_name ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400">Bank Name</p>
                    <p className="text-sm font-semibold text-gray-800">{profile.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Account Holder</p>
                    <p className="text-sm font-semibold text-gray-800">{profile.account_holder || 'Vendor Account'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Account Number</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono">
                      •••• •••• {profile.account_number?.slice(-4) || 'XXXX'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">IFSC Code</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono">{profile.ifsc_code}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-gray-500">No bank details added.</p>
                  <a href="/settings" className="inline-block text-xs font-semibold text-[#2874F0] hover:underline">
                    Add Bank Details in Settings →
                  </a>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-3">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Settlement Policy</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Damini processes automated payments to your registered bank account weekly. Minimum payout threshold is ₹500. Orders return window must expire before the order item becomes eligible for payout settlement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
