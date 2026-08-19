import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  ShoppingBag,
  ArrowRight,
  Heart,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Truck,
  BadgeDollarSign,
  Gift,
} from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCouponStore } from "@/store/couponStore";
import { useOfferStore } from "@/store/offerStore";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import Spinner from "@/components/ui/Spinner";
import PageHeader from "@/components/ui/PageHeader";

export default function Cart() {
  const navigate = useNavigate();
  const { toggleWishlist } = useWishlistStore();
  const queryClient = useQueryClient();
  const {
    items: cartItems,
    total: cartTotal,
    fetchCart,
    updateQuantity,
    removeItem: storeRemoveItem,
    freeShippingThreshold,
    shippingCharge,
  } = useCartStore();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState(null);
  const [offerLoading, setOfferLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [couponOpen, setCouponOpen] = useState(false);

  const { data: activeOffers = [] } = useQuery({
    queryKey: ["cart-active-offers"],
    queryFn: async () => {
      const data = await useOfferStore.getState().fetchActiveOffers();
      return data || [];
    },
    staleTime: 60000,
  });

  useEffect(() => {
    fetchCart().finally(() => setLoading(false));
  }, []);

  const updateQty = async (itemId, quantity) => {
    try {
      await updateQuantity(itemId, quantity);
    } catch {
      toast.error("Failed to update quantity");
    }
  };

  const removeItem = async (itemId) => {
    try {
      await storeRemoveItem(itemId);
      toast.success("Item removed from cart");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const handleSaveForLater = async (itemId) => {
    const item = cartItems.find((i) => i.id === itemId);
    if (!item) return;
    try {
      await toggleWishlist(item.product_id);
      await storeRemoveItem(itemId);
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success("Saved for later");
    } catch {
      toast.error("Failed to save for later");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const { data } = await useCouponStore
        .getState()
        .validateCoupon(couponCode, cartTotal || 0);
      setAppliedCoupon({
        code: couponCode,
        discount: data.discount || 0,
      });
      toast.success(`Coupon applied! Saved ₹${data.discount}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid coupon code");
    } finally {
      setCouponLoading(false);
    }
  };

  const applyOffer = async (offer) => {
    if (!cartItems?.length) return;
    setOfferLoading(true);
    try {
      const cartItemsPayload = cartItems.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        unit_price: i.unit_price,
        quantity: i.quantity,
      }));
      const { data } = await useOfferStore
        .getState()
        .validateOffer(offer.id, cartItemsPayload, cartTotal || 0);
      setAppliedOffer({
        id: offer.id,
        title: offer.title,
        discount: data.discount || 0,
      });
      toast.success(`Offer applied! Saved ₹${data.discount}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot apply this offer");
    } finally {
      setOfferLoading(false);
    }
  };

  const removeOffer = () => {
    setAppliedOffer(null);
  };

  useEffect(() => {
    if (!appliedOffer) return;
    if (!cartItems?.length) {
      setAppliedOffer(null);
      return;
    }
    let cancelled = false;
    const revalidate = async () => {
      const payload = cartItems.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        unit_price: i.unit_price,
        quantity: i.quantity,
      }));
      try {
        const { data } = await useOfferStore
          .getState()
          .validateOffer(appliedOffer.id, payload, cartTotal || 0);
        if (cancelled) return;
        const newDiscount = data.discount || 0;
        setAppliedOffer((prev) =>
          prev && prev.discount !== newDiscount
            ? { ...prev, discount: newDiscount }
            : prev,
        );
      } catch {
        if (cancelled) return;
        setAppliedOffer(null);
        toast.error("Offer no longer applicable — removed");
      }
    };
    revalidate();
    return () => {
      cancelled = true;
    };
  }, [cartItems, cartTotal]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );

  const items = cartItems || [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  const discount =
    (appliedCoupon?.discount || 0) + (appliedOffer?.discount || 0);
  const shipping =
    subtotal >= (freeShippingThreshold || 499) ? 0 : shippingCharge || 40;
  const total = Math.max(0, subtotal - discount + shipping);

  if (items.length === 0) {
    return (
      <>
        <Helmet>
          <title>Shopping Cart - The Damini Edit</title>
        </Helmet>
        <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-[1920px] items-center justify-center px-4 sm:px-8 lg:px-12">
          <div className="h-full w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
              <ShoppingBag strokeWidth={1} className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-lg sm:text-2xl font-medium text-secondary-950">
              Your cart is empty
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-secondary-700">
              Looks like you haven't added anything to your cart yet.
            </p>
            <Link
              to="/products"
              className="group mt-8 inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-xs sm:text-sm text-white shadow-sm"
            >
              Continue Shopping
              <ArrowRight
                strokeWidth={1.8}
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Cart (${items.length}) - The Damini Edit`}</title>
      </Helmet>

      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:py-8 sm:px-8 lg:px-12">
        {/* Header */}
        <PageHeader
          className="mb-2 sm:mb-4"
          title="My Cart"
          right={
            <p className="mt-0.5 text-xs sm:text-sm text-secondary-900">
              {items.length} {items.length === 1 ? "item" : "items"} in your
              cart
            </p>
          }
        />

        <div className="flex flex-col md:flex-row gap-0 md:gap-5">
          {/* Cart Items */}
          <div className="flex-1 min-w-0">
            {/* Mobile: full-width card-style items */}
            <div className="md:hidden divide-y divide-secondary-300 bg-white">
              {items.map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex gap-3">
                    <Link
                      to={`/products/${item.product_slug || item.product_id}`}
                      className="w-14 h-14 flex-shrink-0 bg-secondary rounded-lg overflow-hidden"
                    >
                      <img
                        src={
                          item.product_image ||
                          `https://picsum.photos/seed/${item.product_id}/200`
                        }
                        alt={item.product_name}
                        className="w-full h-full object-contain"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/products/${item.product_slug || item.product_id}`}
                        className="text-xs font-medium text-secondary-950 line-clamp-1 leading-snug"
                      >
                        {item.product_name}
                      </Link>
                      {item.variant_name && (
                        <p className="text-[11px] text-secondary-700 mt-0.5">
                          {item.variant_name}
                        </p>
                      )}
                      {/* <p className="text-[11px] text-primary mt-0.5">
                        {item.vendor_name || "The Damini Edit Store"}
                      </p> */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm font-medium text-secondary-950">
                          ₹{parseFloat(item.unit_price).toLocaleString("en-IN")}
                        </span>
                        {item.mrp && item.mrp > item.unit_price && (
                          <span className="text-[11px] text-secondary-600 line-through">
                            ₹{parseFloat(item.mrp).toLocaleString("en-IN")}
                          </span>
                        )}
                        {item.mrp && item.mrp > item.unit_price && (
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            {Math.round(
                              ((item.mrp - item.unit_price) / item.mrp) * 100,
                            )}
                            % off
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom row: quantity + actions */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-0 border rounded-lg overflow-hidden">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? updateQty(item.id, item.quantity - 1)
                            : removeItem(item.id)
                        }
                        className="w-8 h-8 flex items-center justify-center hover:bg-secondary active:bg-secondary-100 transition-colors"
                      >
                        {item.quantity === 1 ? (
                          <Trash2
                            strokeWidth={1.5}
                            className="h-3.5 w-3.5 text-red-500"
                          />
                        ) : (
                          <Minus strokeWidth={1.5} className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <span className="w-8 text-center text-xs font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-secondary active:bg-secondary-100 transition-colors"
                      >
                        <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSaveForLater(item.id)}
                        className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-secondary-800 hover:text-red-500 focus:outline-none"
                      >
                        <Heart className="h-3.5 w-3.5 group-focus-within:fill-red-500 group-focus-within:text-red-500 transition-colors" />
                        Save
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-1 text-[11px] text-secondary-800 hover:text-red-500 px-2 py-1.5 transition-colors"
                      >
                        <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />{" "}
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: card-style items */}
            <div className="hidden md:block space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-secondary-200 rounded-2xl shadow-sm p-4 flex gap-4"
                >
                  <Link
                    to={`/products/${item.product_slug || item.product_id}`}
                    className="w-28 h-28 flex-shrink-0 bg-secondary rounded-lg overflow-hidden"
                  >
                    <img
                      src={
                        item.product_image ||
                        `https://picsum.photos/seed/${item.product_id}/200`
                      }
                      alt={item.product_name}
                      className="w-full h-full object-contain"
                    />
                  </Link>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <Link
                        to={`/products/${item.product_slug || item.product_id}`}
                        className="text-sm font-medium text-secondary-950 line-clamp-1"
                      >
                        {item.product_name}
                      </Link>
                      {item.variant_name && (
                        <p className="text-xs text-secondary-700 mt-0.5">
                          {item.variant_name}
                        </p>
                      )}
                      {/* <p className="text-primary text-xs mt-1">
                      {item.vendor_name || "The Damini Edit Store"}
                      </p> */}

                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-semibold text-secondary-950">
                          ₹{parseFloat(item.unit_price).toLocaleString("en-IN")}
                        </span>
                        {item.mrp && item.mrp > item.unit_price && (
                          <span className="text-xs text-secondary-600 line-through">
                            ₹{parseFloat(item.mrp).toLocaleString("en-IN")}
                          </span>
                        )}
                        {item.mrp && item.mrp > item.unit_price && (
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                            {Math.round(
                              ((item.mrp - item.unit_price) / item.mrp) * 100,
                            )}
                            % off
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-2 border rounded">
                        <button
                          onClick={() =>
                            item.quantity > 1
                              ? updateQty(item.id, item.quantity - 1)
                              : removeItem(item.id)
                          }
                          className="w-9 h-9 flex items-center justify-center hover:bg-secondary active:bg-secondary-100 transition-colors"
                        >
                          {item.quantity === 1 ? (
                            <Trash2
                              strokeWidth={1.5}
                              className="h-3.5 w-3.5 text-red-500"
                            />
                          ) : (
                            <Minus strokeWidth={1.5} className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <span className="w-7 text-center text-xs font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center hover:bg-secondary active:bg-secondary-100 transition-colors"
                        >
                          <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleSaveForLater(item.id)}
                        className="group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-secondary-800 hover:text-red-500 focus:outline-none"
                      >
                        <Heart className="h-4 w-4 group-focus-within:fill-red-500 group-focus-within:text-red-500 transition-colors" />
                        Save <span className="hidden lg:block">for later</span>
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-1 text-xs text-secondary-800 hover:text-red-500 px-2 py-1.5 transition-colors"
                      >
                        <Trash2 strokeWidth={1.5} className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-secondary-950">
                      ₹
                      {(
                        parseFloat(item.unit_price) * item.quantity
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile: Coupon */}
            <div className="md:hidden bg-white">
              <button
                onClick={() => setCouponOpen(!couponOpen)}
                className="w-full flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Tag strokeWidth={1.5} className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-secondary-950">
                    {appliedCoupon
                      ? `Coupon Applied: ${appliedCoupon.code}`
                      : "Have a coupon?"}
                  </span>
                </div>
                {couponOpen ? (
                  <ChevronUp className="h-4 w-4 text-secondary-800" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-secondary-800" />
                )}
              </button>
              {couponOpen && (
                <div className="pb-4">
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) =>
                        setCouponCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter coupon code"
                      disabled={!!appliedCoupon}
                      className="flex-1 border rounded-xl px-3 py-2.5 text-sm uppercase font-mono outline-none focus:border-secondary-700"
                    />
                    {appliedCoupon ? (
                      <button
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                        className="px-6 py-2.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={applyCoupon}
                        disabled={couponLoading}
                        className="px-6 py-2.5 bg-primary hover:bg-opacity-90 text-white rounded-xl text-xs font-medium disabled:opacity-60"
                      >
                        {couponLoading ? "..." : "Apply"}
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="mt-2 text-green-600 text-xs font-medium">
                      ✓ Saved ₹{appliedCoupon.discount}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Mobile: Active Offers */}
            <div className="md:hidden">
              {activeOffers.length > 0 && !appliedOffer && (
                <div className="pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift strokeWidth={1.5} className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-xs text-secondary-950 uppercase tracking-widest">
                      Offers for you
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {activeOffers.slice(0, 3).map((offer) => (
                      <button
                        key={offer.id}
                        onClick={() => applyOffer(offer)}
                        disabled={offerLoading}
                        className="w-full text-left p-2.5 rounded-xl border border-secondary-200 hover:bg-secondary transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-secondary-950">
                            {offer.title}
                          </span>
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap ml-1">
                            {offer.type === "bogo"
                              ? `Buy ${offer.buy_quantity} Get ${offer.get_quantity}`
                              : offer.type === "percentage"
                                ? `${offer.discount_value}% Off`
                                : offer.type === "fixed"
                                  ? `₹${offer.discount_value} Off`
                                  : "Free Shipping"}
                          </span>
                        </div>
                        {offer.description && (
                          <p className="text-[10px] text-secondary-700 mt-0.5">
                            {offer.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {appliedOffer && (
                <div className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-700">
                      {appliedOffer.title}
                    </p>
                    <p className="text-[10px] text-green-600">
                      − ₹{appliedOffer.discount} savings
                    </p>
                  </div>
                  <button
                    onClick={removeOffer}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Mobile: Price Details */}
            <div className="md:hidden pt-3 border-t-2 border-dashed border-secondary-500">
              <h3 className="font-semibold text-secondary-950 text-xs uppercase tracking-widest mb-3">
                Price Details
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <p className="text-secondary-900">
                    Price{" "}
                    <span className="font-semibold text-secondary-900 text-xs">
                      x {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </p>
                  <span className="text-secondary-950">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>− ₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-secondary-900">Delivery Charges</span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">FREE</span>
                  ) : (
                    <span className="text-secondary-950">₹{shipping}</span>
                  )}
                </div>
                <hr className="my-4 border-t-2 border-dashed border-secondary-500" />
                <div className="flex justify-between font-semibold text-base text-secondary-950">
                  <span className="font-medium">Total Amount</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <p className="text-green-600 text-xs font-medium">
                    You will save ₹{discount.toLocaleString("en-IN")} on this
                    order
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Price Summary - Desktop */}
          <div className="hidden md:block w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-secondary-200 shadow-sm p-5 sticky top-20">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tag strokeWidth={1.5} className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm text-secondary-950">
                    Have a coupon?
                  </h3>
                </div>
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) =>
                      setCouponCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter coupon code"
                    disabled={!!appliedCoupon}
                    className="w-full border rounded-xl px-3 py-2 text-sm uppercase font-mono outline-none focus:border-secondary-700"
                  />
                  {appliedCoupon ? (
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                      className="px-6 py-2 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={applyCoupon}
                      disabled={couponLoading}
                      className="px-6 py-2.5 bg-primary hover:bg-opacity-90 text-white rounded-xl text-sm font-medium disabled:opacity-60"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  )}
                </div>
                {appliedCoupon && (
                  <p className="mt-2 text-green-600 text-xs font-medium">
                    ✓ Coupon "{appliedCoupon.code}" applied — Saved ₹
                    {appliedCoupon.discount}
                  </p>
                )}
              </div>

              {/* Active Offers */}
              {activeOffers.length > 0 && !appliedOffer && (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift strokeWidth={1.5} className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-xs text-secondary-950 uppercase tracking-widest">
                      Offers for you
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {activeOffers.slice(0, 3).map((offer) => (
                      <button
                        key={offer.id}
                        onClick={() => applyOffer(offer)}
                        disabled={offerLoading}
                        className="w-full text-left p-2.5 rounded-xl border border-secondary-200 hover:bg-secondary transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-secondary-950">
                            {offer.title}
                          </span>
                          <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap ml-1">
                            {offer.type === "bogo"
                              ? `Buy ${offer.buy_quantity} Get ${offer.get_quantity}`
                              : offer.type === "percentage"
                                ? `${offer.discount_value}% Off`
                                : offer.type === "fixed"
                                  ? `₹${offer.discount_value} Off`
                                  : "Free Shipping"}
                          </span>
                        </div>
                        {offer.description && (
                          <p className="text-[10px] text-secondary-700 mt-0.5">
                            {offer.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {appliedOffer && (
                <div className="mt-3 p-2.5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-700">
                      {appliedOffer.title}
                    </p>
                    <p className="text-[10px] text-green-600">
                      − ₹{appliedOffer.discount} savings
                    </p>
                  </div>
                  <button
                    onClick={removeOffer}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                </div>
              )}
              <hr className="mt-4 border-t-2 border-dashed border-secondary-500" />
              <h3 className="mt-4 font-medium text-secondary-950 text-xs uppercase tracking-widest mb-4">
                Price Details
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <p className="text-secondary-900">
                    Price{" "}
                    <span className="font-semibold text-secondary-900 text-xs">
                      x {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </p>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>− ₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-secondary-900">Delivery Charges</span>
                  {shipping === 0 ? (
                    <span className="text-green-600 font-medium">FREE</span>
                  ) : (
                    <span>₹{shipping}</span>
                  )}
                </div>
                <hr className=" border-t-2 border-dashed border-secondary-500" />
                <div className="flex justify-between font-semibold text-base text-secondary-950">
                  <span className="font-medium">Total Amount</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <p className="text-green-600 text-xs font-medium">
                    You will save ₹{discount.toLocaleString("en-IN")} on this
                    order 🎉
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  navigate("/checkout", {
                    state: {
                      offerId: appliedOffer?.id || null,
                      offerDiscount: appliedOffer?.discount || 0,
                      couponDiscount: appliedCoupon?.discount || 0,
                      couponCode: appliedCoupon?.code || null,
                    },
                  })
                }
                className="w-full bg-primary hover:bg-opacity-90 text-white font-semibold py-3.5 rounded-xl text-sm transition-colors mt-4"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-secondary-700 line-through">
                ₹{subtotal.toLocaleString("en-IN")}
              </span>
              {discount > 0 && (
                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                  -₹{discount.toLocaleString("en-IN")}
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-secondary-950 tabular-nums">
              ₹{total.toLocaleString("en-IN")}
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
            onClick={() =>
              navigate("/checkout", {
                state: {
                  offerId: appliedOffer?.id || null,
                  offerDiscount: appliedOffer?.discount || 0,
                  couponDiscount: appliedCoupon?.discount || 0,
                  couponCode: appliedCoupon?.code || null,
                },
              })
            }
            className="bg-primary hover:bg-opacity-85 text-white font-medium px-6 py-3.5 rounded-xl text-xs transition-all active:scale-[0.97]"
          >
            Place Order
          </button>
        </div>
      </div>
    </>
  );
}
