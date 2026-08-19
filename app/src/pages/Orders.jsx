import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ShoppingBasket,
  ChevronRight,
  ArrowRight,
  ChevronDown,
  Check,
  Info,
} from "lucide-react";
import { useOrderStore } from "@/store/orderStore";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";

const STATUS_TABS = [
  "all",
  "placed",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];
const STATUS_COLORS = {
  placed: "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  processing: "bg-purple-100 text-purple-700",
  shipped: "bg-orange-100 text-orange-700",
  out_for_delivery: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function Orders() {
  const [activeTab, setActiveTab] = useState("all");
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setStatusOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", activeTab],
    queryFn: async () => {
      const params = activeTab !== "all" ? `?status=${activeTab}` : "";
      const data = await useOrderStore.getState().fetchOrders(params);
      return data;
    },
  });

  const orders = data?.orders || [];

  return (
    <>
      <Helmet>
        <title>My Orders - The Damini Edit</title>
      </Helmet>
      <div className="max-w-2xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="mb-5 flex gap-3 justify-between items-center">
          <PageHeader title="My Orders" />

          {/* Status Dropdown */}
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-medium text-secondary-900 shadow-sm transition-colors"
            >
              {activeTab === "all"
                ? "All Orders"
                : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              <ChevronDown
                className={`h-4 w-4 text-secondary-800 transition-transform ${statusOpen ? "rotate-180" : ""}`}
              />
            </button>
            {statusOpen && (
              <div className="absolute right-0 mt-1 w-32 z-20 rounded-lg bg-white shadow-sm border py-1">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setStatusOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition-colors ${
                      activeTab === tab
                        ? "bg-primary-50 text-primary font-semibold"
                        : "text-secondary-900 hover:bg-secondary"
                    }`}
                  >
                    <span className="capitalize">{tab}</span>
                    {activeTab === tab && (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <Spinner size="md" />
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <ShoppingBasket
                  strokeWidth={1}
                  className="h-10 w-10 text-primary"
                />
              </div>
              <h2 className="text-lg sm:text-2xl font-medium text-secondary-950">
                No orders found
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary-700">
                You haven't placed any orders yet
              </p>
              <Link
                to="/products"
                className="group mt-8 inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-xs sm:text-sm text-white shadow-sm"
              >
                Start Shopping
                <ArrowRight
                  strokeWidth={1.8}
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const images = (order.product_images || "")
                .split(", ")
                .filter(Boolean);
              return (
                <Link to={`/orders/${order.id}`} key={order.id} className="">
                  <div className="flex items-center justify-between gap-4 bg-white rounded-lg shadow-sm p-2 pr-3 border border-secondary-200 transition-shadow">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {images.length > 1 ? (
                        <div className="relative h-20 w-20 shrink-0">
                          {images.slice(0, 3).map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              className="absolute h-16 w-16 rounded-lg border-2 border-white bg-secondary-100 object-cover shadow-sm"
                              style={{
                                left: i * 8,
                                top: i * 8,
                                zIndex: 3 - i,
                              }}
                            />
                          ))}
                          {images.length > 3 && (
                            <span
                              className="absolute rounded-lg bg-secondary-950/60 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white"
                              style={{
                                left: 24,
                                top: 24,
                                zIndex: 0,
                                width: 64,
                                height: 64,
                              }}
                            >
                              +{images.length - 3}
                            </span>
                          )}
                        </div>
                      ) : images.length === 1 ? (
                        <img
                          src={images[0]}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg border border-secondary-200 bg-secondary-100 object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                          <ShoppingBasket
                            strokeWidth={1.5}
                            className="h-6 w-6 text-primary"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-xs sm:text-sm line-clamp-1 mt-1">
                          #{order.order_number}
                        </h3>

                        <p className="text-[10px] text-secondary-800 mt-1 mb-0.5">
                          {order.item_count} item
                          {order.item_count !== 1 ? "s" : ""} · Ordered{" "}
                          {new Date(order.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </p>
                        {order.product_names && (
                          <p className="text-[10px] sm:text-xs text-secondary-950 line-clamp-1">
                            {(() => {
                              const names = order.product_names
                                .split(", ")
                                .filter(Boolean);
                              return names.length > 1
                                ? `${names[0]} +${order.item_count - 1} more`
                                : order.product_names;
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col justify-between items-end gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-secondary text-secondary-900"}`}
                      >
                        {order.status?.replace("_", " ")}
                      </span>

                      <p className="text-sm font-semibold text-secondary-950 mt-2">
                        ₹{parseFloat(order.total).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
