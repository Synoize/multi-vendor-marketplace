import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import { getSocket } from '../lib/socket'
import Spinner from '../components/ui/Spinner'
import StatusBadge from '../components/ui/StatusBadge'
import DataTable from '../components/ui/DataTable'
import { Search, Eye, Download, X, ExternalLink } from 'lucide-react'

export default function Orders() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sorting, setSorting] = useState([])
  const [detailId, setDetailId] = useState(null)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', search, status, page, pageSize, sorting],
    queryFn: async () => {
      const statusParam = status ? `&status=${status}` : ''
      const searchParam = search ? `&search=${search}` : ''
      const sortParam = sorting.length > 0 ? `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? 'desc' : 'asc'}` : ''
      const res = await api.get(`/orders/admin?page=${page}&limit=${pageSize}${statusParam}${searchParam}${sortParam}`)
      return res.data.data
    },
    refetchInterval: 15000
  })

  const orders = data?.orders || []
  const total = data?.total || 0

  // Real-time: merge server-pushed order/shipment/payment updates into the
  // list rows and the open detail modal the moment they change.
  useEffect(() => {
    const socket = getSocket()
    const mergeRow = (row, d) => {
      const next = { ...row }
      if (d.status) next.status = d.status
      if (d.paymentStatus) next.payment_status = d.paymentStatus
      const t = d.tracking
      if (t) {
        if (t.status) next.shipment_status = t.status
        if (t.awb) next.awb_code = t.awb
        if (t.courier) next.courier_name = t.courier
        if (t.trackingUrl) next.tracking_url = t.trackingUrl
      }
      return next
    }
    const onUpdate = (d) => {
      if (!d || !d.orderId) return
      queryClient.setQueriesData({ queryKey: ['admin-orders'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          orders: (old.orders || []).map((row) =>
            row.id === d.orderId ? mergeRow(row, d) : row
          ),
        }
      })
      const t = d.tracking
      queryClient.setQueryData(['admin-order', d.orderId], (prev) => {
        if (!prev) return prev
        const next = { ...prev }
        if (d.status) next.status = d.status
        if (d.paymentStatus) next.payment_status = d.paymentStatus
        if (d.itemStatus && d.vendorId) {
          next.items = (prev.items || []).map((it) =>
            it.vendor_id === d.vendorId ? { ...it, status: d.itemStatus } : it
          )
        }
        if (t && (t.awb || t.courier || t.status || t.trackingUrl)) {
          next.shipments = (prev.shipments || []).map((s, i) =>
            i === 0
              ? {
                  ...s,
                  status: t.status ?? s.status,
                  awb_code: t.awb ?? s.awb_code,
                  courier_name: t.courier ?? s.courier_name,
                  tracking_url: t.trackingUrl ?? s.tracking_url,
                }
              : s
          )
        }
        return next
      })
    }
    socket.on('order_update', onUpdate)
    socket.on('order_status_change', onUpdate)
    return () => {
      socket.off('order_update', onUpdate)
      socket.off('order_status_change', onUpdate)
    }
  }, [queryClient])

  const columns = [
    {
      key: 'order_number', label: 'Order Details',
      render: (val, row) => (
        <div>
          <p className="font-bold text-gray-900">#{val}</p>
          <p className="text-xs text-gray-400 font-mono">{row.id}</p>
        </div>
      )
    },
    {
      key: 'delivery_name', label: 'Customer',
      render: (val, row) => (
        <div>
          <p className="font-semibold text-gray-700">{val || 'Customer'}</p>
          <p className="text-xs text-gray-400">{row.delivery_phone}</p>
        </div>
      )
    },
    {
      key: 'item_count', label: 'Items',
      render: (val, row) => (
        <div>
          <p className="text-gray-600">{val ?? '—'} item{val === 1 ? '' : 's'}</p>
          {row.product_names && (
            <p className="text-xs text-gray-400 max-w-[180px] truncate" title={row.product_names}>{row.product_names}</p>
          )}
        </div>
      )
    },
    {
      key: 'shipment_status', label: 'Shipment Status',
      render: (val) => {
        if (!val) return <span className="text-xs text-gray-400">—</span>
        return <StatusBadge status={val} />
      }
    },
    {
      key: 'awb_code', label: 'Tracking',
      render: (val, row) => (
        <div>
          {val ? (
            <>
              <p className="text-xs font-mono text-gray-700">{val}</p>
              <p className="text-xs text-gray-400">{row.courier_name || 'Courier'}</p>
              {row.tracking_url && (
                <a href={row.tracking_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline">
                  Track <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">Not shipped</span>
          )}
        </div>
      )
    },
    { key: 'total', label: 'Total Price', render: (val) => <span className="font-semibold text-gray-900">₹{(parseFloat(val) || 0).toLocaleString('en-IN')}</span> },
    { key: 'status', label: 'Order Status', render: (val) => <StatusBadge status={val} type="order" /> },
    {
      key: 'payment_status', label: 'Payment Status',
      render: (val) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${val === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>{val}</span>
      )
    },
    {
      key: 'created_at', label: 'Order Date',
      render: (val) => new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    {
      key: 'id', label: 'Actions', sortable: false,
      render: (val, row) => (
        <button onClick={() => setDetailId(row.id)}
          className="bg-primary/10 text-primary hover:bg-primary/20 p-2 rounded-lg transition-colors" title="View Order">
          <Eye className="h-4 w-4" />
        </button>
      )
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
    link.download = `orders_${status || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-gray-500 text-sm">View all platform orders with live shipment tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
            <option value="">All Statuses</option>
            <option value="placed">Placed</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search order number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : (
        <DataTable
          columns={columns}
          data={orders}
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

      {detailId && <OrderDetailModal orderId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function OrderDetailModal({ orderId, onClose }) {
  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/admin/${orderId}`)
      return res.data.data
    },
    refetchInterval: 15000
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl w-full max-w-3xl p-6 animate-zoom-in my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Order Details</h3>
            {order && <p className="text-sm text-gray-400">#{order.order_number}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading || !order ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <InfoBox label="Order Status"><StatusBadge status={order.status} /></InfoBox>
              <InfoBox label="Payment">
                <span className="text-sm font-semibold text-gray-800 capitalize">{order.payment_status}</span>
                <span className="text-xs text-gray-400 capitalize">{order.payment_method || ''}</span>
              </InfoBox>
              <InfoBox label="Total"><span className="text-base font-bold text-primary">₹{(parseFloat(order.total) || 0).toLocaleString('en-IN')}</span></InfoBox>
              <InfoBox label="Customer"><span className="text-sm font-semibold text-gray-800">{order.customer_name || '—'}</span></InfoBox>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Items ({order.items?.length || 0})</h4>
              <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
                {order.items?.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3">
                    <img src={item.product_image} alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-cover bg-gray-50" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-400">{item.vendor_name || 'Vendor'} · Qty {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</p>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Shipment & Tracking</h4>
              {(order.shipments?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {order.shipments.map(s => (
                    <div key={s.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={s.status} />
                          <span className="text-sm font-mono text-gray-700">{s.awb_code || 'No AWB'}</span>
                          <span className="text-xs text-gray-400">{s.courier_name || 'Courier'}</span>
                        </div>
                        {s.tracking_url && (
                          <a href={s.tracking_url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                            Track Package <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      {(s.estimated_delivery || s.awb_code) && (
                        <p className="text-xs text-gray-400 mt-1">
                          {s.estimated_delivery ? `Expected: ${new Date(s.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-3">No shipment created yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InfoBox({ label, children }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
