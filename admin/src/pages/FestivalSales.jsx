import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import DataTable from '../components/ui/DataTable'
import EmptyState from '../components/ui/EmptyState'
import ImageUpload from '../components/ui/ImageUpload'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Plus, Trash2, Edit3, Eye, EyeOff, Calendar, Gift } from 'lucide-react'

export default function FestivalSales() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    banner: '',
    starts_at: '',
    ends_at: '',
  })

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['admin-festival-sales'],
    queryFn: async () => {
      const res = await api.get('/admin/festival-sales')
      return res.data.data || []
    }
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => api.post('/admin/festival-sales', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-festival-sales'] })
      toast.success('Festival sale created')
      resetForm()
    },
    onError: () => toast.error('Failed to create'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => api.put(`/admin/festival-sales/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-festival-sales'] })
      toast.success('Festival sale updated')
      resetForm()
    },
    onError: () => toast.error('Failed to update'),
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }) => api.put(`/admin/festival-sales/${id}`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-festival-sales'] })
      toast.success('Status updated')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/admin/festival-sales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-festival-sales'] })
      toast.success('Festival sale deleted')
    },
  })

  const resetForm = () => {
    setForm({ name: '', description: '', banner: '', starts_at: '', ends_at: '' })
    setEditing(null)
    setShowModal(false)
  }

  const openEdit = (sale) => {
    setEditing(sale.id)
    setForm({
      name: sale.name,
      description: sale.description || '',
      banner: sale.banner || '',
      starts_at: sale.starts_at ? new Date(sale.starts_at).toISOString().slice(0, 16) : '',
      ends_at: sale.ends_at ? new Date(sale.ends_at).toISOString().slice(0, 16) : '',
    })
    setShowModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      description: form.description || null,
      banner: form.banner || null,
      starts_at: new Date(form.starts_at).toISOString().slice(0, 19).replace('T', ' '),
      ends_at: new Date(form.ends_at).toISOString().slice(0, 19).replace('T', ' '),
    }
    if (editing) {
      updateMutation.mutate({ id: editing, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (sale) => {
    setDeleteTarget(sale)
  }

  const isActive = (sale) => {
    const now = Date.now()
    return sale.is_active && new Date(sale.starts_at) <= now && new Date(sale.ends_at) >= now
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Festival Sales</h1>
          <p className="text-gray-500 text-sm">Manage Big Billion Days & other promotional sales displayed on the homepage</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" /> New Sale
        </button>
      </div>

      <DataTable
        columns={[
          {
            key: 'name',
            label: 'Name',
            sortable: true,
            render: (_, sale) => (
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{sale.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isActive(sale)
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    : sale.is_active
                      ? 'bg-amber-50 text-amber-600 border-amber-100'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}>
                  {isActive(sale) ? 'Live' : sale.is_active ? 'Scheduled' : 'Inactive'}
                </span>
              </div>
            ),
          },
          {
            key: 'description',
            label: 'Description',
            sortable: true,
            render: (_, sale) => (
              <span className="text-sm text-gray-500">{sale.description || '—'}</span>
            ),
          },
          {
            key: 'starts_at',
            label: 'Start Date',
            sortable: true,
            render: (_, sale) => (
              <span className="text-sm text-gray-500">
                {sale.starts_at ? new Date(sale.starts_at).toLocaleDateString() : '—'}
              </span>
            ),
          },
          {
            key: 'ends_at',
            label: 'End Date',
            sortable: true,
            render: (_, sale) => (
              <span className="text-sm text-gray-500">
                {sale.ends_at ? new Date(sale.ends_at).toLocaleDateString() : '—'}
              </span>
            ),
          },
          {
            key: 'is_active',
            label: 'Status',
            sortable: false,
            render: (_, sale) => (
              <button
                onClick={() => toggleMutation.mutate({ id: sale.id, is_active: sale.is_active ? 0 : 1 })}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg ${
                  sale.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {sale.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {sale.is_active ? 'Active' : 'Inactive'}
              </button>
            ),
          },
          {
            key: 'id',
            label: 'Actions',
            sortable: false,
            render: (_, sale) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(sale)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(sale)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        data={sales}
        loading={isLoading}
        emptyMessage="No festival sales"
        enableSearch={true}
        enablePagination={false}
        enableExport={false}
        enableColumnVisibility={false}
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-lg p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">{editing ? 'Edit Sale' : 'New Festival Sale'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sale Name *</label>
                <input type="text" required placeholder="e.g. Big Billion Days Sale"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea placeholder="e.g. Up to 80% off on top brands"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300" rows={2} />
              </div>
              <ImageUpload
                label="Banner Image"
                value={form.banner}
                uploadPath="festival"
                onChange={(url) => setForm(f => ({ ...f, banner: url }))}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Starts At *</label>
                  <input type="datetime-local" required
                    value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ends At *</label>
                  <input type="datetime-local" required
                    value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors">
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update Sale' : 'Create Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        loading={deleteMutation.isPending}
        title="Delete Festival Sale"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
