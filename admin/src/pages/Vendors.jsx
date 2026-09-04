import { useState } from "react";
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Store, RefreshCw, Download } from "lucide-react";
import api from "../lib/axios";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending KYC" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "suspended", label: "Suspended" },
];

export default function Vendors() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sorting, setSorting] = useState([]);
  const status = searchParams.get("status") || "all";
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-vendors", status, search, page, pageSize, sorting],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit: pageSize });
      if (status && status !== "all") params.append("kyc_status", status);
      if (search.trim()) params.append("search", search.trim());
      if (sorting.length > 0) {
        params.append("sort_by", sorting[0].id);
        params.append("sort_order", sorting[0].desc ? "desc" : "asc");
      }
      const res = await api.get(`/admin/vendors?${params}`);
      return res.data?.data || res.data || {};
    },
    placeholderData: keepPreviousData,
  });

  const vendors = data?.vendors || data?.docs || data || [];
  const total = data?.total || data?.totalDocs || 0;
  const totalPages = data?.totalPages || Math.ceil(total / pageSize) || 1;

  const columns = [
    {
      key: "store_name",
      label: "Store",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
            <span className="text-xs font-bold text-blue-500">
              {val?.charAt(0)?.toUpperCase() || "S"}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{val || "—"}</p>
            <p className="text-xs text-gray-400">{row.business_name || ""}</p>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (val) => (
        <span className="text-gray-500 text-sm">{val || "—"}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (val) => (
        <span className="text-gray-500 text-sm">{val || "—"}</span>
      ),
    },
    {
      key: "kyc_status",
      label: "KYC Status",
      render: (val) => <StatusBadge status={val || "not_submitted"} />,
    },
    {
      key: "is_active",
      label: "Active",
      render: (val) => (
        <span
          className={`text-xs font-semibold ${val ? "text-emerald-600" : "text-red-500"}`}
        >
          {val ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Joined",
      render: (val) =>
        val
          ? new Date(val).toLocaleDateString("en-IN", {
              month: "short",
              day: "numeric",
              year: "2-digit",
            })
          : "—",
    },
  ];

  const handleExport = (tableData) => {
    if (!tableData.length) return;
    const headers = columns.map((c) => c.label).join(",");
    const rows = tableData.map((row) =>
      columns
        .map((c) => {
          const val = row[c.key];
          const str = String(val ?? "");
          return str.includes(",") ? `"${str}"` : str;
        })
        .join(","),
    );
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `vendors_${status}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Helmet>
        <title>Vendors — Admin</title>
      </Helmet>
      <div className="space-y-5 animate-fadeIn">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Store className="w-6 h-6 text-gray-400" /> Vendors
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Manage vendors, KYC approvals, and store settings
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries(["admin-vendors"])}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 flex flex-wrap items-center gap-3 shadow-sm">
          <div className="flex items-center gap-2 bg-secondary border rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs focus-within:border-secondary-600 focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none w-full"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setSearchParams({ status: tab.key });
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  status === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isLoading ? "Loading..." : `${total.toLocaleString()} vendors`}
            </p>
          </div>
          <DataTable
            columns={columns}
            data={Array.isArray(vendors) ? vendors : []}
            loading={isLoading}
            emptyMessage="No vendors found"
            onRowClick={(row) => navigate(`/vendors/${row._id || row.id}`)}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={(newPage, newPageSize) => {
              setPage(newPage);
              if (newPageSize !== pageSize) setPageSize(newPageSize);
            }}
            sorting={sorting}
            onSortingChange={setSorting}
            manualPagination
            manualSorting
            enableExport
            enableColumnVisibility
            renderTopToolbarCustomActions={({ table }) => (
              <button
                onClick={() =>
                  handleExport(
                    table
                      .getPrePaginationRowModel()
                      .rows.map((r) => r.original),
                  )
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
          />
        </div>
      </div>
    </>
  );
}
