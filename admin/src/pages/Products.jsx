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
  Eye,
  Image,
  Tag,
  Package,
  Truck,
  RotateCcw,
  XCircle,
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
  const [detailModal, setDetailModal] = useState(null);

  const { data: productDetail, isLoading: isDetailLoading, isError, error } = useQuery({
    queryKey: ["admin-product-detail", detailModal],
    queryFn: async () => {
      const res = await api.get(`/admin/products/${detailModal}`);
      console.log('Product detail response:', res.data);
      return res.data.data;
    },
    enabled: !!detailModal,
    retry: false,
  });

  // Debug: log errors
  if (isError) {
    console.error('Product detail fetch error:', error);
  }

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
          <button
            onClick={() => setDetailModal(row.id)}
            className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </button>
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
            className="w-full pl-10 pr-4 py-2 bg-secondary border rounded-xl text-sm text-secondary-950 outline-none focus:border-secondary-600 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-1 inline-flex gap-1 overflow-x-auto scrollbar-hide">
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
            className={`px-5 py-2.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
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

{/* Product Detail Modal */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setDetailModal(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {isDetailLoading ? (
              <div className="flex items-center justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : productDetail ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    {productDetail.primary_image && (
                      <img
                        src={productDetail.primary_image}
                        alt=""
                        className="h-12 w-12 object-contain bg-gray-100 rounded-lg"
                      />
                    )}
                    <div>
                      <h2 className="font-bold text-lg text-gray-900 truncate max-w-md">
                        {productDetail.name}
                      </h2>
                      <p className="text-xs text-gray-500">SKU: {productDetail.sku}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailModal(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Status</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {productDetail.status}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Price</p>
                      <p className="font-semibold text-gray-900">
                        ₹{parseFloat(productDetail.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">MRP</p>
                      <p className="font-semibold text-gray-900">
                        ₹{parseFloat(productDetail.mrp).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Stock</p>
                      <p className="font-semibold text-gray-900">
                        {productDetail.stock ?? "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Vendor</p>
                      <p className="font-semibold text-gray-900 truncate">
                        {productDetail.store_name || "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Category</p>
                      <p className="font-semibold text-gray-900">
                        {productDetail.category_name || "—"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {productDetail.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">
                        {productDetail.description}
                      </p>
                    </div>
                  )}

                  {/* Images */}
                  {productDetail.images && productDetail.images.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-400" />
                        Product Images ({productDetail.images.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {productDetail.images.map((img, idx) => (
                          <div key={img.id} className="relative aspect-square">
                            <img
                              src={img.url}
                              alt={`Product image ${idx + 1}`}
                              className="w-full h-full object-contain bg-gray-50 border border-gray-100 rounded-lg"
                            />
                            {img.is_primary && (
                              <span className="absolute top-1 left-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variants */}
                  {productDetail.variants && productDetail.variants.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4 text-gray-400" />
                        Variants ({productDetail.variants.length})
                      </h3>
                      <div className="space-y-3">
                        {productDetail.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">
                                {variant.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {JSON.stringify(variant.attributes)}
                              </span>
                            </div>
                            {productDetail.variantSkus &&
                              productDetail.variantSkus.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  {productDetail.variantSkus
                                    .filter((s) => s.variant_id === variant.id)
                                    .map((sku) => (
                                      <div
                                        key={sku.id}
                                        className="bg-white rounded-lg p-3 border"
                                      >
                                        <p className="font-medium text-gray-900">
                                          {sku.name}
                                        </p>
                                        <p className="text-gray-600">
                                          ₹{parseFloat(sku.price).toLocaleString("en-IN")}
                                        </p>
                                        <p className="text-gray-500">
                                          Stock: {sku.stock}
                                        </p>
                                        <p className="text-gray-500">
                                          SKU: {sku.sku}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Vendor Details */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      Vendor & Pickup Details
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Vendor Store</p>
                        <p className="font-medium text-gray-900">
                          {productDetail.store_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Vendor Owner</p>
                        <p className="font-medium text-gray-900">
                          {productDetail.vendor_owner_name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Vendor Email</p>
                        <p className="font-medium text-gray-900 truncate">
                          {productDetail.vendor_owner_email || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Vendor Rating</p>
                        <p className="font-medium text-gray-900">
                          {productDetail.vendor_rating || "—"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-400">Pickup Address</p>
                        <p className="font-medium text-gray-900">
                          {productDetail.vendor_pickup_pincode
                            ? `${productDetail.vendor_pickup_city || ""}, ${
                                productDetail.vendor_pickup_state || ""
                              } - ${productDetail.vendor_pickup_pincode}`
                            : "Not configured"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tags & Dimensions */}
                  {(productDetail.tags && productDetail.tags.length > 0) ||
                  productDetail.dimensions ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {productDetail.tags && productDetail.tags.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <Tag className="h-4 w-4 text-gray-400" />
                            Tags
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {productDetail.tags.map((tag) => (
                              <span
                                key={tag}
                                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {productDetail.dimensions && (
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                            <RotateCcw className="h-4 w-4 text-gray-400" />
                            Dimensions (cm)
                          </h3>
                          <div className="grid grid-cols-3 gap-2 text-sm">
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-400">Length</p>
                              <p className="font-medium">
                                {productDetail.dimensions.length || "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-400">Width</p>
                              <p className="font-medium">
                                {productDetail.dimensions.width || "—"}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-xs text-gray-400">Height</p>
                              <p className="font-medium">
                                {productDetail.dimensions.height || "—"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                  <button
                    onClick={() => setDetailModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
