import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Tag, Plus, ToggleLeft, ToggleRight, Trash2, Edit } from 'lucide-react'

export default function Coupons() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [form, setForm] = useState({
    code: '',
    discount_type: 'flat',
    discount_value: '',
    min_order_amount: '',
    max_discount_amount: '',
    user_limit: '1',
    expires_at: '',
  })

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await api.get('/coupons')
      return res.data.data || []
    }
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingCoupon) {
        return api.put(`/coupons/${editingCoupon.id}`, payload)
      } else {
        return api.post('/coupons', payload)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created')
      resetForm()
    },
    onError: () => {
      toast.error('Failed to save coupon')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/coupons/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon deleted')
    },
    onError: () => {
      toast.error('Failed to delete coupon')
    }
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/coupons/${id}/toggle`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Status updated')
    },
    onError: () => {
      toast.error('Failed to toggle status')
    }
  })

  const resetForm = () => {
    setForm({
      code: '',
      discount_type: 'flat',
      discount_value: '',
      min_order_amount: '',
      max_discount_amount: '',
      user_limit: '1',
      expires_at: '',
    })
    setEditingCoupon(null)
    setShowAddModal(false)
  }

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon)
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount,
      max_discount_amount: coupon.max_discount_amount || '',
      user_limit: coupon.user_limit,
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
    })
    setShowAddModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    saveMutation.mutate({
      ...form,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: parseFloat(form.min_order_amount),
      max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
      user_limit: parseInt(form.user_limit),
    })
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          <p className="text-gray-500 text-sm">Create and configure platform promotional discount coupons</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true) }}
          className="flex items-center gap-1.5 bg-[#2874F0] hover:bg-[#1a5de0] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={<Tag className="h-10 w-10 text-gray-400" />}
          title="No coupons"
          description="Promotional discount coupons will appear here."
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                  <th className="p-4">Coupon Code</th>
                  <th className="p-4">Discount Type</th>
                  <th className="p-4">Value</th>
                  <th className="p-4">Min Spend</th>
                  <th className="p-4">Uses</th>
                  <th className="p-4">Expiry</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {coupons.map(coupon => (
                  <tr key={coupon.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-mono font-bold text-[#2874F0] uppercase">{coupon.code}</td>
                    <td className="p-4 capitalize">{coupon.discount_type}</td>
                    <td className="p-4 font-bold text-gray-900">
                      {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                    </td>
                    <td className="p-4 text-gray-500">₹{coupon.min_order_amount}</td>
                    <td className="p-4 text-xs text-gray-500">
                      Used: <span className="font-bold text-gray-800">{coupon.used_count || 0}</span>
                    </td>
                    <td className="p-4 text-xs text-gray-500">
                      {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString('en-IN') : 'Never'}
                    </td>
                    <td className="p-4">
                      <button onClick={() => toggleMutation.mutate(coupon.id)}>
                        {coupon.is_active ? (
                          <ToggleRight className="h-7 w-7 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-7 w-7 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(coupon)}
                          className="bg-blue-50 text-[#2874F0] hover:bg-blue-100 p-2 rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-zoom-in overflow-y-auto max-h-[90vh]">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WELCOME100"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] uppercase font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Type *</label>
                  <select
                    value={form.discount_type}
                    onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  >
                    <option value="flat">Flat Cash Discount</option>
                    <option value="percent">Percentage Discount</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Min Spend Required (₹) *</label>
                  <input
                    type="number"
                    required
                    value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Max Discount Amount (₹)</label>
                  <input
                    type="number"
                    value={form.max_discount_amount}
                    onChange={e => setForm(f => ({ ...f, max_discount_amount: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">User Max Uses *</label>
                  <input
                    type="number"
                    required
                    value={form.user_limit}
                    onChange={e => setForm(f => ({ ...f, user_limit: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-[#2874F0] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5de0]"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
