import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { User, MapPin, Package, Wallet, Bell, Lock, ChevronRight, Plus, Edit, Trash2 } from 'lucide-react'

const TABS = [
  { id: 'profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
  { id: 'addresses', label: 'Addresses', icon: <MapPin className="h-4 w-4" /> },
  { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
  { id: 'security', label: 'Password', icon: <Lock className="h-4 w-4" /> },
]

export default function Profile() {
  const { user, setUser } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({ name: user?.name || '', phone: user?.phone || '' })

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => { const { data } = await api.get('/users/me/addresses'); return data.data || [] },
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => { const { data } = await api.get('/users/me/wallet'); return data.data },
  })

  const saveProfile = async () => {
    try {
      const { data } = await api.put('/users/me', formData)
      setUser(data.data)
      setEditing(false)
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') }
  }

  const deleteAddress = async (id) => {
    try { await api.delete(`/users/me/addresses/${id}`); refetchAddresses(); toast.success('Address deleted') }
    catch { toast.error('Failed to delete address') }
  }

  return (
    <>
      <Helmet><title>My Profile - Damini</title></Helmet>
      <div className="max-w-5xl mx-auto px-3 md:px-4 py-5">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-[#2874F0] to-[#1a5de0] p-5 text-white text-center">
                <div className="w-16 h-16 rounded-full bg-white text-[#2874F0] text-2xl font-bold flex items-center justify-center mx-auto mb-3 uppercase">
                  {user?.name?.[0] || 'U'}
                </div>
                <p className="font-bold">{user?.name}</p>
                <p className="text-blue-200 text-xs mt-0.5">{user?.email}</p>
                {user?.referral_code && (
                  <div className="mt-2 bg-white/20 rounded px-2 py-0.5 text-xs font-mono">{user.referral_code}</div>
                )}
              </div>
              <nav className="py-2">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${activeTab === tab.id ? 'bg-blue-50 text-[#2874F0] font-semibold border-l-4 border-[#2874F0]' : 'text-gray-700 hover:bg-gray-50'}`}>
                    <span className="text-gray-400">{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 text-lg">Personal Information</h2>
                  <button onClick={() => editing ? saveProfile() : setEditing(true)}
                    className={`text-sm font-semibold px-4 py-1.5 rounded ${editing ? 'bg-[#2874F0] text-white' : 'border border-[#2874F0] text-[#2874F0]'} transition-colors`}>
                    {editing ? 'Save Changes' : 'Edit Profile'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name', key: 'name', type: 'text' },
                    { label: 'Mobile Number', key: 'phone', type: 'tel' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                      {editing ? (
                        <input type={type} value={formData[key] || ''} onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2874F0]" />
                      ) : (
                        <p className="text-sm text-gray-800 font-medium py-2">{user?.[key] || 'Not set'}</p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email Address</label>
                    <p className="text-sm text-gray-800 font-medium py-2">{user?.email}</p>
                    {user?.is_verified ? (
                      <span className="text-green-600 text-xs font-medium">✓ Verified</span>
                    ) : (
                      <span className="text-red-500 text-xs font-medium">⚠ Not verified</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Account Type</label>
                    <p className="text-sm font-medium py-2 capitalize">{user?.role}</p>
                  </div>
                </div>
                {editing && (
                  <button onClick={() => setEditing(false)} className="mt-3 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-lg">Saved Addresses</h2>
                  <button className="text-[#2874F0] text-sm font-semibold flex items-center gap-1.5 border border-[#2874F0] px-3 py-1.5 rounded hover:bg-blue-50 transition-colors">
                    <Plus className="h-4 w-4" /> Add Address
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No saved addresses</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map(addr => (
                      <div key={addr.id} className="border border-gray-100 rounded-lg p-4 relative">
                        {addr.is_default && (
                          <span className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Default</span>
                        )}
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-medium">{addr.type}</span>
                          <p className="font-semibold text-sm text-gray-800">{addr.name}</p>
                        </div>
                        <p className="text-sm text-gray-600">{addr.line1}{addr.line2 && `, ${addr.line2}`}</p>
                        <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-xs text-gray-500 mt-1">📞 {addr.phone}</p>
                        <div className="flex gap-3 mt-2">
                          <button className="text-xs text-[#2874F0] font-semibold hover:underline">Edit</button>
                          <button onClick={() => deleteAddress(addr.id)} className="text-xs text-red-500 font-semibold hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === 'wallet' && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-bold text-gray-900 text-lg mb-4">Damini Wallet</h2>
                <div className="bg-gradient-to-br from-[#2874F0] to-[#1a5de0] rounded-xl p-6 text-white mb-5">
                  <p className="text-blue-200 text-sm mb-1">Available Balance</p>
                  <p className="text-4xl font-bold">₹{parseFloat(wallet?.balance || 0).toLocaleString('en-IN')}</p>
                  <p className="text-blue-200 text-xs mt-2">Use your wallet balance at checkout for instant discounts</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Recent Transactions</h3>
                  {wallet?.transactions?.length > 0 ? (
                    wallet.transactions.map((t) => (
                      <div key={t.id} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{t.description}</p>
                          <p className="text-xs text-gray-500">{new Date(t.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                        <span className={`font-bold text-sm ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                          {t.type === 'credit' ? '+' : '-'}₹{parseFloat(t.amount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-6">No transactions yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow-sm p-5">
                <h2 className="font-bold text-gray-900 text-lg mb-4">Change Password</h2>
                <div className="max-w-sm space-y-4">
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                      <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2874F0]" />
                    </div>
                  ))}
                  <button className="bg-[#2874F0] hover:bg-[#1a5de0] text-white font-bold px-6 py-2.5 rounded text-sm transition-colors">
                    Update Password
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
