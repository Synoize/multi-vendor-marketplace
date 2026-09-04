import { Helmet } from "react-helmet-async";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PackageCheck,
  ShoppingBag,
  ReceiptText,
  Package,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";

export default function OrderSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: () => useOrderStore.getState().fetchOrder(id),
    enabled: !!id,
    retry: 1,
  });

  // Refresh order count badge right after placing an order
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["order-count"] });
  }, [queryClient]);

  const paymentLabel =
    order?.payment_method === "razorpay"
      ? "Online Payment (Razorpay)"
      : "Cash on Delivery";

  return (
    <>
      <Helmet>
        <title>Order Placed - The Damini Edit</title>
      </Helmet>

      <div className="max-w-2xl mx-auto min-h-[calc(100vh-120px)] px-4 pt-6 pb-24 sm:px-8 sm:pt-12 sm:pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : order ? (
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-b from-primary-50 via-primary-50/50 to-white px-6 sm:px-10 pt-10 pb-8 text-center">
              <div className="relative inline-flex mb-5">
                <span className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-40" />
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-100 border-4 border-white shadow-md">
                  <PackageCheck className="h-10 w-10 text-green-600" />
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-secondary-950 mb-2">
                Thank you for your order!
              </h1>
              <p className="text-sm sm:text-base text-secondary-800 mb-4">
                Your order has been placed successfully. A confirmation has
                been sent to you.
              </p>
              <div className="inline-flex items-center gap-2 bg-white border border-secondary-200 rounded-full px-4 py-2 shadow-sm">
                <ReceiptText className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-secondary-950">
                  Order # {order.order_number}
                </span>
              </div>
            </div>

            {/* Summary */}
            <div className="px-6 sm:px-10 py-6 space-y-4">
              <div className="rounded-xl bg-secondary-50 border border-secondary-200 divide-y divide-secondary-200/70">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-secondary-800">Items</span>
                  <span className="text-sm font-semibold text-secondary-950">
                    {order.items?.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-secondary-800">
                    Payment Method
                  </span>
                  <span className="text-sm font-semibold text-secondary-950">
                    {paymentLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-secondary-800">
                    Payment Status
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      order.payment_status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.payment_status === "paid"
                      ? "Paid"
                      : "Pay on Delivery"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-secondary-800">Total</span>
                  <span className="text-base font-bold text-secondary-950">
                    ₹{parseFloat(order.total).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Item preview */}
              {order.items?.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item, i) => (
                      <img
                        key={item.id || i}
                        src={
                          item.product_image ||
                          `https://picsum.photos/seed/${item.product_id}/48`
                        }
                        alt={item.product_name}
                        className="h-10 w-10 rounded-lg object-contain bg-white border border-secondary-200"
                      />
                    ))}
                    {order.items.length > 3 && (
                      <span className="h-10 w-10 rounded-lg bg-secondary text-secondary-800 text-[10px] font-semibold flex items-center justify-center border border-secondary-200">
                        +{order.items.length - 3}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-secondary-800">
                    {order.items[0]?.product_name}
                    {order.items.length > 1 &&
                      ` +${order.items.length - 1} more`}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-6 sm:px-10 pb-10 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate(`/orders/${id}`)}
                className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors"
              >
                <Package className="h-4 w-4" /> Track Order
              </button>
              <Link
                to="/orders"
                className="flex-1 flex items-center justify-center gap-2 border-2 border-primary/30 text-primary font-semibold py-3.5 rounded-xl text-sm hover:bg-primary-50 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" /> View All Orders
              </Link>
              <button
                onClick={() => navigate("/")}
                className="flex-1 flex items-center justify-center gap-2 border border-secondary-200 text-secondary-800 font-semibold py-3.5 rounded-xl text-sm hover:bg-secondary transition-colors"
              >
                Continue Shopping <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 px-6 py-16 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-secondary mb-4">
              <Package className="h-8 w-8 text-secondary-800" />
            </div>
            <h2 className="text-xl font-bold text-secondary-950 mb-2">
              Order not found
            </h2>
            <p className="text-sm text-secondary-800 mb-6">
              We couldn't find this order. It may have been removed or the link
              is incorrect.
            </p>
            <button
              onClick={() => navigate("/orders")}
              className="inline-flex items-center gap-2 bg-primary hover:bg-opacity-90 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Go to My Orders
            </button>
          </div>
        )}
      </div>
    </>
  );
}
