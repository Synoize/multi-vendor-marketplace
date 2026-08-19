import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderStore } from "../store/orderStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import StatusBadge from "../components/ui/StatusBadge";
import EmptyState from "../components/ui/EmptyState";
import DataTable from "../components/ui/DataTable";
import {
  Search,
  ShoppingBag,
  Eye,
  Check,
  Truck,
  CheckCircle,
  StickyNote,
} from "lucide-react";

export default function Orders() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [shippingModal, setShippingModal] = useState(null); // orderId if open
  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");

  const queryClient = useQueryClient();
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const updateStatus = useOrderStore((state) => state.updateStatus);

  // Get orders
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-orders", activeTab, search, page, pageSize],
    queryFn: () => {
      const params = { page, limit: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      return fetchOrders(params);
    },
  });

  const orders = data?.orders || [];
  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, action, body = {} }) => {
      return updateStatus(orderId, action, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order status updated successfully");
      setShippingModal(null);
      setTrackingId("");
      setCourierName("");
    },
    onError: (err) => {
      toast.error(
        err.response?.data?.message || "Failed to update order status",
      );
    },
  });

  const handleConfirm = (orderId) => {
    updateStatusMutation.mutate({ orderId, action: "confirm" });
  };

  const handleShipSubmit = (e) => {
    e.preventDefault();
    if (!trackingId || !courierName) {
      toast.error("Please fill in tracking ID and Courier details");
      return;
    }
    updateStatusMutation.mutate({
      orderId: shippingModal,
      action: "ship",
      body: { trackingId, courierName },
    });
  };

  const handleDeliver = (orderId) => {
    updateStatusMutation.mutate({ orderId, action: "deliver" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Order Management</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            Fulfill and track customer orders
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search order number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm outline-none focus:border-secondary-600"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
        {[
          { id: "all", label: "All Orders" },
          { id: "placed", label: "New" },
          { id: "processing", label: "Processing" },
          { id: "shipped", label: "Shipped" },
          { id: "delivered", label: "Delivered" },
          { id: "cancelled", label: "Cancelled" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-5 py-3 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Body */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <DataTable
          columns={[
            {
              key: "order_details",
              label: "Order Details",
              render: (row) => (
                <>
                  <p className="font-bold text-gray-900">
                    #{row.order_number}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.delivery_name || "Customer"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {row.delivery_phone}
                  </p>
                  {row.notes && (
                    <p className="text-xs text-amber-600 flex items-start gap-1 mt-1 max-w-[220px]">
                      <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span className="truncate" title={row.notes}>
                        {row.notes}
                      </span>
                    </p>
                  )}
                </>
              ),
            },
            {
              key: "products",
              label: "Products",
              render: (row) => (
                <>
                  <p className="font-medium truncate">
                    {row.product_names || row.product_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Qty: {row.quantity || row.item_count}
                  </p>
                </>
              ),
            },
            {
              key: "total_price",
              label: "Total Price",
              render: (row) => (
                <span className="font-bold text-gray-900">
                  ₹
                  {parseFloat(
                    row.total || row.total_price,
                  ).toLocaleString("en-IN")}
                </span>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusBadge status={row.status} type="order" />
              ),
            },
            {
              key: "date",
              label: "Date",
              render: (row) => (
                <span className="text-xs text-gray-500">
                  {new Date(row.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  {row.status === "placed" && (
                    <button
                      onClick={() =>
                        handleConfirm(row.order_id || row.id)
                      }
                      className="bg-primary-50 text-primary hover:bg-opacity-90 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Confirm Order"
                    >
                      <Check className="h-4 w-4" /> Confirm
                    </button>
                  )}
                  {row.status === "processing" && (
                    <button
                      onClick={() =>
                        setShippingModal(row.order_id || row.id)
                      }
                      className="bg-orange-50 text-orange-500 hover:bg-orange-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Mark Shipped"
                    >
                      <Truck className="h-4 w-4" /> Ship
                    </button>
                  )}
                  {row.status === "shipped" && (
                    <button
                      onClick={() =>
                        handleDeliver(row.order_id || row.id)
                      }
                      className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                      title="Mark Delivered"
                    >
                      <CheckCircle className="h-4 w-4" /> Deliver
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          data={orders}
          loading={isLoading}
          emptyMessage="You don't have any orders matching the selection."
          total={data?.total || 0}
          page={page}
          onPageChange={(newPage, newPageSize) => {
            setPage(newPage);
            if (newPageSize) setPageSize(newPageSize);
          }}
          manualPagination
        />
      )}

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-zoom-in">
            <h3 className="font-bold text-gray-900 text-lg mb-4">
              Shipment Tracking details
            </h3>
            <form onSubmit={handleShipSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Courier Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BlueDart, Delhivery"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  AWB / Tracking ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234567890"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShippingModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
                >
                  {updateStatusMutation.isPending
                    ? "Saving..."
                    : "Submit Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
