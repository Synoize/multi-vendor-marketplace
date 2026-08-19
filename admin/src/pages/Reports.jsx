import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import {
  FileText,
  Download,
  TrendingUp,
  ShoppingBag,
  Users as UsersIcon,
  Megaphone,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend,
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState("sales");
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);

  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ["admin-reports-sales", from, to],
    queryFn: async () => {
      const res = await api.get(`/reports/sales?from=${from}&to=${to}`);
      return res.data.data || [];
    },
    enabled: activeTab === "sales",
  });

  const { data: vendorsData = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ["admin-reports-vendors"],
    queryFn: async () => {
      const res = await api.get("/reports/vendors");
      return res.data.data || [];
    },
    enabled: activeTab === "vendors",
  });

  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-reports-users"],
    queryFn: async () => {
      const res = await api.get("/reports/users");
      return res.data.data || [];
    },
    enabled: activeTab === "users",
  });

  const { data: adsData = [], isLoading: adsLoading } = useQuery({
    queryKey: ["admin-reports-ads"],
    queryFn: async () => {
      const res = await api.get("/reports/ads");
      return res.data.data || [];
    },
    enabled: activeTab === "ads",
  });

  const downloadCSV = (filename, data) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((val) => {
          if (typeof val === "string") return `"${val.replace(/"/g, '""')}"`;
          return val;
        })
        .join(","),
    );
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const chartTooltipConfig = {
    backgroundColor: "#fff",
    titleColor: "#111827",
    bodyColor: "#6b7280",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    cornerRadius: 12,
    padding: 12,
  };

  const tableMRTProps = {
    enableColumnActions: false,
    enableColumnFilters: false,
    enableSorting: false,
    enableHiding: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    muiTablePaperProps: {
      elevation: 0,
      sx: { border: "none", background: "transparent" },
    },
    muiTableHeadCellProps: {
      sx: {
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "#6b7280",
        borderBottom: "1px solid #f3f4f6",
        background: "#fafafa",
        padding: "12px 16px",
      },
    },
    muiTableBodyCellProps: {
      sx: {
        borderBottom: "1px solid #f3f4f6",
        padding: "12px 16px",
        fontSize: "14px",
      },
    },
    muiTableBodyProps: {
      sx: { "& tr:hover": { backgroundColor: "#f9fafb !important" } },
    },
  };

  const salesTableColumns = [
    {
      accessorKey: "date",
      header: "Date",
      Cell: ({ cell }) => (
        <span className="font-mono text-xs text-gray-700">
          {new Date(cell.getValue()).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    { accessorKey: "orders", header: "Orders" },
    {
      accessorKey: "discounts",
      header: "Discounts",
      Cell: ({ cell }) => (
        <span className="text-red-500 font-medium">
          ₹{parseFloat(cell.getValue() || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "revenue",
      header: "Revenue",
      Cell: ({ cell }) => (
        <span className="font-bold text-gray-900">
          ₹{parseFloat(cell.getValue() || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  const vendorsTableColumns = [
    {
      accessorKey: "store_name",
      header: "Store Name",
      Cell: ({ cell }) => (
        <span className="font-semibold text-gray-900">{cell.getValue()}</span>
      ),
    },
    {
      accessorKey: "kyc_status",
      header: "KYC Status",
      Cell: ({ cell }) => (
        <span className="uppercase text-xs text-gray-500">
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "total_sales",
      header: "Total Sales",
      Cell: ({ cell }) => (
        <span className="font-bold text-gray-900">
          ₹{parseFloat(cell.getValue() || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    { accessorKey: "orders", header: "Orders" },
    {
      accessorKey: "commission",
      header: "Commission Paid",
      Cell: ({ cell }) => (
        <span className="text-emerald-600 font-bold">
          ₹{parseFloat(cell.getValue() || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  const adsTableColumns = [
    {
      accessorKey: "name",
      header: "Campaign",
      Cell: ({ cell }) => (
        <span className="font-semibold text-gray-900">{cell.getValue()}</span>
      ),
    },
    { accessorKey: "store_name", header: "Store" },
    {
      id: "impressions_clicks",
      header: "Impressions / Clicks",
      accessorFn: (row) => `${row.impressions} / ${row.clicks}`,
      Cell: ({ row }) => (
        <div className="text-xs text-gray-500">
          <p>
            <span className="font-bold text-gray-900">
              {row.original.impressions}
            </span>{" "}
            Imps
          </p>
          <p>
            <span className="font-bold text-gray-900">
              {row.original.clicks}
            </span>{" "}
            Clicks
          </p>
        </div>
      ),
    },
    {
      id: "spent_budget",
      header: "Spent / Budget",
      accessorFn: (row) => `${row.spent} / ${row.total_budget}`,
      Cell: ({ row }) => (
        <div className="text-xs text-gray-500">
          <p>
            Spent:{" "}
            <span className="font-bold text-red-500">
              ₹{parseFloat(row.original.spent).toFixed(0)}
            </span>
          </p>
          <p>
            Limit:{" "}
            <span className="font-bold text-gray-900">
              ₹{parseFloat(row.original.total_budget).toFixed(0)}
            </span>
          </p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      Cell: ({ cell }) => (
        <span className="uppercase text-xs text-gray-500">
          {cell.getValue()}
        </span>
      ),
    },
  ];

  const salesTable = useMaterialReactTable({
    columns: salesTableColumns,
    data: salesData,
    ...tableMRTProps,
  });
  const vendorsTable = useMaterialReactTable({
    columns: vendorsTableColumns,
    data: vendorsData,
    ...tableMRTProps,
  });
  const adsTable = useMaterialReactTable({
    columns: adsTableColumns,
    data: adsData,
    ...tableMRTProps,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Platform Reports
          </h1>
          <p className="text-gray-500 text-sm">
            Download analytical sales, vendor, user, and ad data
          </p>
        </div>

        {activeTab === "sales" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-400"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-red-400"
            />
          </div>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {[
          {
            id: "sales",
            label: "Sales Report",
            icon: <TrendingUp className="h-4 w-4" />,
          },
          {
            id: "vendors",
            label: "Vendor Performance",
            icon: <ShoppingBag className="h-4 w-4" />,
          },
          {
            id: "users",
            label: "User Registrations",
            icon: <UsersIcon className="h-4 w-4" />,
          },
          {
            id: "ads",
            label: "Sponsored Ads",
            icon: <Megaphone className="h-4 w-4" />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? "bg-red-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "sales" && (
        <div className="space-y-6">
          {salesLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : salesData.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="h-10 w-10 text-gray-400" />}
              title="No data found"
              description="No sales data found for the selected dates."
            />
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 text-sm">
                    Revenue Trend
                  </h3>
                  <button
                    onClick={() =>
                      downloadCSV(
                        `sales_report_${from}_to_${to}.csv`,
                        salesData,
                      )
                    }
                    className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" /> Download CSV
                  </button>
                </div>
                <div className="h-72">
                  <Line
                    data={{
                      labels: salesData.map((d) => d.date),
                      datasets: [
                        {
                          label: "Revenue",
                          data: salesData.map((d) => d.revenue),
                          borderColor: "#ef4444",
                          backgroundColor: "rgba(239,68,68,0.08)",
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4,
                          pointRadius: 0,
                          pointHitRadius: 10,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: { mode: "index", intersect: false },
                      plugins: {
                        legend: { display: false },
                        tooltip: chartTooltipConfig,
                      },
                      scales: {
                        x: {
                          grid: { display: false },
                          ticks: { color: "#9ca3af", font: { size: 10 } },
                          border: { display: false },
                        },
                        y: {
                          grid: { color: "#f3f4f6" },
                          ticks: { color: "#9ca3af", font: { size: 10 } },
                          border: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <MaterialReactTable table={salesTable} />
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="space-y-6">
          {vendorsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : vendorsData.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-10 w-10 text-gray-400" />}
              title="No vendors"
              description="No vendor performance data available."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">
                  Vendor Rankings
                </h3>
                <button
                  onClick={() =>
                    downloadCSV("vendor_performance.csv", vendorsData)
                  }
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
              <MaterialReactTable table={vendorsTable} />
            </div>
          )}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : usersData.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="h-10 w-10 text-gray-400" />}
              title="No user data"
              description="No user registrations in the last 30 days."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-sm">
                  User Registration Growth
                </h3>
                <button
                  onClick={() =>
                    downloadCSV("user_registrations.csv", usersData)
                  }
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
              <div className="h-72">
                <Line
                  data={{
                    labels: usersData.map((d) => d.date),
                    datasets: [
                      {
                        label: "New Users",
                        data: usersData.map((d) => d.new_users),
                        borderColor: "#f97316",
                        backgroundColor: "rgba(249,115,22,0.08)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHitRadius: 10,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: { display: false },
                      tooltip: chartTooltipConfig,
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: "#9ca3af", font: { size: 10 } },
                        border: { display: false },
                      },
                      y: {
                        grid: { color: "#f3f4f6" },
                        ticks: { color: "#9ca3af", font: { size: 10 } },
                        border: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "ads" && (
        <div className="space-y-6">
          {adsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : adsData.length === 0 ? (
            <EmptyState
              icon={<Megaphone className="h-10 w-10 text-gray-400" />}
              title="No campaigns"
              description="No sponsorship campaign metrics found."
            />
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">
                  Campaign CTR & Spend
                </h3>
                <button
                  onClick={() =>
                    downloadCSV("campaign_performance.csv", adsData)
                  }
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-xs font-semibold"
                >
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </button>
              </div>
              <MaterialReactTable table={adsTable} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
