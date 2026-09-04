import { Helmet } from "react-helmet-async";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  Phone,
  Calendar,
  ChevronLeft,
  ShoppingCart,
  BadgeIndianRupee,
  Loader,
  Check,
  ExternalLink,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import { useSettings } from "@/store/settingsStore";
import { buildOrderThankyouUrl } from "@/lib/whatsapp";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";
import Spinner from "@/components/ui/Spinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import whatsappIcon from "@/assets/whatsapp.png";

const STATUS_STEPS = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const STATUS_COLORS = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-orange-100 text-orange-700",
  in_transit: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const fmtINR = (n) => parseFloat(n || 0).toLocaleString("en-IN");

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const paymentLabel = (m) =>
  m === "razorpay" ? "Razorpay (Online)" : "Cash on Delivery";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useSettings();
  const [cancelling, setCancelling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [returnItem, setReturnItem] = useState(null);
  const [returnType, setReturnType] = useState("return");
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const data = await useOrderStore.getState().fetchOrder(id);
      return data;
    },
    refetchInterval: 15000,
  });

  // Real-time: apply order status / payment / courier-tracking updates pushed
  // by the server the moment they change, so the animated timeline moves live.
  useEffect(() => {
    const socket = getSocket();
    const onUpdate = (data) => {
      if (!data || data.orderId !== id) return;
      queryClient.setQueryData(["order", id], (prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        if (data.status) next.status = data.status;
        if (data.paymentStatus) next.payment_status = data.paymentStatus;
        if (data.itemStatus) {
          next.items = (prev.items || []).map((it) =>
            it.vendor_id === data.vendorId && data.itemStatus
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
            courier_id: prev.shipment?.courier_id ?? null,
            tracking_url: t.trackingUrl ?? prev.shipment?.tracking_url,
          };
        }
        return next;
      });
    };
    socket.on("order_update", onUpdate);
    socket.on("order_status_change", onUpdate);
    return () => {
      socket.off("order_update", onUpdate);
      socket.off("order_status_change", onUpdate);
    };
  }, [id, queryClient]);

  const handleCancel = () => {
    setConfirmOpen(true);
  };

  const doCancel = async () => {
    setConfirmOpen(false);
    setCancelling(true);
    try {
      await useOrderStore.getState().cancelOrder(id);
      toast.success("Order cancelled successfully");
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const RETURN_TYPE_OPTIONS = {
    full_return: [
      { value: "return", label: "Return & Refund" },
      { value: "replacement", label: "Replacement" },
    ],
    refund_only: [{ value: "return", label: "Return & Refund" }],
    replacement_only: [{ value: "replacement", label: "Replacement" }],
  };

  const RETURN_REASONS = [
    "Product damaged / defective",
    "Wrong item delivered",
    "Item not as described",
    "Size / fit issue",
    "Item missing parts",
    "Quality not satisfactory",
    "Other",
  ];

  const canReturn = (item) =>
    item.status === "delivered" &&
    item.return_type &&
    item.return_type !== "no_return" &&
    !!RETURN_TYPE_OPTIONS[item.return_type];

  const openReturn = (item) => {
    const opts = (RETURN_TYPE_OPTIONS[item.return_type] || []).map(
      (o) => o.value,
    );
    setReturnItem(item);
    setReturnType(opts[0] || "return");
    setReturnReason("");
    setReturnDescription("");
  };

  const closeReturn = () => {
    if (!returnSubmitting) setReturnItem(null);
  };

  const submitReturn = async () => {
    if (!returnReason.trim()) {
      toast.error("Please select a return reason");
      return;
    }
    setReturnSubmitting(true);
    try {
      await useOrderStore.getState().requestReturn({
        orderItemId: returnItem.id,
        type: returnType,
        reason: returnReason.trim(),
        description: returnDescription.trim(),
      });
      toast.success("Return request submitted successfully");
      setReturnItem(null);
      refetch();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to submit return request",
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (isLoading)
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  if (!order)
    return (
      <div className="min-h-[calc(100vh-120px)] px-4 text-secondary-900 flex flex-col gap-2 items-center justify-center">
        <span className="text-4xl">😒</span>
        Order not found
      </div>
    );

  const currentStepIdx = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const isCancellable =
    ["placed", "confirmed", "processing"].includes(order.status) &&
    order.cancel_deadline &&
    new Date() < new Date(order.cancel_deadline);

  const itemCount = order.items?.length || 0;

  return (
    <>
      <Helmet>
        <title>{`Order #${order.order_number} - The Damini Edit`}</title>
      </Helmet>
      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12 space-y-3 sm:space-y-4">
        <div className=" flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="flex min-w-0 items-start sm:items-center gap-3">
                  <button
                    onClick={() => navigate(-1)}
                    className=" p-1 rounded-lg text-xs sm:text-sm font-medium text-secondary-800 hover:bg-secondary"
                  >
                    <ChevronLeft strokeWidth={1.5} className="h-5 w-5" />
                  </button>

                  <div className="min-w-0">
                    <h1 className="truncate text-sm sm:text-lg font-semibold text-secondary-950">
                      Order #{order.order_number}
                    </h1>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-secondary-700">
                      <span className="flex items-center gap-1">
                        <Calendar strokeWidth={1.5} className="h-3.5 w-3.5" />
                        {fmtDate(order.created_at)}
                      </span>

                      <span className="hidden sm:block text-secondary-300">
                        •
                      </span>

                      <span>
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>

                      <span className="hidden sm:block text-secondary-300">
                        •
                      </span>

                      <span className="font-medium text-secondary-900">
                        ₹{fmtINR(order.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize whitespace-nowrap ${
                    STATUS_COLORS[order.status] ||
                    "bg-secondary text-secondary-900"
                  }`}
                >
                  {order.status?.replaceAll("_", " ")}
                </span>
              </div>

              {/* Note */}
              {order.notes && (
                <div className="mt-3 rounded-lg border-l-4 border-amber-400 bg-amber-50 px-3 py-2">
                  <p className="text-xs text-amber-800">
                    <span className="font-semibold">Note:</span> {order.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isCancellable && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 border border-red-600 text-red-600 px-3 py-2 rounded-xl font-medium text-xs hover:bg-red-50 transition-colors"
                >
                  <Loader className="h-4 w-4" />{" "}
                  {cancelling ? "Cancelling..." : "Cancel Order"}
                </button>
              )}
              {order.status === "delivered" && (
                <button className="inline-flex items-center gap-1.5 border text-secondary-900 px-3 py-2 rounded-xl text-xs font-medium hover:bg-secondary transition-colors">
                  <Download strokeWidth={1.5} className="h-4 w-4" /> Invoice
                </button>
              )}
              {!isCancelled && (
                <a
                  href={buildOrderThankyouUrl(
                    settings.whatsapp_number,
                    order.order_number,
                    settings.site_name,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-2 rounded-xl text-xs font-medium hover:brightness-95 transition-all"
                >
                  <img
                    src={whatsappIcon}
                    alt="WhatsApp"
                    className="h-4 w-4 object-contain"
                  />
                  Send Thank You
                </a>
              )}
            </div>
          </div>

          {/* Payment strip */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] sm:text-xs py-2.5 px-4 bg-secondary rounded-xl">
            <span className="flex items-center gap-1.5">
              <ShoppingCart
                strokeWidth={1.5}
                className="h-4 w-4 text-primary"
              />
              {paymentLabel(order.payment_method)}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              {order.payment_status === "paid" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <BadgeIndianRupee
                  strokeWidth={1.5}
                  className="h-4 w-4 text-orange-500"
                />
              )}
              Payment{" "}
              <span
                className={
                  order.payment_status === "paid"
                    ? "text-green-600 font-semibold"
                    : "text-orange-500 font-semibold"
                }
              >
                {order.payment_status === "paid"
                  ? "Paid"
                  : order.payment_method === "cod"
                    ? "Collect on Delivery"
                    : order.payment_status}
              </span>
            </span>
            {order.payment?.razorpay_order_id && (
              <span className="text-secondary-700 truncate">
                Ref: {order.payment.razorpay_order_id}
              </span>
            )}
          </div>
        </div>

        {/* Order Status Timeline */}
        {!isCancelled && (
          <div className="py-5 px-5">
            <h2 className="font-semibold text-secondary-950 mb-4">
              Order Status
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 cursor-default">
              {STATUS_STEPS.map((status, i) => {
                const isDone = i <= currentStepIdx;
                const isActive = i === currentStepIdx;
                const isLast = i === STATUS_STEPS.length - 1;

                return (
                  <div
                    key={status}
                    className="relative flex sm:flex-1 sm:flex-col items-start sm:items-center"
                  >
                    {/* Connector (Desktop Left) */}
                    {i > 0 && (
                      <div
                        className={`hidden sm:block absolute left-0 top-4 w-1/2 h-0.5 ${
                          i - 1 < currentStepIdx
                            ? "bg-green-500"
                            : "bg-secondary-400"
                        }`}
                      />
                    )}

                    {/* Connector (Desktop Right) */}
                    {!isLast && (
                      <div
                        className={`hidden sm:block absolute right-0 top-4 w-1/2 h-0.5 ${
                          i < currentStepIdx
                            ? "bg-green-500"
                            : "bg-secondary-400"
                        }`}
                      />
                    )}

                    {/* Mobile Vertical Line */}
                    {!isLast && (
                      <div
                        className={`sm:hidden absolute left-4 top-8 w-[1.5px] h-full ${
                          i < currentStepIdx
                            ? "bg-green-500"
                            : "bg-secondary-500"
                        }`}
                      />
                    )}

                    {/* Icon */}
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      {/* Ping animation */}
                      {isActive && (
                        <span className="absolute inset-0 rounded-full bg-green-400 opacity-60 animate-ping" />
                      )}

                      {/* Circle */}
                      <div
                        className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300
      ${
        isDone
          ? "bg-green-500 border-green-500"
          : "bg-white border-secondary-500"
      }
    `}
                      >
                        {isDone ? (
                          <Check className="h-4 w-4 text-white" />
                        ) : (
                          <span className="h-2.5 w-2.5 rounded-full bg-secondary-500" />
                        )}
                      </div>
                    </div>

                    {/* Text */}
                    <div className="ml-4 sm:ml-0 sm:mt-3 flex flex-col md:items-center justify-center pb-8 sm:pb-0">
                      <h4
                        className={`text-sm sm:text-xs font-semibold capitalize transition-colors
              ${
                isActive
                  ? "text-green-600"
                  : isDone
                    ? "text-green-600"
                    : "text-secondary-700"
              }`}
                      >
                        {status.replaceAll("_", " ")}
                      </h4>

                      <p
                        className={`mt-1 text-xs
              ${
                isActive
                  ? "text-green-600 font-medium rounded-full flex mx-auto py-1 px-4 bg-secondary animate-pulse"
                  : isDone
                    ? "text-secondary-900"
                    : "text-secondary-500"
              }`}
                      >
                        {isActive ? "Live" : isDone ? "Completed" : "Upcoming"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Order Cancelled</p>
              {order.cancel_reason && (
                <p className="text-red-600 text-sm">{order.cancel_reason}</p>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-4 sm:p-5">
          <h2 className="font-semibold text-secondary-950 mb-2">Order Items</h2>
          <div className="divide-y divide-gray-100">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 sm:gap-4 py-4 first:pt-2 last:pb-0"
              >
                <img
                  src={
                    item.product_image ||
                    `https://picsum.photos/seed/${item.product_id}/100`
                  }
                  alt={item.product_name}
                  className="h-16 w-16 sm:h-20 sm:w-20 object-cover bg-secondary-100 rounded-lg border border-secondary-200 shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-snug line-clamp-1">
                    {item.product_name}
                  </p>
                  {item.variant_name && (
                    <p className="text-xs text-secondary-700 mt-0.5 line-clamp-1">
                      {item.variant_name}
                    </p>
                  )}
                  <p className="text-xs text-secondary-700 mt-0.5 line-clamp-1">
                    Sold by {item.vendor_name}
                  </p>
                  {item.return_window && (
                    <p className="text-[11px] text-green-600 mt-0.5 line-clamp-1">
                      Return window: {item.return_window} days
                    </p>
                  )}
                  <p className="text-xs font-medium text-secondary-800 mt-1.5">
                    Qty: {item.quantity} × ₹{fmtINR(item.unit_price)}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <p className="font-medium text-sm">
                    ₹{fmtINR(item.total_price)}
                  </p>
                  <span
                    className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[item.status] || "bg-blue-100 text-blue-700"}`}
                  >
                    {item.status?.replaceAll("_", " ")}
                  </span>
                  {canReturn(item) && (
                    <button
                      onClick={() => openReturn(item)}
                      className="text-[11px] sm:text-xs text-[#2874F0] hover:underline inline-flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Return
                    </button>
                  )}
                  {item.status === "delivered" && item.return_type === "no_return" && (
                    <span className="text-[11px] text-secondary-400">Not returnable</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address + Payment Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-4 sm:p-5">
            <h3 className="font-semibold text-secondary-950 mb-3 flex items-center gap-2">
              <MapPin strokeWidth={1.5} className="h-4 w-4 text-primary" />{" "}
              Delivery Address
            </h3>
            <p className="text-sm font-semibold text-secondary-950">
              {order.delivery_name}
            </p>
            <p className="text-sm text-secondary-800 mt-0.5">
              {order.line1}
              {order.line2 ? `, ${order.line2}` : ""}
            </p>
            <p className="text-sm text-secondary-800">
              {order.city}, {order.state} - {order.pincode}
            </p>
            <p className="text-sm text-secondary-700 mt-1.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> {order.delivery_phone}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-4 sm:p-5">
            <h3 className="font-semibold text-secondary-950 mb-3 flex items-center gap-2">
              <CreditCard strokeWidth={1.5} className="h-4 w-4 text-primary" />{" "}
              Price Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-secondary-800">Subtotal</span>
                <span>₹{fmtINR(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>− ₹{fmtINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between ">
                <span className="text-secondary-800">Shipping</span>
                <span>
                  {parseFloat(order.shipping_charges) === 0
                    ? "FREE"
                    : `₹${fmtINR(order.shipping_charges)}`}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-base pt-4 border-dashed border-t-2">
                <span>Total</span>
                <span>₹{fmtINR(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking */}
        {order.shipment && (
          <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-4 sm:p-5">
            <h3 className="font-semibold text-secondary-950 mb-3 flex items-center gap-2">
              <Truck strokeWidth={1.5} className="h-4 w-4 text-primary" />{" "}
              Tracking Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {order.shipment.status && (
                <p className="text-gray-700 col-span-1 sm:col-span-2">
                  Status:{" "}
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      STATUS_COLORS[order.shipment.status] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {String(order.shipment.status).replaceAll("_", " ")}
                  </span>
                </p>
              )}
              <p className="text-gray-700">
                AWB:{" "}
                <span className="font-mono font-semibold">
                  {order.shipment.awb_code}
                </span>
              </p>
              <p className="text-gray-700">
                Courier: {order.shipment.courier_name}
              </p>
              {order.shipment.tracking_url && (
                <p className="text-gray-700 col-span-1 sm:col-span-2">
                  <a
                    href={order.shipment.tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    Track on courier site <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doCancel}
        loading={cancelling}
        title="Cancel this order?"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel="Cancel Order"
        variant="danger"
      />

      {returnItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeReturn}
          />
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl border border-secondary-200 shadow-xl p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-secondary-950 mb-1">
              Request Return
            </h2>
            <p className="text-sm text-secondary-700 mb-4">
              {returnItem.product_name}
              {returnItem.variant_name ? ` (${returnItem.variant_name})` : ""}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-800 mb-1.5">
                  Return Type
                </label>
                <div className="flex flex-wrap gap-2">
                  {RETURN_TYPE_OPTIONS[returnItem.return_type]?.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setReturnType(opt.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        returnType === opt.value
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-secondary-800 border-secondary-300 hover:border-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-800 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full border border-secondary-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white"
                >
                  <option value="">Select a reason</option>
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-800 mb-1.5">
                  Description (optional)
                </label>
                <textarea
                  rows={3}
                  value={returnDescription}
                  onChange={(e) => setReturnDescription(e.target.value)}
                  placeholder="Add more details about the issue…"
                  className="w-full border border-secondary-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={closeReturn}
                disabled={returnSubmitting}
                className="px-4 py-2 text-sm font-medium text-secondary-900 bg-secondary hover:bg-secondary-300 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReturn}
                disabled={returnSubmitting}
                className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {returnSubmitting ? "Submitting…" : "Submit Return Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
