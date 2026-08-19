import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Plus,
  CreditCard,
  Banknote,
  Check,
  ChevronDown,
  HandCoins,
} from "lucide-react";
import { toast } from "sonner";
import { useProfileStore } from "@/store/profileStore";
import { useCartStore } from "@/store/cartStore";
import { useOrderStore } from "@/store/orderStore";
import { usePaymentStore } from "@/store/paymentStore";
import { useSettingsStore } from "@/store/settingsStore";
import Spinner from "@/components/ui/Spinner";

// Load Razorpay checkout script once, then reuse it
let razorpayPromise = null;
const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayPromise) return razorpayPromise;
  razorpayPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      razorpayPromise = null;
      reject(
        new Error(
          "Could not load Razorpay checkout. Check your internet connection.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return razorpayPromise;
};

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [placing, setPlacing] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [cartLoading, setCartLoading] = useState(true);

  const [addressDropdownOpen, setAddressDropdownOpen] = useState(false);
  const addressDropdownRef = useRef(null);
  const [orderNote, setOrderNote] = useState("");

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        addressDropdownRef.current &&
        !addressDropdownRef.current.contains(e.target)
      ) {
        setAddressDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const appliedOfferId = location.state?.offerId || null;
  const offerDiscount = location.state?.offerDiscount || 0;
  const couponDiscount = location.state?.couponDiscount || 0;
  const couponCode = location.state?.couponCode || null;

  // Online payment offer (ONLINE_PAY_OFF) - admin configurable
  const [onlinePayOff, setOnlinePayOff] = useState(0);

  useEffect(() => {
    useSettingsStore
      .getState()
      .fetchPublic()
      .then((s) => {
        const val = parseFloat(s.online_pay_off);
        setOnlinePayOff(val > 0 ? val : 0);
      })
      .catch(() => {});
  }, []);

  const onlineDiscount = paymentMethod === "razorpay" ? onlinePayOff : 0;
  const totalDiscount = offerDiscount + couponDiscount + onlineDiscount;

  const cart = useCartStore((s) => ({
    items: s.items,
    total: s.total,
    freeShippingThreshold: s.freeShippingThreshold,
    shippingCharge: s.shippingCharge,
  }));

  useEffect(() => {
    if (!cart.items.length) {
      useCartStore
        .getState()
        .fetchCart()
        .finally(() => setCartLoading(false));
    } else {
      setCartLoading(false);
    }
    useProfileStore
      .getState()
      .fetchAddresses()
      .then((d) => {
        const list = d || [];
        setAddresses(list);
        if (list.length) {
          const def = list.find((a) => a.is_default) || list[0];
          setSelectedAddress(def);
        }
      });
  }, []);

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }
    if (!cart.items.length) {
      toast.error("Your cart is empty");
      return;
    }

    const items = cart.items.map((i) => ({
      productId: i.product_id,
      variantId: i.variant_id,
      quantity: i.quantity,
    }));
    const payload = {
      addressId: selectedAddress.id,
      items,
      paymentMethod,
      notes: orderNote,
      ...(appliedOfferId && { offerId: appliedOfferId }),
    };

    const finalizeOrder = async () => {
      await useCartStore.getState().clearCart();
      queryClient.invalidateQueries({ queryKey: ["order-count"] });
    };

    setPlacing(true);
    try {
      if (paymentMethod === "cod") {
        const { data } = await useOrderStore.getState().placeOrder(payload);
        await finalizeOrder();
        toast.success("Order placed successfully!");
        navigate(`/order-success/${data.orderId}`, { replace: true });
        return;
      }

      // Razorpay: initiate payment first — the order is created only
      // after payment succeeds (server /payments/verify)
      const paymentResponse = await usePaymentStore
        .getState()
        .initiatePayment(payload);
      const payment = paymentResponse?.data ?? paymentResponse;
      if (!payment || typeof payment.key !== "string") {
        throw new Error(
          "Unexpected payment response: " + JSON.stringify(paymentResponse),
        );
      }
      await loadRazorpay();
      if (!window.Razorpay) {
        throw new Error("Razorpay checkout failed to initialize");
      }

      let paid = false;
      let settled = false;
      const cancelFlow = (message) => {
        if (settled) return;
        settled = true;
        if (message) toast.error(message);
        setPlacing(false);
      };

      const rzp = new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: "INR",
        name: "The Damini Edit Marketplace",
        description: "Checkout payment",
        order_id: payment.razorpayOrderId,
        handler: async (response) => {
          paid = true;
          try {
            setPlacing(true);
            const { data: verifyData } = await usePaymentStore
              .getState()
              .verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
            settled = true;
            await finalizeOrder();
            toast.success("Payment successful! Order placed.");
            navigate(`/order-success/${verifyData.orderId}`, {
              replace: true,
            });
          } catch (err) {
            cancelFlow(
              err.response?.data?.message ||
                "Payment received but order could not be placed. Please contact support.",
            );
          }
        },
        modal: {
          ondismiss: () => {
            if (!paid) {
              cancelFlow("Payment cancelled. No order was created.");
            } else {
              setPlacing(false);
            }
          },
        },
        prefill: {
          name: selectedAddress.name,
          contact: selectedAddress.phone,
        },
        theme: { color: "#2874F0" },
      });

      rzp.on("payment.failed", () => {
        cancelFlow("Payment failed. No order was created. Please try again.");
      });

      try {
        rzp.on("modal.close", () => {
          if (!paid) {
            cancelFlow("Payment cancelled. No order was created.");
          } else {
            setPlacing(false);
          }
        });
      } catch {
        // older checkout.js may not support modal.close; ondismiss covers it
      }

      rzp.open();
    } catch (err) {
      console.error("[Checkout] place order failed", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to place order",
      );
      setPlacing(false);
    }
  };

  const subtotal = cart.items.reduce(
    (s, i) => s + i.unit_price * i.quantity,
    0,
  );
  const shipping =
    subtotal >= (cart.freeShippingThreshold || 499)
      ? 0
      : cart.shippingCharge || 40;
  const total = subtotal - totalDiscount + shipping;

  return (
    <>
      <Helmet>
        <title>Checkout - The Damini Edit</title>
      </Helmet>

      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 pt-4 sm:px-8 sm:pt-8 pb-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-4">
            {/* Delivery Address */}
            <div className="bg-white sm:shadow-sm sm:border sm:border-secondary-200 sm:rounded-xl py-5 sm:px-5">
              <h2 className="font-semibold text-secondary-950 mb-4 flex items-center gap-2">
                <MapPin strokeWidth={1.5} className="h-5 w-5 text-primary" />{" "}
                Select Delivery Address
              </h2>
              <div className="space-y-3">
                <div className="relative" ref={addressDropdownRef}>
                  <button
                    onClick={() => setAddressDropdownOpen(!addressDropdownOpen)}
                    className="w-full flex items-start justify-between gap-2 rounded-xl border border-secondary-200 p-3 text-left hover:bg-secondary transition-colors"
                  >
                    {selectedAddress ? (
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-secondary-950 truncate">
                          {selectedAddress.name}{" "}
                          <span className="bg-secondary-300 text-secondary-900 text-[11px] px-1.5 py-0.5 rounded ml-1 uppercase font-medium">
                            {selectedAddress.type}
                          </span>
                        </p>
                        <p className="text-xs text-secondary-800 truncate">
                          {selectedAddress.line1}
                          {selectedAddress.line2 &&
                            `, ${selectedAddress.line2}`}
                          {selectedAddress.landmark &&
                            ` - ${selectedAddress.landmark}`}
                        </p>
                        <p className="text-xs text-secondary-800">
                          {selectedAddress.city}, {selectedAddress.state} -{" "}
                          {selectedAddress.pincode}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary-800">
                        {addresses.length
                          ? "Choose a delivery address"
                          : "No saved addresses"}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-5 w-5 text-secondary-700 shrink-0 transition-transform ${addressDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {addressDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 z-20 rounded-xl bg-white shadow-sm border max-h-64 overflow-y-auto">
                      {addresses.length === 0 ? (
                        <p className="text-sm text-secondary-800 text-center py-4">
                          No saved addresses
                        </p>
                      ) : (
                        addresses.map((addr) => (
                          <button
                            key={addr.id}
                            onClick={() => {
                              setSelectedAddress(addr);
                              setAddressDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 pb-2 sm:pb-3 pt-1 border-b last:border-0 hover:bg-secondary transition-colors ${selectedAddress?.id === addr.id ? "bg-secondary" : ""}`}
                          >
                            <p>
                              <span className="text-[11px]">{addr.name} </span>
                              <span className="bg-secondary-300 text-secondary-900 text-[9px] px-1.5 py-0.5 rounded ml-1 uppercase font-medium">
                                {addr.type}
                              </span>
                              {!!addr.is_default && (
                                <span className="ml-1.5 text-[9px] bg-primary text-white font-semibold px-1.5 py-0.5 rounded-full">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-[9px] text-secondary-800 truncate">
                              {addr.line1}
                              {addr.line2 && `, ${addr.line2}`}
                            </p>
                            {addr.landmark && (
                              <p className="text-[9px] text-gray-500">
                                Landmark: {addr.landmark}
                              </p>
                            )}
                            <p className="text-[9px] text-secondary-800">
                              {addr.city}, {addr.state} - {addr.pincode}
                            </p>
                            <div className="flex gap-2 ">
                              <p className="text-[9px] text-gray-500">
                                Mobile: {addr.phone}
                              </p>
                              {addr.email && (
                                <p className="text-[9px] text-gray-500">
                                  Email: {addr.email}
                                </p>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 text-secondary-900 font-semibold text-sm p-3 border-2 border-dashed rounded-xl w-full hover:bg-secondary transition-colors"
                >
                  <Plus className="h-4 w-4" /> Add New Address
                </button>
              </div>

              {/* Order Note */}
              <div className="mt-4">
                <label className="text-xs font-semibold text-secondary-900 mb-1.5 block">
                  Order Note{" "}
                  <span className="text-secondary-700 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  maxLength={250}
                  placeholder="Add a delivery note (optional)"
                  className="w-full rounded-lg border bg-secondary px-3 py-2.5 text-xs text-secondary-950 placeholder:text-secondary-800 focus:outline-none focus:border-secondary-600 transition-colors resize-none"
                />
                <p className="text-right text-[10px] text-secondary-800 mt-1">
                  {orderNote.length}/250
                </p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white sm:shadow-sm sm:border sm:border-secondary-200 sm:rounded-xl sm:py-5 sm:px-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-secondary-950 flex items-center gap-2">
                  <CreditCard
                    strokeWidth={1.5}
                    className="h-5 w-5 text-primary"
                  />{" "}
                  Payment Method
                </h2>
                <span className="text-[11px] text-secondary-800 bg-secondary px-2 py-1 rounded-full">
                  {paymentMethod === "razorpay" ? "Online" : "COD"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:gap-4 gap-3">
                {[
                  {
                    value: "cod",
                    label: "Cash on Delivery",
                    icon: HandCoins,
                    iconBg: "bg-secondary text-amber-600",
                  },
                  {
                    value: "razorpay",
                    label: "UPI, Cards & Net Banking",
                    icon: CreditCard,
                    iconBg: "bg-secondary text-green-600",
                  },
                ].map((opt) => {
                  const selected = paymentMethod === opt.value;
                  const Icon = opt.icon;
                  return (
                    <label
                      key={opt.value}
                      className={`relative flex items-center gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border-2 p-3 cursor-pointer transition-all duration-200 select-none active:scale-[0.99] ${
                        selected
                          ? "border-primary bg-secondary-50"
                          : "border-secondary-200 hover:border-secondary-300 hover:bg-secondary/40"
                      }`}
                    >
                      {/* Hidden Radio */}
                      <input
                        type="radio"
                        name="payment"
                        checked={selected}
                        onChange={() => setPaymentMethod(opt.value)}
                        className="sr-only"
                      />

                      {/* Icon */}
                      <div className="relative sm:block flex-shrink-0 hidden">
                        <div
                          className={`flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl ${opt.iconBg}`}
                        >
                          <Icon
                            strokeWidth={1.2}
                            className="h-5 w-5 sm:h-6 sm:w-6"
                          />
                        </div>
                        {opt.value === "razorpay" && onlinePayOff > 0 && (
                          <span className="absolute -top-2 -left-1.5 bg-green-600 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                            ₹{onlinePayOff} OFF
                          </span>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-[13px] sm:text-sm font-semibold ${
                            selected ? "text-primary" : "text-secondary-950"
                          }`}
                        >
                          {opt.value === "cod" ? (
                            <>
                              <span className="sm:hidden">COD</span>
                              <span className="hidden sm:inline">
                                {opt.label}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="sm:hidden">UPI</span>
                              <span className="hidden sm:inline line-clamp-1 text-nowrap">
                                {opt.label}
                              </span>
                            </>
                          )}
                        </h4>
                        {opt.value === "razorpay" && onlinePayOff > 0 ? (
                          <p className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-green-600 text-nowrap">
                            Get ₹{onlinePayOff} off instantly
                          </p>
                        ) : (
                          <p className="mt-0.5 text-[10px] sm:text-[11px] font-semibold text-green-600">
                            <span className="hidden sm:inline">Pay with </span>{" "}
                            Cash or UPI
                          </p>
                        )}
                      </div>

                      {/* Selected Check Badge */}
                      <div
                        className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                          selected
                            ? "bg-primary"
                            : "bg-secondary border border-secondary-300"
                        }`}
                      >
                        {selected && (
                          <Check
                            strokeWidth={3}
                            className="h-4 w-4 sm:h-5 sm:w-5 text-white p-0.5"
                          />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-5 sticky top-20">
              {cartLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner size="md" />
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-secondary-800 text-xs uppercase tracking-widest mb-4">
                    Price Summary
                  </h3>

                  <div className="space-y-2 mb-3">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <img
                          src={
                            item.product_image ||
                            `https://picsum.photos/seed/${item.product_id}/40`
                          }
                          alt=""
                          className="w-8 h-8 object-contain bg-secondary rounded flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-secondary-790 line-clamp-1">
                            {item.product_name}
                          </p>
                          <p className="text-[10px] text-secondary-800">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className="text-xs font-semibold flex-shrink-0">
                          ₹
                          {(item.unit_price * item.quantity).toLocaleString(
                            "en-IN",
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                  <hr className="border-t-2 border-dashed border-secondary-500 my-4" />
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>₹{subtotal.toLocaleString("en-IN")}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon {couponCode && `(${couponCode})`}</span>
                        <span>− ₹{couponDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {offerDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Offer Discount</span>
                        <span>− ₹{offerDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {onlineDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Online Payment Offer</span>
                        <span>− ₹{onlineDiscount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery</span>
                      <span
                        className={
                          shipping === 0 ? "text-green-600 font-medium" : ""
                        }
                      >
                        {shipping === 0 ? "FREE" : `₹${shipping}`}
                      </span>
                    </div>
                    <hr className="border-t-2 border-dashed border-secondary-500" />
                    <div className="flex justify-between font-semibold text-base">
                      <span>Total</span>
                      <span>₹{Math.max(total, 0).toLocaleString("en-IN")}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <p className="text-green-600 text-xs font-medium pt-1">
                        You will save ₹{totalDiscount.toLocaleString("en-IN")}{" "}
                        on this order
                      </p>
                    )}
                  </div>
                  {selectedAddress && (
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-secondary-500">
                      <p className="text-xs text-secondary-800 font-semibold uppercase tracking-wide mb-1">
                        Delivering To
                      </p>
                      <p className="text-sm font-medium text-secondary-900">
                        {selectedAddress.name}
                      </p>
                      <p className="text-xs text-secondary-800">
                        {selectedAddress.line1}, {selectedAddress.city} -{" "}
                        {selectedAddress.pincode}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing}
                    className="hidden md:block w-full mt-4 bg-primary hover:bg-opacity-90 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-60"
                  >
                    {placing ? "Placing Order..." : "✓ Place Order"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-secondary-700 line-through">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
              {totalDiscount > 0 && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  -₹{totalDiscount.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-secondary-950 tabular-nums">
              ₹{Math.max(total, 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-secondary-900">
              {shipping === 0 ? (
                <span className="text-green-600 font-medium">
                  FREE Delivery
                </span>
              ) : (
                `+₹${shipping} delivery`
              )}
            </p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="bg-primary hover:bg-opacity-85 text-white font-medium px-6 py-3.5 rounded-xl text-xs transition-all active:scale-[0.97] disabled:opacity-60"
          >
            {placing ? "Placing..." : "Place Order"}
          </button>
        </div>
      </div>
    </>
  );
}
