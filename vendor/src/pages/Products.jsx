import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Package,
  Filter,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useProductStore } from "../store/productStore";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "blocked", label: "Blocked" },
];

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const deleteProduct = useProductStore((state) => state.deleteProduct);
  const toggleStatus = useProductStore((state) => state.toggleStatus);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  const selectedStatus =
    STATUS_OPTIONS.find((opt) => opt.value === statusFilter) ||
    STATUS_OPTIONS[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ["vendor-products", page, pageSize, search, statusFilter],
    queryFn: () => {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      return fetchProducts(params);
    },
    keepPreviousData: true,
  });

  const products =
    data?.products || data?.data?.products || data?.data || data?.items || [];
  const totalCount = data?.total || data?.data?.total || products.length;

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      toast.success("Product deleted successfully");
      queryClient.invalidateQueries(["vendor-products"]);
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to delete product");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }) =>
      toggleStatus(id, status === "active" ? "inactive" : "active"),
    onSuccess: () => {
      toast.success("Product status updated");
      queryClient.invalidateQueries(["vendor-products"]);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Failed to update status");
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handlePageChange = (newPage, newPageSize) => {
    setPage(newPage);
    if (newPageSize) setPageSize(newPageSize);
  };

  const columns = [
    {
      key: "product",
      label: "Product",
      sortable: true,
      render: (_, row) => {
        const stock = row.stock ?? row.quantity ?? 0;
        return (
          <div className="flex items-center gap-3">
            {row.primary_image ||
            row.images?.[0]?.url ||
            row.images?.[0] ? (
              <img
                src={
                  row.primary_image ||
                  row.images[0]?.url ||
                  row.images[0]
                }
                alt={row.name}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 bg-secondary-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Package
                  strokeWidth={1.5}
                  className="w-6 h-6 text-secondary-700"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate max-w-xs">{row.name}</p>
              <p className="text-xs text-secondary-700 mt-0.5">
                SKU: {row.sku || "—"}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-secondary-950">
            ₹{Number(row.price).toLocaleString("en-IN")}
          </p>
          {row.mrp && row.mrp > row.price && (
            <p className="text-xs text-secondary-700 line-through">
              ₹{Number(row.mrp).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "stock",
      label: "Stock",
      sortable: true,
      render: (_, row) => {
        const stock = row.stock ?? row.quantity ?? 0;
        return (
          <span
            className={`text-sm font-medium ${
              stock === 0
                ? "text-red-600"
                : stock < 5
                  ? "text-orange-600"
                  : "text-secondary-800"
            }`}
          >
            {stock}
            {stock < 5 && stock > 0 && (
              <span className="ml-1.5 text-xs font-medium text-orange-500">
                Low
              </span>
            )}
            {stock === 0 && (
              <span className="ml-1.5 text-xs font-medium text-red-500">
                Out
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_, row) => {
        const isBlocked = row.status === "blocked";
        return (
          <>
            <StatusBadge status={row.status || "inactive"} />
            {isBlocked && (
              <p className="text-xs text-red-500 mt-1">
                Blocked by admin — modifications not allowed
              </p>
            )}
          </>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => {
        const isActive = row.status === "active";
        const isBlocked = row.status === "blocked";
        return (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() =>
                toggleMutation.mutate({
                  id: row._id || row.id,
                  status: row.status,
                })
              }
              disabled={isBlocked || toggleMutation.isPending}
              className="p-2 rounded-lg hover:bg-secondary text-secondary-700 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                isBlocked
                  ? "Blocked by admin"
                  : isActive
                    ? "Deactivate"
                    : "Activate"
              }
            >
              {isActive ? (
                <ToggleRight className="w-5 h-5 text-emerald-500" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-secondary-700" />
              )}
            </button>
            <button
              onClick={() =>
                navigate(
                  `/products/${row._id || row.id}/edit`,
                )
              }
              disabled={isBlocked}
              className="p-2 rounded-lg hover:bg-secondary text-secondary-800 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={isBlocked ? "Blocked by admin" : "Edit"}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeleteTarget(row)}
              disabled={isBlocked}
              className="p-2 rounded-lg hover:bg-red-50 text-secondary-800 hover:text-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={isBlocked ? "Blocked by admin" : "Delete"}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to Load Products"
        description="We couldn't fetch your products. Please try again."
        ctaLabel="Retry"
        onCta={() => queryClient.invalidateQueries(["vendor-products"])}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            {totalCount} product{totalCount !== 1 ? "s" : ""} in your store
          </p>
        </div>
        <button
          onClick={() => navigate("/products/add")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Add Product</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-700" />
            <input
              type="text"
              placeholder="Search products by name or SKU…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs border rounded-xl outline-none focus:border-secondary-600 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white text-xs font-medium rounded-xl hover:bg-opacity-90 transition-colors"
          >
            Search
          </button>
        </form>
        <div className="relative">
          <button
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="min-w-40 flex items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 font-medium text-xs shadow-sm transition hover:border-secondary-600"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-secondary-700" />
              <span>{selectedStatus.label}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                isStatusOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isStatusOpen && (
            <div className="absolute right-0 z-50 mt-1 py-1 min-w-40 overflow-hidden rounded-xl border bg-white shadow-sm">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setPage(1);
                    setIsStatusOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-1.5 text-left text-xs transition ${
                    statusFilter === opt.value
                      ? "bg-primary-50 text-primary font-medium"
                      : "hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <DataTable
          columns={columns}
          data={products}
          loading={isLoading}
          emptyMessage={
            search || statusFilter
              ? "Try adjusting your filters or search term."
              : "Add your first product to start selling."
          }
          total={totalCount}
          page={page}
          onPageChange={handlePageChange}
          manualPagination={true}
          enableSearch={false}
          renderTopToolbarCustomActions={({ data }) => (
            <>
              {!search && !statusFilter && (
                <button
                  onClick={() => navigate("/products/add")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:bg-opacity-90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Product
                </button>
              )}
            </>
          )}
        />
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteMutation.mutate(deleteTarget?._id || deleteTarget?.id)
        }
        loading={deleteMutation.isPending}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
