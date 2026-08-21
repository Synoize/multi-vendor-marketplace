import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  IndianRupee,
  ShoppingCart,
  Users,
  Store,
  TrendingUp,
  Clock,
  ChevronRight,
  AlertCircle,
  Star,
  ShoppingBasket,
} from "lucide-react";
import api from "../lib/axios";
import Spinner from "../components/ui/Spinner";
import DataTable from "../components/ui/DataTable";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  ChartTooltip,
  Legend,
);

function formatCurrency(val) {
  if (val === undefined || val === null) return "—";
  const num = Number(val);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

const kpiConfig = [
  {
    key: "total_revenue",
    label: "Total Revenue",
    icon: IndianRupee,
    bg: "bg-blue-50",
    text: "text-blue-600",
    format: formatCurrency,
  },
  {
    key: "total_orders",
    label: "Total Orders",
    icon: ShoppingCart,
    bg: "bg-orange-50",
    text: "text-orange-600",
    format: (v) => (v || 0).toLocaleString(),
  },
  {
    key: "total_users",
    label: "Total Users",
    icon: Users,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    format: (v) => (v || 0).toLocaleString(),
  },
  {
    key: "total_vendors",
    label: "Active Vendors",
    icon: Store,
    bg: "bg-purple-50",
    text: "text-purple-600",
    format: (v) => (v || 0).toLocaleString(),
  },
  {
    key: "total_products",
    label: "Total Products",
    icon: ShoppingBasket,
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    format: (v) => (v || 0).toLocaleString(),
  },
  {
    key: "today_orders",
    label: "Today's Orders",
    icon: TrendingUp,
    bg: "bg-amber-50",
    text: "text-amber-600",
    format: (v) => (v || 0).toLocaleString(),
  },
  {
    key: "today_revenue",
    label: "Today's Revenue",
    icon: IndianRupee,
    bg: "bg-pink-50",
    text: "text-pink-600",
    format: formatCurrency,
  },
  {
    key: "avg_order_value",
    label: "Avg Order Value",
    icon: ShoppingCart,
    bg: "bg-rose-50",
    text: "text-rose-600",
    format: formatCurrency,
  },
];

const PIE_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/admin/dashboard");
      return res.data?.data || res.data || {};
    },
  });

  const users = data?.users || {};
  const vendors = data?.vendors || {};
  const products = data?.products || {};
  const orders = data?.orders || {};
  const revenue = data?.revenue || {};
  const recentOrders = data?.recentOrders || [];
  const topVendors = data?.topVendors || [];
  const monthlyRevenue = data?.monthlyRevenue || [];

  const kpis = {
    total_users: users.total || 0,
    total_vendors: vendors.total || 0,
    total_products: products.total || 0,
    total_orders: orders.total || 0,
    today_orders: orders.today || 0,
    total_revenue: revenue.total_revenue || 0,
    today_revenue: revenue.today_revenue || 0,
    pending_vendors: vendors.pending || 0,
    pending_products: products.pending_approval || 0,
  };

  const revenueChart = monthlyRevenue.map((m) => ({
    month: m.month,
    revenue: m.revenue || 0,
    orders: m.orders || 0,
  }));

  const revenueChartData = {
    labels: revenueChart.map((d) => d.month),
    datasets: [
      {
        label: "Revenue",
        data: revenueChart.map((d) => d.revenue),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
      },
      {
        label: "Orders",
        data: revenueChart.map((d) => d.orders),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.08)",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
      },
    ],
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          padding: 16,
          color: "#6b7280",
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#111827",
        bodyColor: "#6b7280",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: {
          label: (ctx) =>
            ctx.dataset.label.toLowerCase().includes("revenue")
              ? `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
              : `${ctx.dataset.label}: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#9ca3af", font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: "#f3f4f6" },
        ticks: {
          color: "#9ca3af",
          font: { size: 11 },
          callback: (v) => formatCurrency(v),
        },
        border: { display: false },
      },
    },
  };

  const ordersByStatus = [];
  if (orders.delivered)
    ordersByStatus.push({ status: "Delivered", count: orders.delivered });
  if (orders.cancelled)
    ordersByStatus.push({ status: "Cancelled", count: orders.cancelled });
  if (orders.total) {
    const other =
      orders.total - (orders.delivered || 0) - (orders.cancelled || 0);
    if (other > 0) ordersByStatus.push({ status: "Other", count: other });
  }

  const pieChartData = {
    labels: ordersByStatus.map((d) => d.status),
    datasets: [
      {
        data: ordersByStatus.map((d) => d.count),
        backgroundColor: PIE_COLORS.slice(0, ordersByStatus.length),
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "60%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          padding: 12,
          color: "#6b7280",
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: "#fff",
        titleColor: "#111827",
        bodyColor: "#6b7280",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
      },
    },
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - The Damini Edit</title>
      </Helmet>
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Welcome back — here's what's happening today
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
            <Clock strokeWidth={1.5} className="w-4 h-4" />
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiConfig.map(({ key, label, icon: Icon, bg, text, format }) => (
            <div
              key={key}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {isLoading ? (
                <div className="space-y-3 animate-pulse">
                  <div className={`w-10 h-10 ${bg} rounded-xl`} />
                  <div className="h-4 bg-gray-100 rounded w-20" />
                  <div className="h-6 bg-gray-100 rounded w-16" />
                </div>
              ) : (
                <>
                  <div
                    className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}
                  >
                    <Icon strokeWidth={1.5} className={`w-5 h-5 ${text}`} />
                  </div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    {label}
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {format(kpis[key])}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/vendors?status=pending")}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all duration-200 text-left group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertCircle
                  strokeWidth={1.5}
                  className="w-5 h-5 text-amber-500"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Pending Vendors
                </p>
                <p className="text-xs text-gray-400">Awaiting KYC approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-lg font-bold text-amber-500">
                  {kpis.pending_vendors || 0}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" />
            </div>
          </button>
          <button
            onClick={() => navigate("/products?status=pending")}
            className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200 text-left group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <ShoppingBasket
                  strokeWidth={1.5}
                  className="w-5 h-5 text-blue-500"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Pending Products
                </p>
                <p className="text-xs text-gray-400">Awaiting review</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Spinner size="sm" />
              ) : (
                <span className="text-lg font-bold text-blue-500">
                  {kpis.pending_products || 0}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
          </button>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Monthly Revenue
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Revenue trend for the last 12 months
                </p>
              </div>
            </div>
            {isLoading ? (
              <div className="h-60 bg-gray-50 rounded-xl animate-pulse" />
            ) : revenueChart.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            ) : (
              <div className="h-60">
                <Line data={revenueChartData} options={revenueChartOptions} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Orders by Status
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Current distribution
              </p>
            </div>
            {isLoading ? (
              <div className="h-60 bg-gray-50 rounded-xl animate-pulse" />
            ) : ordersByStatus.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
                No data
              </div>
            ) : (
              <div className="h-60">
                <Doughnut data={pieChartData} options={pieChartOptions} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Top Vendors
              </h3>
              <button
                onClick={() => navigate("/vendors")}
                className="text-xs text-secondary-800 hover:text-secondary-900 font-medium flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <DataTable
              columns={[
                {
                  key: "rank",
                  label: "#",
                  sortable: false,
                  render: (_val, row) => (
                    <span className="text-xs font-bold text-gray-300">
                      {topVendors.indexOf(row) + 1}
                    </span>
                  ),
                },
                {
                  key: "store_name",
                  label: "Vendor",
                  render: (_val, row) => (
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => navigate(`/vendors/${row._id}`)}
                    >
                      <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-100">
                        <span className="text-xs font-bold text-blue-500">
                          {row.store_name?.charAt(0)?.toUpperCase() || "V"}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {row.store_name}
                      </span>
                    </div>
                  ),
                },
                {
                  key: "orders",
                  label: "Orders",
                  render: (val) => (val || 0).toLocaleString(),
                },
                {
                  key: "rating",
                  label: "Rating",
                  render: (val) => (
                    <span className="flex items-center gap-1 text-xs text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {(Number(val) || 0).toFixed(1)}
                    </span>
                  ),
                },
                {
                  key: "revenue",
                  label: "Revenue",
                  render: (val) => (
                    <span className="text-xs font-semibold text-emerald-600">
                      {formatCurrency(val)}
                    </span>
                  ),
                },
              ]}
              data={topVendors.slice(0, 5)}
              loading={isLoading}
              emptyMessage="No vendor data"
              enablePagination={false}
              enableSearch={false}
              enableExport={false}
              enableColumnVisibility={false}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Recent Orders
              </h3>
              <button
                onClick={() => navigate("/orders")}
                className="text-xs text-secondary-800 hover:text-secondary-900 font-medium flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <DataTable
              columns={[
                {
                  key: "order_number",
                  label: "Order",
                  render: (_val, row) => (
                    <span className="text-sm font-semibold text-gray-900">
                      #{row.order_number || row._id?.slice(-6)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  render: (val) => (
                    <StatusBadgeInline status={val || "pending"} />
                  ),
                },
                {
                  key: "customer_name",
                  label: "Customer",
                  render: (_val, row) => (
                    <span className="text-xs text-gray-400 truncate">
                      {row.customer_name || row.user?.name || "Customer"} ·{" "}
                      {row.items_count || 0} items
                    </span>
                  ),
                },
                {
                  key: "total",
                  label: "Total",
                  render: (val) => (
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(val)}
                    </span>
                  ),
                },
                {
                  key: "date",
                  label: "Date",
                  sortable: false,
                  render: (_val, row) => (
                    <span className="text-xs text-gray-400">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  ),
                },
              ]}
              data={recentOrders.slice(0, 6)}
              loading={isLoading}
              emptyMessage="No recent orders"
              enablePagination={false}
              enableSearch={false}
              enableExport={false}
              enableColumnVisibility={false}
              onRowClick={() => navigate("/orders")}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function StatusBadgeInline({ status }) {
  const styles = {
    placed: "bg-blue-50 text-blue-600 border-blue-100",
    confirmed: "bg-indigo-50 text-indigo-600 border-indigo-100",
    processing: "bg-amber-50 text-amber-600 border-amber-100",
    shipped: "bg-purple-50 text-purple-600 border-purple-100",
    delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
    cancelled: "bg-red-50 text-red-600 border-red-100",
    pending: "bg-gray-50 text-gray-600 border-gray-100",
  };
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}
