import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import DataTable from '../components/ui/DataTable'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { Search, Ban, CheckCircle, ShieldAlert, Download } from 'lucide-react'

export default function Users() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState([])
  const [banTarget, setBanTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page, pageSize, sorting],
    queryFn: async () => {
      const roleParam = role ? `&role=${role}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const sortParam = sorting.length > 0 ? `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}` : ''
      const res = await api.get(`/admin/users?page=${page}&limit=${pageSize}${roleParam}${searchParam}${sortParam}`)
      return res.data
    }
  })

  const users = data?.data || []
  const total = data?.total || 0

  const banMutation = useMutation({
    mutationFn: async (id) => api.patch(`/admin/users/${id}/ban`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User banned successfully'); },
    onError: () => toast.error('Failed to ban user')
  })

  const unbanMutation = useMutation({
    mutationFn: async (id) => api.patch(`/admin/users/${id}/unban`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User unbanned successfully'); },
    onError: () => toast.error('Failed to unban user')
  })

  const handleToggleStatus = (user) => {
    if (user.is_active) setBanTarget(user)
    else unbanMutation.mutate(user.id)
  }

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-gray-900">{val}</p>
          <p className="text-xs text-gray-400 font-mono">{row.id}</p>
        </div>
      )
    },
    {
      key: 'email', label: 'Email / Phone',
      render: (val, row) => (
        <div>
          <p className="text-gray-900">{val}</p>
          <p className="text-xs text-gray-400">{row.phone || 'N/A'}</p>
        </div>
      )
    },
    {
      key: 'role', label: 'Role',
      render: (val) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
          val === 'admin' ? 'bg-red-50 text-red-600' : val === 'vendor' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
        }`}>{val}</span>
      )
    },
    {
      key: 'is_verified', label: 'Verified',
      render: (val) => (
        <span className={val ? 'text-green-600 text-xs font-semibold' : 'text-amber-500 text-xs font-semibold'}>
          {val ? '✓ Verified' : '⚠ Unverified'}
        </span>
      )
    },
    {
      key: 'created_at', label: 'Joined Date',
      render: (val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    {
      key: 'is_active', label: 'Status',
      render: (val) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {val ? 'Active' : 'Banned'}
        </span>
      )
    },
    {
      key: 'id', label: 'Actions', sortable: false,
      render: (val, row) => {
        if (row.role === 'admin') return null
        return (
          <button onClick={() => handleToggleStatus(row)}
            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${row.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
            title={row.is_active ? 'Ban User' : 'Unban User'}>
            {row.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </button>
        )
      }
    }
  ]

  const handleExport = (tableData) => {
    if (!tableData.length) return;
    const exportCols = columns.filter(c => c.sortable !== false);
    const headers = exportCols.map(c => c.label).join(',');
    const rows = tableData.map(row => exportCols.map(c => { const s = String(row[c.key] ?? ''); return s.includes(',') ? `"${s}"` : s; }).join(','));
    const csv = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `users_${role || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">User Management</h1>
          <p className="text-gray-500 text-sm">View registered customers, vendors, and manage platform access</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-red-300">
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search user name/email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-300" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => { setPage(newPage); if (newPageSize !== pageSize) setPageSize(newPageSize); }}
          sorting={sorting}
          onSortingChange={setSorting}
          manualPagination
          manualSorting
          enableExport
          enableColumnVisibility
          renderTopToolbarCustomActions={({ table }) => (
            <button onClick={() => handleExport(table.getPrePaginationRowModel().rows.map(r => r.original))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        />
      )}

      <ConfirmDialog isOpen={!!banTarget} onClose={() => setBanTarget(null)}
        onConfirm={() => { banMutation.mutate(banTarget.id); setBanTarget(null); }}
        loading={banMutation.isPending} title="Ban User"
        message={`Are you sure you want to ban ${banTarget?.name}? They will lose access to the platform.`}
        confirmLabel="Ban User" variant="danger" />
    </div>
  )
}
