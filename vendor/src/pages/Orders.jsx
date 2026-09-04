import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrderStore } from "../store/orderStore";
import { getSocket } from "../lib/socket";
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
  CheckCircle,
  StickyNote,
  X,
} from "lucide-react";

export default function Orders() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailOrderId, setDetailOrderId] = useState(null); // orderId for full detail
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const queryClient = useQueryClient();
  const fetchOrders = useOrderStore((state) => state.fetchOrders);
  const updateStatus = useOrderStore((state) => state.updateStatus);

  // Get orders (auto-refresh for live status)
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-orders", activeTab, search, page, pageSize],
    queryFn: () => {
      const params = { page, limit: pageSize };
      if (activeTab !== "all") params.status = activeTab;
      if (search) params.search = search;
      return fetchOrders(params);
    },
    refetchInterval: 30000,
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

  const handleDeliver = (orderId) => {
    updateStatusMutation.mutate({ orderId, action: "deliver" });
  };

  // Fetch full order detail when the detail modal is opened (auto-refresh for live status)
  useEffect(() => {
    let cancelled = false;
    if (detailOrderId) {
      setDetailLoading(true);
      setOrderDetail(null);
      let first = true;
      const load = () => {
        useOrderStore
          .getState()
          .fetchOrderDetail(detailOrderId)
          .then((res) => {
            if (!cancelled) setOrderDetail(res);
          })
          .catch(() => {
            if (!cancelled && first) toast.error("Failed to load order detail");
          })
          .finally(() => {
            if (!cancelled) setDetailLoading(false);
            first = false;
          });
      };
      load();
      const interval = setInterval(load, 15000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
  }, [detailOrderId]);

  // Real-time: server pushes order status / tracking updates the moment they
  // change (Shiprocket sync, customer/admin actions). Update the open detail
  // modal instantly and refresh list badges.
  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (data) => {
      if (!data || !data.orderId) return;
      if (detailOrderId === data.orderId && setOrderDetail) {
        setOrderDetail((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          if (data.status) next.status = data.status;
          if (data.paymentStatus) next.payment_status = data.paymentStatus;
          if (data.itemStatus && data.vendorId) {
            next.items = (prev.items || []).map((it) =>
              it.vendor_id === data.vendorId
                ? { ...it, status: data.itemStatus }
                : it
            );
          }
          const t = data.tracking;
          if (t && (t.awb || t.courier || t.status || t.trackingUrl)) {
            next.shipment = {
              ...(prev.shipment || {}),
              status: t.status ?? prev.shipment?.status,
              awb_code: t.awb ?? prev.shipment?.awb_code,
              courier_name: t.courier ?? prev.shipment?.courier_name,
              tracking_url: t.trackingUrl ?? prev.shipment?.tracking_url,
            };
          }
          return next;
        });
      }
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
    };
    socket.on("order_update", onUpdate);
    socket.on("order_status_change", onUpdate);
    return () => {
      socket.off("order_update", onUpdate);
      socket.off("order_status_change", onUpdate);
    };
  }, [detailOrderId, queryClient]);

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
              render: (_value, row) => (
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
              render: (_value, row) => (
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
              render: (_value, row) => (
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
              render: (_value, row) => (
                <StatusBadge status={row.status} type="order" />
              ),
            },
            {
              key: "date",
              label: "Date",
              render: (_value, row) => (
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
              render: (_value, row) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setDetailOrderId(row.order_id || row.id)}
                    className="bg-gray-50 text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="View full order detail"
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
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
                    <span
                      className="text-xs text-gray-400 font-medium"
                      title="Shipment creation & tracking is handled automatically via Shiprocket"
                    >
                      Auto-shipping…
                    </span>
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

      {/* Order Detail Modal */}
      {detailOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">
                Order Details {orderDetail?.order_number ? `#${orderDetail.order_number}` : ""}
              </h3>
              <button
                onClick={() => setDetailOrderId(null)}
                className="p-1 rounded-full hover:bg-gray-100"
                title="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex justify-center py-16">
                <Spinner size="lg" />
              </div>
            ) : orderDetail ? (
              <div className="p-6 space-y-6">
                {/* Status */}
                {orderDetail.status && (
                  <div className="flex items-center justify-between">
                    <StatusBadge status={orderDetail.status} type="order" />
                    <span className="text-xs text-gray-500">
                      Placed{" "}
                      {orderDetail.created_at
                        ? new Date(orderDetail.created_at).toLocaleString("en-IN")
                        : ""}
                    </span>
                  </div>
                )}

                {/* Customer & Shipping */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Customer
                    </p>
                    <p className="font-semibold text-gray-900">
                      {orderDetail.customer_name || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {orderDetail.customer_email}
                    </p>
                    <p className="text-sm text-gray-600">
                      {orderDetail.customer_phone}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Deliver To
                    </p>
                    <p className="font-semibold text-gray-900">
                      {orderDetail.delivery_name || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">{orderDetail.delivery_phone}</p>
                    <p className="text-sm text-gray-600">
                      {[orderDetail.line1, orderDetail.line2, orderDetail.city, orderDetail.state, orderDetail.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>

                {/* Payment */}
                <div className="bg-gray-50 rounded-lg p-4 flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Payment</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {orderDetail.payment_method || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Payment Status</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {orderDetail.payment_status === "paid"
                        ? "Paid"
                        : orderDetail.payment_method === "cod"
                          ? "Collect on Delivery"
                          : (orderDetail.payment_status || "N/A")}
                    </p>
                  </div>
                  {orderDetail.shipment && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Tracking</p>
                      {orderDetail.shipment.status && (
                        <StatusBadge status={orderDetail.shipment.status} />
                      )}
                      <p className="text-sm font-medium text-gray-900">
                        {orderDetail.shipment.courier_name || "Courier"} ·{" "}
                        {orderDetail.shipment.awb_code || "—"}
                      </p>
                      {orderDetail.shipment.tracking_url && (
                        <a
                          href={orderDetail.shipment.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary font-semibold hover:underline"
                        >
                          Track on courier site →
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Your Items ({orderDetail.item_count || 0})
                  </p>
                  <div className="space-y-3">
                    {orderDetail.items?.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 border border-gray-100 rounded-lg p-3"
                      >
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ShoppingBag className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            {item.product_name}
                          </p>
                          {item.variant_name && (
                            <p className="text-xs text-gray-500">{item.variant_name}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Qty × {item.quantity}
                            {item.weight_g != null &&
                              (parseFloat(item.weight_g) >= 1000
                                ? ` · ${(parseFloat(item.weight_g) / 1000).toFixed(2)} kg each`
                                : ` · ${parseFloat(item.weight_g)} g each`)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 text-sm">
                            ₹
                            {parseFloat(item.total_price || item.total || item.unit_price).toLocaleString("en-IN")}
                          </p>
                          <StatusBadge status={item.status} type="order" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Item Total (your part):{" "}
                      <span className="font-bold text-gray-900">
                        ₹{parseFloat(orderDetail.vendor_total || 0).toLocaleString("en-IN")}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Order total: ₹
                      {parseFloat(orderDetail.total || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-gray-500">
                Failed to load order details.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
