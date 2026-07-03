import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { Plus, Trash2, Video, Eye, EyeOff, Play } from 'lucide-react'

export default function Videos() {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    url: '',
    thumbnail: '',
    sort_order: '0',
  })

  // Fetch videos
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['admin-videos'],
    queryFn: async () => {
      const res = await api.get('/videos')
      return res.data.data || []
    }
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/videos', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      toast.success('Featured video added')
      resetForm()
    },
    onError: () => {
      toast.error('Failed to add video')
    }
  })

  // Update status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => {
      return api.put(`/videos/${id}`, { is_active })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      toast.success('Video status updated')
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/videos/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] })
      toast.success('Video removed')
    },
    onError: () => {
      toast.error('Failed to remove video')
    }
  })

  const resetForm = () => {
    setForm({
      title: '',
      url: '',
      thumbnail: '',
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
    if (confirm('Are you sure you want to remove this video?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Featured Videos</h1>
          <p className="text-gray-500 text-sm">Manage video clips for customer interactive shopping grids</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-[#2874F0] hover:bg-[#1a5de0] text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Video
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<Video className="h-10 w-10 text-gray-400" />}
          title="No videos"
          description="Homepage video widgets will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map(vid => (
            <div key={vid.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="aspect-video bg-black flex items-center justify-center relative group">
                <img
                  src={vid.thumbnail || 'https://picsum.photos/seed/video/300/200'}
                  alt=""
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-12 w-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-6 w-6 text-white fill-white ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <h4 className="font-bold text-gray-900 text-sm">{vid.title || 'Untitled Video'}</h4>
                  <p className="text-xs text-gray-400 truncate font-mono">{vid.url}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-4">
                  <button
                    onClick={() => toggleMutation.mutate({ id: vid.id, is_active: vid.is_active ? 0 : 1 })}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${
                      vid.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {vid.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {vid.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleDelete(vid.id)}
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

      {/* Add Video Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Add Featured Video</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Video Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unboxing New Samsung S24 Ultra"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Video Link (YouTube/MP4) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://www.youtube.com/watch?v=xxx"
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail Image URL *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://images.unsplash.com/photo-xxx"
                  value={form.thumbnail}
                  onChange={e => setForm(f => ({ ...f, thumbnail: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] font-mono"
                />
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
                  {createMutation.isPending ? 'Saving...' : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
