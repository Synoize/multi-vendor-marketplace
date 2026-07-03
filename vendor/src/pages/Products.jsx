import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../lib/axios'
import StatusBadge from '../components/ui/StatusBadge'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'draft', label: 'Draft' },
  { value: 'out_of_stock', label: 'Out of Stock' },
]

export default function Products() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['vendor-products', page, search, statusFilter],
    queryFn: async () => {
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      const { data } = await api.get('/vendors/products', { params })
      return data?.data || data
    },
    keepPreviousData: true,
  })

  const products = data?.products || data?.data || data?.items || []
  const totalPages = data?.totalPages || data?.total_pages || 1
  const totalCount = data?.total || data?.totalCount || products.length

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted successfully')
      queryClient.invalidateQueries(['vendor-products'])
      setDeleteTarget(null)
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to delete product')
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) =>
      api.patch(`/products/${id}`, { status: status === 'active' ? 'inactive' : 'active' }),
    onSuccess: () => {
      toast.success('Product status updated')
      queryClient.invalidateQueries(['vendor-products'])
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    },
  })

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to Load Products"
        description="We couldn't fetch your products. Please try again."
        ctaLabel="Retry"
        onCta={() => queryClient.invalidateQueries(['vendor-products'])}
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount} product{totalCount !== 1 ? 's' : ''} in your store
          </p>
        </div>
        <button
          onClick={() => navigate('/products/add')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2874F0] hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-md shadow-blue-300/30"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#2874F0] text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#2874F0] focus:ring-2 focus:ring-blue-100 appearance-none bg-white transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description={
              search || statusFilter
                ? 'Try adjusting your filters or search term.'
                : 'Add your first product to start selling.'
            }
            ctaLabel={!search && !statusFilter ? 'Add Product' : undefined}
            onCta={!search && !statusFilter ? () => navigate('/products/add') : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                      Product
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">
                      Price
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">
                      Stock
                    </th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-4">
                      Status
                    </th>
                    <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => {
                    const stock = product.stock ?? product.quantity ?? 0
                    const isActive = product.status === 'active'
                    return (
                      <tr key={product._id || product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <Package className="w-6 h-6 text-gray-300" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate max-w-xs">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                SKU: {product.sku || '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              ₹{Number(product.price).toLocaleString('en-IN')}
                            </p>
                            {product.mrp && product.mrp > product.price && (
                              <p className="text-xs text-gray-400 line-through">
                                ₹{Number(product.mrp).toLocaleString('en-IN')}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`text-sm font-semibold ${
                              stock === 0
                                ? 'text-red-600'
                                : stock < 5
                                ? 'text-orange-600'
                                : 'text-gray-800'
                            }`}
                          >
                            {stock}
                            {stock < 5 && stock > 0 && (
                              <span className="ml-1.5 text-xs font-medium text-orange-500">
                                Low
                              </span>
                            )}
                            {stock === 0 && (
                              <span className="ml-1.5 text-xs font-medium text-red-500">
                                Out
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={product.status || 'inactive'} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                toggleMutation.mutate({ id: product._id || product.id, status: product.status })
                              }
                              disabled={toggleMutation.isPending}
                              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#2874F0] transition-colors"
                              title={isActive ? 'Deactivate' : 'Activate'}
                            >
                              {isActive ? (
                                <ToggleRight className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => navigate(`/products/${product._id || product.id}/edit`)}
                              className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-[#2874F0] transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id || deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  )
}
