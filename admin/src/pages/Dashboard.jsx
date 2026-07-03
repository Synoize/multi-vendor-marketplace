import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  IndianRupee, ShoppingCart, Users, Store, Package,
  TrendingUp, Clock, ChevronRight, AlertCircle, Star,
} from 'lucide-react';
import api from '../lib/axios';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import Spinner from '../components/ui/Spinner';

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

function formatCurrency(val) {
  if (val === undefined || val === null) return '—';
  const num = Number(val);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name.toLowerCase().includes('revenue') ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/admin/dashboard');
      return res.data?.data || res.data || {};
    },
  });

  const kpis = data?.kpis || {};
  const revenueChart = data?.monthly_revenue || [];
  const ordersByStatus = data?.orders_by_status || [];
  const topVendors = data?.top_vendors || [];
  const recentOrders = data?.recent_orders || [];

  return (
    <>
      <Helmet><title>Dashboard — Damini Admin</title></Helmet>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5">Welcome back — here's what's happening today</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(kpis.total_revenue)} icon={IndianRupee} color="blue" loading={isLoading} change={kpis.revenue_change} />
          <StatCard title="Total Orders" value={isLoading ? '—' : (kpis.total_orders || 0).toLocaleString()} icon={ShoppingCart} color="orange" loading={isLoading} change={kpis.orders_change} />
          <StatCard title="Total Users" value={isLoading ? '—' : (kpis.total_users || 0).toLocaleString()} icon={Users} color="green" loading={isLoading} change={kpis.users_change} />
          <StatCard title="Active Vendors" value={isLoading ? '—' : (kpis.total_vendors || 0).toLocaleString()} icon={Store} color="purple" loading={isLoading} />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Products" value={isLoading ? '—' : (kpis.total_products || 0).toLocaleString()} icon={Package} color="cyan" loading={isLoading} />
          <StatCard title="Today's Orders" value={isLoading ? '—' : (kpis.today_orders || 0).toLocaleString()} icon={TrendingUp} color="yellow" loading={isLoading} />
          <StatCard title="Today's Revenue" value={formatCurrency(kpis.today_revenue)} icon={IndianRupee} color="pink" loading={isLoading} />
          <StatCard title="Avg Order Value" value={formatCurrency(kpis.avg_order_value)} icon={ShoppingCart} color="red" loading={isLoading} />
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/vendors?status=pending')}
            className="flex items-center justify-between p-4 glass-card border border-yellow-500/20 hover:bg-yellow-500/5 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pending Vendors</p>
                <p className="text-xs text-gray-400">Awaiting KYC approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-lg font-bold text-yellow-400">{kpis.pending_vendors || 0}</span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </button>
          <button
            onClick={() => navigate('/products?status=pending')}
            className="flex items-center justify-between p-4 glass-card border border-blue-500/20 hover:bg-blue-500/5 transition-all duration-200 text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Pending Products</p>
                <p className="text-xs text-gray-400">Awaiting review</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-lg font-bold text-blue-400">{kpis.pending_products || 0}</span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
            </div>
          </button>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Revenue Area Chart */}
          <div className="lg:col-span-2 glass-card p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-white">Monthly Revenue</h3>
                <p className="text-xs text-gray-500 mt-0.5">Revenue trend for the last 12 months</p>
              </div>
            </div>
            {isLoading ? (
              <div className="h-60 bg-white/5 rounded-xl animate-pulse" />
            ) : revenueChart.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-500 text-sm">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={revenueChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#revenueGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#f59e0b" fill="url(#ordersGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders by Status Pie Chart */}
          <div className="glass-card p-5">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-white">Orders by Status</h3>
              <p className="text-xs text-gray-500 mt-0.5">Current distribution</p>
            </div>
            {isLoading ? (
              <div className="h-60 bg-white/5 rounded-xl animate-pulse" />
            ) : ordersByStatus.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-500 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {ordersByStatus.map((entry, index) => (
                      <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#9ca3af', fontSize: '11px' }}>{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bottom Row: Top Vendors + Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Vendors */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Top Vendors</h3>
              <button onClick={() => navigate('/vendors')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : topVendors.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No vendor data</p>
            ) : (
              <div className="space-y-2">
                {topVendors.slice(0, 5).map((v, idx) => (
                  <div
                    key={v._id || idx}
                    onClick={() => navigate(`/vendors/${v._id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                  >
                    <span className="text-xs font-bold text-gray-600 w-5">{idx + 1}</span>
                    <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                      <span className="text-xs font-bold text-blue-400">
                        {v.store_name?.charAt(0)?.toUpperCase() || 'V'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{v.store_name}</p>
                      <p className="text-xs text-gray-500">{(v.orders || 0).toLocaleString()} orders</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-yellow-400">
                      <Star className="w-3 h-3 fill-yellow-400" />
                      {(v.rating || 0).toFixed(1)}
                    </div>
                    <div className="text-xs font-semibold text-emerald-400">{formatCurrency(v.revenue)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Recent Orders</h3>
              <button onClick={() => navigate('/orders')} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No recent orders</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.slice(0, 6).map((order, idx) => (
                  <div
                    key={order._id || idx}
                    onClick={() => navigate('/orders')}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">#{order.order_number || order._id?.slice(-6)}</p>
                        <StatusBadge status={order.status || 'pending'} />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {order.customer_name || order.user?.name || 'Customer'} · {order.items_count || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(order.total)}</p>
                      <p className="text-xs text-gray-600">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
