import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Star,
  IndianRupee,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useDashboardStore } from "../store/dashboardStore";
import StatCard from "../components/ui/StatCard";
import StatusBadge from "../components/ui/StatusBadge";
import DataTable from "../components/ui/DataTable";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

const PIE_COLORS = ["#2874F0", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-gray-900">
          ₹{Number(payload[0].value).toLocaleString("en-IN")}
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const fetchDashboard = useDashboardStore((state) => state.fetchDashboard);
  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor-dashboard"],
    queryFn: () => fetchDashboard(),
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to load dashboard data",
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to Load Dashboard"
        description="We couldn't fetch your dashboard data. Please refresh the page."
        ctaLabel="Retry"
        onCta={() => window.location.reload()}
      />
    );
  }

  const stats = data?.stats || {};
  const monthlyRevenue = data?.monthly_revenue || data?.monthlyRevenue || [];
  const recentOrders = data?.recent_orders || data?.recentOrders || [];
  const lowStockProducts =
    data?.low_stock_products || data?.lowStockProducts || [];
  const orderStatusBreakdown =
    data?.order_status_breakdown || data?.orderStatusBreakdown || [];

  const pieData = orderStatusBreakdown.length
    ? orderStatusBreakdown
    : [
        { name: "Placed", value: stats.placed_orders || 0 },
        { name: "Processing", value: stats.processing_orders || 0 },
        { name: "Shipped", value: stats.shipped_orders || 0 },
        { name: "Delivered", value: stats.delivered_orders || 0 },
        { name: "Cancelled", value: stats.cancelled_orders || 0 },
      ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Total Revenue"
          value={`₹${Number(stats.total_revenue || 0).toLocaleString("en-IN")}`}
          icon={IndianRupee}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          trend={stats.revenue_trend}
          trendLabel="vs last month"
        />
        <StatCard
          label="Total Orders"
          value={stats.total_orders || 0}
          icon={ShoppingCart}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          trend={stats.orders_trend}
          trendLabel="vs last month"
        />
        <StatCard
          label="Active Orders"
          value={stats.active_orders || 0}
          icon={Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Products"
          value={stats.total_products || 0}
          icon={Package}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Rating"
          value={`${Number(stats.avg_rating || 0).toFixed(1)} ★`}
          icon={Star}
          iconBg="bg-yellow-50"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Monthly Revenue Line Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Monthly Revenue
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">Last 12 months</p>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold">
              <TrendingUp className="w-4 h-4" />
              Overview
            </div>
          </div>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={monthlyRevenue}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2874F0"
                  strokeWidth={2.5}
                  dot={{ fill: "#2874F0", r: 4 }}
                  activeDot={{ r: 6, fill: "#2874F0" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No revenue data available yet
            </div>
          )}
        </div>

        {/* Order Status Donut */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h2 className="text-base font-bold text-gray-900">Order Status</h2>
            <p className="text-sm text-gray-500 mt-0.5">Breakdown by status</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
                <Tooltip
                  formatter={(value, name) => [`${value} orders`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
              No order data available
            </div>
          )}
        </div>
      </div>

      {/* Recent Orders + Low Stock row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Orders table */}
        <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Recent Orders</h2>
            <a
              href="/orders"
              className="text-sm text-primary font-semibold hover:underline"
            >
              View all
            </a>
          </div>
          <DataTable
            columns={[
              {
                key: "order_number",
                label: "Order",
                sortable: true,
                render: (_, order) => (
                  <span className="font-semibold text-gray-900">
                    #{order.order_number || order.orderNumber}
                  </span>
                ),
              },
              {
                key: "customer_name",
                label: "Customer",
                sortable: true,
                render: (_, order) => (
                  <div>
                    <p className="font-medium text-gray-800">
                      {order.customer?.name || order.user?.name || "N/A"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {order.customer?.email || order.user?.email || ""}
                    </p>
                  </div>
                ),
              },
              {
                key: "total",
                label: "Total",
                sortable: true,
                render: (_, order) => (
                  <span className="font-semibold text-gray-900">
                    ₹
                    {Number(
                      order.total || order.total_amount || 0,
                    ).toLocaleString("en-IN")}
                  </span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (_, order) => <StatusBadge status={order.status} />,
              },
            ]}
            data={recentOrders}
            loading={false}
            emptyMessage="No recent orders yet"
            enableSearch={false}
            enablePagination={false}
            enableExport={false}
            enableColumnVisibility={false}
          />
        </div>

        {/* Low Stock Products */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Low Stock</h2>
            <a
              href="/products"
              className="text-sm text-primary font-semibold hover:underline"
            >
              View all
            </a>
          </div>
          <DataTable
            columns={[
              {
                key: "name",
                label: "Product",
                sortable: true,
                render: (_, product) => (
                  <div className="flex items-center gap-3">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        SKU: {product.sku || "—"}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                key: "stock",
                label: "Stock",
                render: (_, product) => (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      (product.stock || product.quantity) === 0
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {product.stock ?? product.quantity ?? 0} left
                  </span>
                ),
              },
            ]}
            data={lowStockProducts}
            loading={false}
            emptyMessage="All products are well-stocked!"
            enableSearch={false}
            enablePagination={false}
            enableExport={false}
            enableColumnVisibility={false}
          />
        </div>
      </div>
    </div>
  );
}
