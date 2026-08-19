import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import DataTable from "../components/ui/DataTable";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import {
  Check,
  X,
  Ban,
  Search,
  ShieldCheck,
  Star,
  Download,
} from "lucide-react";

export default function Products() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [blockTarget, setBlockTarget] = useState(null);
  const [unblockTarget, setUnblockTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products", activeTab, search, page, pageSize, sorting],
    queryFn: async () => {
      const statusParam = activeTab ? `&status=${activeTab}` : "";
      const searchParam = search ? `&search=${search}` : "";
      const sortParam =
        sorting.length > 0
          ? `&sort_by=${sorting[0].id}&sort_order=${sorting[0].desc ? "desc" : "asc"}`
          : "";
      const res = await api.get(
        `/admin/products?page=${page}&limit=${pageSize}${statusParam}${searchParam}${sortParam}`,
      );
      return { products: res.data.data || [], total: res.data.total || 0 };
    },
  });

  const products = data?.products || [];
  const total = data?.total || 0;

  const approveMutation = useMutation({
    mutationFn: async (id) => api.patch(`/products/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product approved successfully");
    },
    onError: () => toast.error("Failed to approve product"),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }) =>
      api.patch(`/products/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product rejected successfully");
      setRejectModal(null);
      setRejectReason("");
    },
    onError: () => toast.error("Failed to reject product"),
  });

  const blockMutation = useMutation({
    mutationFn: async (id) => api.patch(`/products/${id}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product blocked successfully");
    },
    onError: () => toast.error("Failed to block product"),
  });

  const unblockMutation = useMutation({
    mutationFn: async (id) => api.patch(`/products/${id}/unblock`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product unblocked successfully");
    },
    onError: () => toast.error("Failed to unblock product"),
  });

  const featureMutation = useMutation({
    mutationFn: async ({ id, featured }) =>
      api.patch(`/products/${id}/feature`, { featured: !featured }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Featured status updated");
    },
    onError: () => toast.error("Failed to update featured status"),
  });

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    rejectMutation.mutate({ id: rejectModal, reason: rejectReason });
  };

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <img
            src={
              row.primary_image || `https://picsum.photos/seed/${row.id}/100`
            }
            alt=""
            className="h-10 w-10 object-contain bg-gray-50 border border-gray-100 rounded-lg"
          />
          <div className="min-w-0 max-w-xs">
            <p className="font-semibold text-gray-900 truncate">{row.name}</p>
            <p className="text-xs text-gray-400">SKU: {row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "store_name",
      label: "Vendor Store",
      render: (val) => <span className="text-gray-500">{val || "\u2014"}</span>,
    },
    {
      key: "category_name",
      label: "Category",
      render: (val) => <span className="text-gray-500">{val || "\u2014"}</span>,
    },
    {
      key: "price",
      label: "Price",
      render: (val) => (
        <span className="font-semibold text-gray-900">
          {"\u20B9"}
          {parseFloat(val).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      render: (val) => <span className="text-gray-500">{val ?? "\u2014"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} type="product" />,
    },
    {
      key: "id",
      label: "Actions",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === "pending" && (
            <>
              <button
                onClick={() => approveMutation.mutate(row.id)}
                className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setRejectModal(row.id)}
                className="bg-red-50 text-red-500 hover:bg-red-100 p-2 rounded-lg transition-colors"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === "active" && (
            <>
              <button
                onClick={() =>
                  featureMutation.mutate({
                    id: row.id,
                    featured: row.is_featured,
                  })
                }
                className={`p-2 rounded-lg transition-colors ${row.is_featured ? "bg-yellow-50 text-yellow-600 hover:bg-yellow-100" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                title={
                  row.is_featured
                    ? "Remove from homepage Featured"
                    : "Feature on homepage"
                }
              >
                <Star
                  className={`h-4 w-4 ${row.is_featured ? "fill-yellow-400" : ""}`}
                />
              </button>
              <button
                onClick={() => setBlockTarget(row)}
                className="bg-gray-100 text-gray-500 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                title="Block"
              >
                <Ban className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === "blocked" && (
            <button
              onClick={() => setUnblockTarget(row)}
              className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors"
              title="Unblock"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleExport = (tableData) => {
    if (!tableData.length) return;
    const exportCols = columns.filter((c) => c.sortable !== false);
    const headers = exportCols.map((c) => c.label).join(",");
    const rows = tableData.map((row) =>
      exportCols
        .map((c) => {
          const s = String(row[c.key] ?? "");
          return s.includes(",") ? `"${s}"` : s;
        })
        .join(","),
    );
    const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `products_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Product Approvals
          </h1>
          <p className="text-sm text-gray-500">
            Review vendor products and manage listings
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-300 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1 inline-flex gap-1 overflow-x-auto scrollbar-hide">
        {[
          { id: "pending", label: "Pending Approval" },
          { id: "active", label: "Active Listings" },
          { id: "rejected", label: "Rejected" },
          { id: "blocked", label: "Blocked" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-5 py-2.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-red-500 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={products}
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
      )}

      <ConfirmDialog
        isOpen={!!rejectModal}
        onClose={() => {
          setRejectModal(null);
          setRejectReason("");
        }}
        onConfirm={handleRejectSubmit}
        loading={rejectMutation.isPending}
        title="Reject Product Listing"
        message="Provide a feedback reason so the vendor can rectify and resubmit."
        confirmLabel={rejectMutation.isPending ? "Saving..." : "Reject Product"}
        variant="danger"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rejection Reason *
          </label>
          <textarea
            required
            rows={3}
            placeholder="Describe why this product is being rejected..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-red-300 resize-none transition-colors"
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={!!blockTarget}
        onClose={() => setBlockTarget(null)}
        onConfirm={() => {
          blockMutation.mutate(blockTarget.id);
          setBlockTarget(null);
        }}
        loading={blockMutation.isPending}
        title="Block Product"
        message={`Are you sure you want to block "${blockTarget?.name}"? It will be hidden from the customer storefront.`}
        confirmLabel="Block"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!unblockTarget}
        onClose={() => setUnblockTarget(null)}
        onConfirm={() => {
          unblockMutation.mutate(unblockTarget.id);
          setUnblockTarget(null);
        }}
        loading={unblockMutation.isPending}
        title="Unblock Product"
        message={`Are you sure you want to unblock "${unblockTarget?.name}"? It will become visible again on the storefront.`}
        confirmLabel="Unblock"
        variant="primary"
      />
    </div>
  );
}
