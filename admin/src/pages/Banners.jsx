import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Plus, Trash2, Link as LinkIcon, Image, Eye, EyeOff } from 'lucide-react'

export default function Banners() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    link: '',
    position: 'hero',
    sort_order: '0',
  })

  // Fetch banners
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners'],
    queryFn: async () => {
      const res = await api.get('/banners')
      return res.data.data || []
    }
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/banners', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      toast.success('Banner created successfully')
      resetForm()
    },
    onError: () => {
      toast.error('Failed to create banner')
    }
  })

  // Update active status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return api.put(`/banners/${id}`, { is_active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      toast.success('Banner status updated')
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/banners/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] })
      toast.success('Banner deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete banner')
    }
  })

  const resetForm = () => {
    setForm({
      title: '',
      subtitle: '',
      image: '',
      link: '',
      position: 'hero',
      sort_order: '0',
    })
    setShowAddModal(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      sort_order: parseInt(form.sort_order)
    })
  }

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
          <p className="text-gray-500 text-sm">Upload and manage promotional slides for the customer homepage</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-[#2874F0] hover:bg-[#1a5de0] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Banner
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={<Image className="h-10 w-10 text-gray-400" />}
          title="No banners"
          description="Homepage banners will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map(banner => (
            <div key={banner.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="aspect-[3/1] bg-gray-50 flex items-center justify-center border-b border-gray-50 relative overflow-hidden">
                <img
                  src={banner.image || 'https://picsum.photos/seed/banner/600/200'}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className="bg-black/50 text-white font-semibold text-[9px] px-2 py-0.5 rounded-full capitalize">
                    {banner.position}
                  </span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-gray-900 text-sm">{banner.title || 'Untitled Banner'}</h4>
                  {banner.subtitle && <p className="text-xs text-gray-500">{banner.subtitle}</p>}
                  {banner.link && (
                    <p className="text-xs text-[#2874F0] font-semibold flex items-center gap-1">
                      <LinkIcon className="h-3 w-3" /> {banner.link}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                  <button
                    onClick={() => toggleMutation.mutate({ id: banner.id, is_active: banner.is_active ? 0 : 1 })}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                      banner.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {banner.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Banner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Add Promo Banner</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Banner Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Electronics Sale"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Min 50% Off on Top Brands"
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Image URL *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://images.unsplash.com/photo-xxx"
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Redirection Link</label>
                <input
                  type="text"
                  placeholder="e.g. /products?category=electronics"
                  value={form.link}
                  onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Position *</label>
                  <select
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  >
                    <option value="hero">Hero Carousel</option>
                    <option value="side">Side Banners</option>
                    <option value="offer">Offer Banner Grid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sort Order *</label>
                  <input
                    type="number"
                    required
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                  />
                </div>
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
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-[#2874F0] text-white rounded-lg text-sm font-semibold hover:bg-[#1a5de0]"
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
