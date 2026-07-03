import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Search, Store, RefreshCw } from 'lucide-react';
import api from '../lib/axios';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending KYC' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'suspended', label: 'Suspended' },
];

export default function Vendors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const status = searchParams.get('status') || 'all';
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-vendors', status, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: 20 });
      if (status && status !== 'all') params.append('kyc_status', status);
      if (search.trim()) params.append('search', search.trim());
      const res = await api.get(`/admin/vendors?${params}`);
      return res.data?.data || res.data || {};
    },
    keepPreviousData: true,
  });

  const vendors = data?.vendors || data?.docs || data || [];
  const total = data?.total || data?.totalDocs || 0;
  const totalPages = data?.totalPages || Math.ceil(total / 20) || 1;

  const columns = [
    {
      key: 'store_name',
      label: 'Store',
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/20 flex-shrink-0">
            <span className="text-xs font-bold text-blue-400">{val?.charAt(0)?.toUpperCase() || 'S'}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{val || '—'}</p>
            <p className="text-xs text-gray-500">{row.business_name || ''}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', label: 'Email', render: (val) => <span className="text-gray-400">{val || '—'}</span> },
    { key: 'phone', label: 'Phone', render: (val) => <span className="text-gray-400">{val || '—'}</span> },
    {
      key: 'kyc_status',
      label: 'KYC Status',
      render: (val) => <StatusBadge status={val || 'not_submitted'} />,
    },
    {
      key: 'is_active',
      label: 'Active',
      render: (val) => (
        <span className={`text-xs font-semibold ${val ? 'text-emerald-400' : 'text-red-400'}`}>
          {val ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Joined',
      render: (val) => val ? new Date(val).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: '2-digit' }) : '—',
    },
  ];

  return (
    <>
      <Helmet><title>Vendors — Damini Admin</title></Helmet>
      <div className="space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Store className="w-6 h-6 text-blue-400" /> Vendors
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage vendors, KYC approvals, and store settings</p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries(['admin-vendors'])}
            className="btn-ghost"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent text-sm text-white placeholder-gray-600 outline-none w-full"
            />
          </div>
          {/* Status tabs */}
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setSearchParams({ status: tab.key }); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  status === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              {isLoading ? 'Loading...' : `${total.toLocaleString()} vendors`}
            </p>
          </div>
          <DataTable
            columns={columns}
            data={Array.isArray(vendors) ? vendors : []}
            loading={isLoading}
            emptyMessage="No vendors found"
            onRowClick={(row) => navigate(`/vendors/${row._id || row.id}`)}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
