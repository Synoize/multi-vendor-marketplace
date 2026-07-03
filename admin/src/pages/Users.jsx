import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { toast } from 'sonner'
import Spinner from '../components/ui/Spinner'
import DataTable from '../components/ui/DataTable'
import { Search, Ban, CheckCircle, ShieldAlert } from 'lucide-react'

export default function Users() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: async () => {
      const roleParam = role ? `&role=${role}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const res = await api.get(`/admin/users?page=${page}&limit=10${roleParam}${searchParam}`)
      return res.data
    }
  })

  // Normalize API response since it returns { data, total, page, limit }
  const users = data?.data || []
  const total = data?.total || 0

  // Ban mutation
  const banMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/admin/users/${id}/ban`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User banned successfully')
    },
    onError: () => {
      toast.error('Failed to ban user')
    }
  })

  // Unban mutation
  const unbanMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/admin/users/${id}/unban`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User unbanned successfully')
    },
    onError: () => {
      toast.error('Failed to unban user')
    }
  })

  const handleToggleStatus = (user) => {
    if (user.is_active) {
      if (confirm(`Are you sure you want to ban ${user.name}? They will lose access to the platform.`)) {
        banMutation.mutate(user.id)
      }
    } else {
      unbanMutation.mutate(user.id)
    }
  }

  const columns = [
    {
      header: 'Name',
      accessor: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.name}</p>
          <p className="text-xs text-gray-500 font-mono">{row.id}</p>
        </div>
      )
    },
    {
      header: 'Email / Phone',
      accessor: (row) => (
        <div>
          <p className="text-gray-900">{row.email}</p>
          <p className="text-xs text-gray-500">{row.phone || 'N/A'}</p>
        </div>
      )
    },
    {
      header: 'Role',
      accessor: (row) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase ${
          row.role === 'admin' ? 'bg-red-100 text-red-700' : row.role === 'vendor' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {row.role}
        </span>
      )
    },
    {
      header: 'Verified',
      accessor: (row) => (
        <span className={row.is_verified ? 'text-green-600 text-xs font-semibold' : 'text-amber-500 text-xs font-semibold'}>
          {row.is_verified ? '✓ Verified' : '⚠ Unverified'}
        </span>
      )
    },
    {
      header: 'Joined Date',
      accessor: (row) => new Date(row.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          row.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {row.is_active ? 'Active' : 'Banned'}
        </span>
      )
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => {
        if (row.role === 'admin') return null
        return (
          <button
            onClick={() => handleToggleStatus(row)}
            className={`p-2 rounded-lg transition-colors text-xs font-semibold ${
              row.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
            title={row.is_active ? 'Ban User' : 'Unban User'}
          >
            {row.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          </button>
        )
      }
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">View registered customers, vendors, and manage platform access</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={role}
            onChange={e => { setRole(e.target.value); setPage(1) }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] bg-white text-gray-700"
          >
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search user name/email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2874F0]"
            />
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
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
