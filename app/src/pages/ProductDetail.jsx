import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingCart,
  ThumbsUp,
  Star,
  Shield,
  Truck,
  RotateCcw,
  ChevronRight,
  Minus,
  Plus,
  MapPin,
  CheckCircle,
  Send,
  Percent,
  ChevronLeft,
  Image as ImageIcon,
  X,
  Tag,
  CreditCard,
  Pen,
  PenLine,
  ImagePlus,
  Heart,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useProductStore } from "@/store/productStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useReviewStore } from "@/store/reviewStore";
import ProductCard from "@/components/product/ProductCard";
import { toast } from "sonner";
import { compressImage, validateReviewImages } from "@/lib/compressImage";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

function RatingBar({ stars, percent }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="inline-flex items-center justify-end gap-0.5 min-w-[40px]">
        <span>{stars}</span>
        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
      </span>
      <div className="flex-1 bg-secondary-300 rounded h-2">
        <div
          className="bg-green-500 h-2 rounded"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="inline-flex items-center gap-0.5 text-secondary-800 min-w-[40px]">
        {percent}
        <Percent className="h-3 w-3" />
      </span>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [pincode, setPincode] = useState("");
  const [pincodechk, setPincodechk] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewPreviews, setReviewPreviews] = useState([]);
  const [drawerReview, setDrawerReview] = useState(null);
  const [drawerImgIdx, setDrawerImgIdx] = useState(0);
  const drawerImgRef = useRef(null);
  const imageRef = useRef(null);
  const reviewFileRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => useProductStore.getState().fetchProduct(slug),
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      return useWishlistStore.getState().fetchWishlist();
    },
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (product && wishlist.length > 0) {
      const found = wishlist.some((item) => item.product_id === product.id);
      setIsWishlisted(found);
    }
  }, [product, wishlist]);

  const { data: related = [] } = useQuery({
    queryKey: ["related", product?.id],
    queryFn: () => useProductStore.getState().fetchRelated(product.id),
    enabled: !!product?.id,
  });

  const { data: reviewData } = useQuery({
    queryKey: ["reviews", product?.id],
    queryFn: () => useReviewStore.getState().fetchReviews(product.id, 5),
    enabled: !!product?.id,
  });

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      navigate("/login");
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id, selectedVariant?.id || null, quantity);
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    await handleAddToCart();
    navigate("/checkout");
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error("Please login first");
      return;
    }
    try {
      if (isWishlisted) {
        const result = await useWishlistStore.getState().removeItem(product.id);
        if (!result.success) throw new Error();
        setIsWishlisted(false);
        toast.success("Removed from Wishlist!");
      } else {
        const result = await useWishlistStore
          .getState()
          .toggleWishlist(product.id);
        if (!result.added) throw new Error();
        setIsWishlisted(true);
        toast.success("Added to Wishlist!");
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to write a review");
      navigate("/login");
      return;
    }
    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setReviewSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rating", reviewRating);
      if (reviewTitle.trim()) formData.append("title", reviewTitle.trim());
      if (reviewComment.trim())
        formData.append("comment", reviewComment.trim());

      for (const file of reviewImages) {
        const compressed = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
        });
        formData.append("images", compressed);
      }

      await useReviewStore.getState().submitReview(product.id, formData);
      toast.success("Review submitted!");
      setReviewOpen(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      setReviewImages([]);
      setReviewPreviews([]);
      queryClient.invalidateQueries({ queryKey: ["reviews", product.id] });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewImageSelect = (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const { valid, errors } = validateReviewImages(files, 5);
    if (errors.length) errors.forEach((msg) => toast.error(msg));
    if (valid.length) {
      setReviewImages((prev) => [...prev, ...valid].slice(0, 5));
      for (const f of valid) {
        const url = URL.createObjectURL(f);
        setReviewPreviews((prev) => [...prev, url].slice(0, 5));
      }
    }
    e.target.value = "";
  };

  const removeReviewImage = (index) => {
    URL.revokeObjectURL(reviewPreviews[index]);
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setReviewPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const checkPincode = () => {
    if (!pincode.match(/^\d{6}$/)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    setPincodechk({ deliverable: true, days: 3 });
  };

  const currentPrice = selectedVariant?.price ?? product?.price;
  const currentMrp = selectedVariant?.mrp ?? product?.mrp;
  const discount =
    currentMrp && parseFloat(currentPrice) < parseFloat(currentMrp)
      ? Math.round(
          ((parseFloat(currentMrp) - parseFloat(currentPrice)) /
            parseFloat(currentMrp)) *
            100,
        )
      : null;
  const savings =
    currentMrp && parseFloat(currentPrice) < parseFloat(currentMrp)
      ? parseFloat(currentMrp) - parseFloat(currentPrice)
      : null;
  const images = product?.images || [];
  const activeImageUrl =
    images[activeImage]?.url ||
    product?.primary_image ||
    `https://picsum.photos/seed/${slug}/600/600`;

  const goToImage = (index) => {
    setActiveImage(index);

    if (imageRef.current) {
      imageRef.current.scrollTo({
        left: imageRef.current.clientWidth * index,
        behavior: "smooth",
      });
    }
  };

  const handleImageScroll = (e) => {
    const width = e.target.clientWidth;
    const index = Math.round(e.target.scrollLeft / width);
    setActiveImage(index);
  };

  if (isLoading)
    return (
      <>
        <Helmet>
          <title>Loading...</title>
        </Helmet>

        {/* Mobile skeleton */}
        <div className="md:hidden">
          {/* Top bar */}
          <div className="sticky top-0 z-30 bg-white border-b border-secondary-100">
            <div className="flex items-center justify-between px-3 h-11">
              <div className="w-5 h-5 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
              <div className="flex gap-3">
                <div className="w-[18px] h-[18px] rounded bg-secondary animate-pulse" />
                <div className="w-[18px] h-[18px] rounded bg-secondary animate-pulse" />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="py-2 px-4 flex flex-col gap-4">
            <div className="w-full aspect-square bg-secondary animate-pulse rounded" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 w-14 rounded bg-secondary animate-pulse"
                />
              ))}
            </div>
          </div>

          {/* Price card */}
          <div className="bg-white px-4 pt-3 pb-4 border-b border-secondary-100 space-y-2">
            <div className="flex gap-2.5">
              <div className="h-7 w-28 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-16 rounded bg-secondary animate-pulse mt-1.5" />
              <div className="h-4 w-12 rounded bg-secondary animate-pulse mt-1.5" />
            </div>
            <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
            <div className="h-5 w-4/5 rounded bg-secondary animate-pulse" />
            <div className="flex gap-2">
              <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-14 rounded bg-secondary animate-pulse" />
            </div>
          </div>

          {/* Variant */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100 space-y-2">
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-lg bg-secondary animate-pulse" />
              <div className="h-9 w-28 rounded-lg bg-secondary animate-pulse" />
              <div className="h-9 w-20 rounded-lg bg-secondary animate-pulse" />
            </div>
          </div>

          {/* Offers */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100 space-y-2">
            <div className="h-3 w-16 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-full rounded bg-secondary animate-pulse" />
            <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
          </div>

          {/* Delivery */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100 space-y-2">
            <div className="h-3 w-20 rounded bg-secondary animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 flex-1 rounded-lg bg-secondary animate-pulse" />
              <div className="h-10 w-16 rounded-lg bg-secondary animate-pulse" />
            </div>
          </div>

          {/* Trust pills */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-secondary animate-pulse" />
                <div className="space-y-1">
                  <div className="h-2.5 w-20 rounded bg-secondary animate-pulse" />
                  <div className="h-2 w-12 rounded bg-secondary animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-secondary animate-pulse" />
                <div className="space-y-1">
                  <div className="h-2.5 w-16 rounded bg-secondary animate-pulse" />
                  <div className="h-2 w-14 rounded bg-secondary animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-secondary animate-pulse" />
                <div className="space-y-1">
                  <div className="h-2.5 w-18 rounded bg-secondary animate-pulse" />
                  <div className="h-2 w-14 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100 flex items-center justify-between">
            <div className="h-4 w-20 rounded bg-secondary animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-secondary animate-pulse" />
          </div>

          {/* Desc + Details */}
          <div className="bg-white px-4 py-3 border-b border-secondary-100 space-y-2">
            <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
          </div>
          <div className="bg-white px-4 py-3 border-b border-secondary-100 space-y-2">
            <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
          </div>
        </div>

        {/* Mobile skeleton bottom bar */}
        {/* <div className="fixed bottom-16 left-0 right-0 z-40 md:hidden bg-white border-t border-secondary-100">
          <div className="flex gap-2 p-3">
            <div className="flex-1 h-12 rounded-md bg-secondary animate-pulse" />
            <div className="flex-1 h-12 rounded-md bg-secondary animate-pulse" />
          </div>
        </div> */}

        {/* Desktop skeleton */}
        <div className="hidden md:block mx-auto max-w-[1920px] min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
          <div className="h-3 w-48 rounded bg-secondary animate-pulse mb-4" />
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="aspect-square rounded bg-secondary animate-pulse mb-3" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-14 w-14 rounded bg-secondary animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-5 space-y-4">
              <div className="h-7 w-4/5 rounded bg-secondary animate-pulse" />
              <div className="h-5 w-2/3 rounded bg-secondary animate-pulse" />
              <div className="h-9 w-40 rounded bg-secondary animate-pulse" />
              <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
              <div className="bg-secondary-100 rounded-lg p-3 space-y-2">
                <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
                <div className="h-3 w-full rounded bg-secondary animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded bg-secondary animate-pulse" />
                  <div className="h-9 w-28 rounded bg-secondary animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 rounded bg-secondary animate-pulse" />
                <div className="h-9 w-24 rounded bg-secondary animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="h-12 flex-1 rounded bg-secondary animate-pulse" />
                <div className="h-12 flex-1 rounded bg-secondary animate-pulse" />
              </div>
              <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
              <div className="p-3 bg-secondary-100 rounded-lg space-y-2">
                <div className="h-4 w-28 rounded bg-secondary animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-10 flex-1 rounded bg-secondary animate-pulse" />
                  <div className="h-10 w-16 rounded bg-secondary animate-pulse" />
                </div>
              </div>
            </div>
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                <div className="h-4 w-16 rounded bg-secondary animate-pulse" />
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-secondary animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
                    <div className="h-2.5 w-20 rounded bg-secondary animate-pulse" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-10 rounded bg-secondary animate-pulse" />
                  <div className="h-5 w-20 rounded bg-secondary animate-pulse" />
                </div>
                <div className="h-3 w-full rounded bg-secondary animate-pulse" />
                <div className="h-8 w-full rounded bg-secondary animate-pulse" />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="w-4 h-4 rounded bg-secondary animate-pulse mt-0.5" />
                    <div className="space-y-1">
                      <div className="h-3.5 w-24 rounded bg-secondary animate-pulse" />
                      <div className="h-2.5 w-20 rounded bg-secondary animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow-sm p-4 space-y-2">
                <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
                <div className="h-3 w-full rounded bg-secondary animate-pulse" />
                <div className="h-3 w-full rounded bg-secondary animate-pulse" />
                <div className="h-3 w-3/4 rounded bg-secondary animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </>
    );

  if (!product)
    return (
      <div className="max-w-[1920px] mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12 text-center flex flex-col items-center justify-center">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-2xl font-medium text-secondary-950">
          Product not found
        </h2>
      </div>
    );

  return (
    <>
      <Helmet>
        <title>{`${product.name} -  The Damini Edit Marketplace`}</title>
        <meta
          name="description"
          content={
            product.seo_description ||
            product.short_description ||
            product.description?.slice(0, 155)
          }
        />
      </Helmet>

      {/* MOBILE LAYOUT (< md) */}
      <div className="md:hidden">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white">
          <div className="flex items-center justify-between px-3 h-11">
            <button onClick={() => navigate(-1)} className="p-1 -ml-1">
              <ChevronLeft
                strokeWidth={1.5}
                className="h-5 w-5 text-secondary-900"
              />
            </button>
            <span className="text-xs truncate max-w-[68%]">{product.name}</span>
            <div className="flex items-center gap-3">
              <button onClick={handleShare} className="p-1">
                <Send
                  strokeWidth={1.5}
                  className="h-5 w-5 text-secondary-800"
                />
              </button>
              <button
                onClick={handleWishlist}
                title={
                  isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"
                }
                className={`p-1 ${
                  isWishlisted
                    ? "text-red-500"
                    : "text-secondary-800 hover:text-red-500"
                }`}
              >
                <div className="relative h-5 w-5">
                  {/* Thumbs Up */}
                  <ThumbsUp
                    strokeWidth={1.5}
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                      isWishlisted
                        ? "scale-50 rotate-90 opacity-0"
                        : "scale-100 rotate-0 opacity-100"
                    }`}
                  />

                  {/* Heart */}
                  <Heart
                    strokeWidth={1.5}
                    className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                      isWishlisted
                        ? "scale-100 rotate-0 opacity-100 fill-current"
                        : "scale-50 -rotate-90 opacity-0"
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Image Carousel - full bleed */}
        <div className="bg-white overflow-hidden">
          {/* Main Slider */}
          <div className="relative">
            {images.length > 1 ? (
              <div
                ref={imageRef}
                onScroll={handleImageScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="min-w-full snap-center aspect-square flex items-center justify-center bg-white p-3"
                  >
                    <img
                      src={img.url}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-contain rounded-md"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="aspect-square flex items-center justify-center bg-white p-3">
                <img
                  src={activeImageUrl}
                  alt={product.name}
                  className="w-full h-full object-contain rounded-md"
                />
              </div>
            )}

            {/* Slider Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      activeImage === i
                        ? "w-4 h-1.5 bg-secondary-600"
                        : "w-2 h-1.5 bg-white"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="mt-1 px-3 pb-2">
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => goToImage(i)}
                    className={`flex-shrink-0 h-16 w-16 rounded-md overflow-hidden border transition-all ${
                      activeImage === i && "border-secondary-600"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.name} ${i + 1}`}
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Product Info Card */}
        <div className="bg-white px-3 pt-3 pb-2">
          {/* Price */}
          <div className="flex items-baseline gap-2.5 mb-1">
            <span className="text-2xl font-semibold text-secondary-950">
              ₹{parseFloat(currentPrice).toLocaleString("en-IN")}
            </span>
            {currentMrp &&
              parseFloat(currentMrp) > parseFloat(currentPrice) && (
                <>
                  <span className="text-secondary-700 line-through text-sm">
                    ₹{parseFloat(currentMrp).toLocaleString("en-IN")}
                  </span>
                  {discount && (
                    <span className="text-green-600 font-semibold text-sm">
                      {discount}% off
                    </span>
                  )}
                </>
              )}
          </div>
          <p className="text-green-600 text-[11px] font-medium mb-2">
            Inclusive of all taxes
          </p>

          {/* Title */}
          <h1 className="text-base leading-snug line-clamp-2 mb-1.5">
            {product.name}
          </h1>

          {/* Brand + Rating row */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.brand_name && (
              <span className="text-xs text-secondary-800">
                by{" "}
                <span className="text-primary font-medium">
                  {product.brand_name}
                </span>
              </span>
            )}
            {product.rating && (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1 py-0.5 rounded">
                  {parseFloat(product.rating).toFixed(1)}{" "}
                  <Star className="h-2.5 w-2.5 fill-white" />
                </div>
                <span className="text-secondary-800 text-[11px]">
                  ({product.total_reviews?.toLocaleString("en-IN")})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Variant selector */}
        {product.variants?.length > 0 && (
          <div className="bg-white px-4 py-3">
            <h3 className="text-xs font-semibold text-secondary-800 uppercase tracking-wider mb-2">
              Select Variant
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() =>
                    setSelectedVariant(selectedVariant?.id === v.id ? null : v)
                  }
                  disabled={!v.stock}
                  className={`px-3 py-2 text-xs border rounded-lg transition-all ${
                    selectedVariant?.id === v.id
                      ? "border-primary text-primary bg-blue-50 font-semibold"
                      : "border-secondary-200 text-secondary-700"
                  } ${!v.stock ? "opacity-40 line-through" : ""}`}
                >
                  {v.name}
                  {v.price &&
                    ` - ₹${parseFloat(v.price).toLocaleString("en-IN")}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="bg-white px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-secondary-900">
            Quantity
          </span>
          <div className="flex items-center gap-0 border rounded-lg overflow-hidden">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Minus strokeWidth={1.5} className="h-3.5 w-3.5" />
            </button>
            <span className="w-9 text-center text-sm font-medium tabular-nums">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Plus strokeWidth={1.5} className="h-3.5 w-3.5" />
            </button>
          </div>
          {product.stock < 10 && product.stock > 0 && (
            <span className="text-red-500 text-[11px] font-medium">
              Only {product.stock} left!
            </span>
          )}
        </div>

        {/* Offers */}
        <div className="bg-white px-4 py-3">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-secondary-800">
            <Tag strokeWidth={1.5} className="h-4 w-4 text-primary" />
            <span>Available Offers</span>
          </h3>

          <div className="space-y-2 text-xs">
            {discount && savings && (
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                <span className="text-secondary-800">
                  {discount}% off on this product — Save ₹
                  {savings.toLocaleString("en-IN")}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              <span className="text-secondary-800">
                100% Genuine & Quality Assured Products
              </span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              <span className="text-secondary-800">Secure Online Payments</span>
            </div>

            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              <span className="text-secondary-800">
                Fast Shipping Across India
              </span>
            </div>

            {product.is_cod_available && (
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                <span className="text-secondary-800">
                  Cash on Delivery Available
                </span>
              </div>
            )}

            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              <span className="text-secondary-800">
                Dedicated Customer Support
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Check */}
        <div className="bg-white px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin strokeWidth={1.5} className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-secondary-900">
              Delivery
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.slice(0, 6))}
              placeholder="Enter pincode"
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
            />
            <button
              onClick={checkPincode}
              className="text-white text-xs px-4 border bg-primary rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Check
            </button>
          </div>
          {pincodechk && (
            <p
              className={`mt-2 text-xs font-medium flex items-center gap-1 ${pincodechk.deliverable ? "text-green-600" : "text-red-500"}`}
            >
              {pincodechk.deliverable ? (
                <>
                  <CheckCircle className="h-3 w-3" /> Delivery in{" "}
                  {pincodechk.days} days
                </>
              ) : (
                "Not deliverable to this pincode"
              )}
            </p>
          )}
        </div>

        {/* Trust pills */}
        <div className="bg-white px-4 py-4 border-b border-secondary-200 border-dashed">
          <div
            className="flex gap-3 overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Truck strokeWidth={1.5} className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-[11px] font-semibold text-secondary-900">
                  Free Delivery
                </p>
                <p className="text-[10px] text-secondary-700">Above ₹499</p>
              </div>
            </div>
            {product.is_returnable && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <RotateCcw
                  strokeWidth={1.5}
                  className="h-4 w-4 text-green-600"
                />
                <div>
                  <p className="text-[11px] font-semibold text-secondary-900">
                    {product.return_window}-day Returns
                  </p>
                  <p className="text-[10px] text-secondary-700">
                    {product.return_type?.replace("_", " ")}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Shield strokeWidth={1.5} className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-[11px] font-semibold text-secondary-900">
                  100% Authentic
                </p>
                <p className="text-[10px] text-secondary-700">
                  Verified products
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Seller Information */}
        {product.store_name && (
          <div className="bg-white px-3 py-4">
            <h3 className="text-xs font-semibold text-secondary-800 uppercase tracking-wider mb-3">
              Sold By
            </h3>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {product.store_logo ? (
                  <img
                    src={product.store_logo}
                    alt={product.store_name}
                    className="w-11 h-11 rounded-full object-cover border border-secondary-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center text-white font-medium text-base">
                    {product.store_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <Link
                    to={`/products?vendor_id=${product.vendor_id}&store_name=${encodeURIComponent(product.store_name)}`}
                    className="text-primary font-medium text-sm hover:underline"
                  >
                    {product.store_name}
                  </Link>
                  {product.vendor_owner_name && (
                    <p className="text-[10px] text-secondary-800 mt-0.5">
                      by {product.vendor_owner_name}
                    </p>
                  )}
                </div>
              </div>

              <Link
                to={`/store/${product.vendor_id}`}
                className="text-[11px] font-medium text-primary border border-primary rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition-colors flex-shrink-0"
              >
                View Store
              </Link>
            </div>

            {product.vendor_rating && (
              <div className="flex items-center gap-2 mt-3">
                <div className="inline-flex items-center gap-1 bg-green-600 text-white text-[11px] font-semibold px-2 py-1 rounded">
                  {parseFloat(product.vendor_rating).toFixed(1)} ★
                </div>
                <span className="text-xs text-secondary-700">
                  {product.vendor_reviews?.toLocaleString("en-IN") || 0} seller
                  reviews
                </span>
              </div>
            )}

            {/* {product.store_description && (
              <p className="mt-3 text-xs text-secondary-700 leading-relaxed">
                {product.store_description}
              </p>
            )} */}

            {/* <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-lg bg-secondary p-2.5 text-center">
                <p className="font-semibold text-secondary-900 text-sm">
                  {product.vendor_total_sales
                    ? `₹${parseFloat(product.vendor_total_sales).toLocaleString("en-IN")}`
                    : "₹0"}
                </p>
                <p className="text-[10px] text-secondary-700 mt-0.5">
                  Total Sales
                </p>
              </div>
              <div className="rounded-lg bg-secondary p-2.5 text-center">
                <p className="font-semibold text-secondary-900 text-sm">
                  {product.vendor_rating
                    ? `${parseFloat(product.vendor_rating).toFixed(1)} ★`
                    : "New"}
                </p>
                <p className="text-[10px] text-secondary-700 mt-0.5">Rating</p>
              </div>
              <div className="rounded-lg bg-secondary p-2.5 text-center">
                <p className="font-semibold text-secondary-900 text-sm">
                  {product.vendor_reviews?.toLocaleString("en-IN") || "0"}
                </p>
                <p className="text-[10px] text-secondary-700 mt-0.5">Reviews</p>
              </div>
            </div> */}

            <div className="mt-3 rounded-lg bg-secondary-200 p-3">
              <h4 className="font-semibold text-xs text-secondary-800 mb-2">
                Why buy from this seller?
              </h4>
              <ul className="space-y-1 text-[10px] text-secondary-700">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Verified Marketplace Seller
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Genuine & Quality-Assured Products
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Fast Order Processing & Shipping
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Secure Packaging for Every Order
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Easy Returns on Eligible Products
                </li>

                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  Dedicated Customer Support
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Description - collapsible */}
        {product.short_description && (
          <div className="bg-white border-b border-secondary-200">
            <button
              onClick={() => setDescOpen(!descOpen)}
              className="w-full px-3 py-3 flex items-center justify-between"
            >
              <span className="text-sm font-medium text-secondary-900">
                Description
              </span>
              <ChevronRight
                className={`h-4 w-4 text-secondary-700 transition-transform ${descOpen ? "rotate-90" : ""}`}
              />
            </button>
            {descOpen && (
              <div className="px-3 pb-3 text-xs text-secondary-800 leading-relaxed">
                {product.short_description}
              </div>
            )}
          </div>
        )}

        {/* Full description - collapsible */}
        {product.description && (
          <div className="bg-white border-b border-secondary-200">
            <button
              onClick={() => setDetailsOpen(!detailsOpen)}
              className="w-full px-3 py-3 flex items-center justify-between"
            >
              <span className="text-sm font-medium text-secondary-900">
                Product Details
              </span>
              <ChevronRight
                className={`h-4 w-4 text-secondary-700 transition-transform ${detailsOpen ? "rotate-90" : ""}`}
              />
            </button>
            {detailsOpen && (
              <div className="px-3 pb-3 text-xs text-secondary-800 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            )}
          </div>
        )}

        {/* Write Review - Mobile */}
        <div
          className={`bg-white ${reviewData?.reviews?.length === 0 && "border-b border-secondary-200"}`}
        >
          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate("/login");
                return;
              }
              setReviewOpen(!reviewOpen);
            }}
            className="w-full px-3 py-3 flex items-center justify-between "
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-secondary-900">
                {reviewOpen ? "Write a Review" : "Reviews"}
              </h3>
              {!reviewOpen && reviewData?.stats?.avg_rating && (
                <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                  {parseFloat(reviewData?.stats?.avg_rating).toFixed(1)}{" "}
                  <Star className="h-3 w-3 fill-white" />
                </div>
              )}
            </div>
            <ChevronRight
              className={`h-4 w-4 text-secondary-700 transition-transform ${reviewOpen ? "rotate-90" : ""}`}
            />
          </button>

          {reviewOpen && (
            <div className="px-4 pb-4 ">
              {/* Star selector */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setReviewHover(star)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(star)}
                    className="p-0.5"
                  >
                    <Star
                      strokeWidth={1}
                      className={`h-6 w-6 sm:h-7 sm:w-7 transition-colors ${
                        star <= (reviewHover || reviewRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-secondary-600"
                      }`}
                    />
                  </button>
                ))}
                {reviewRating > 0 && (
                  <span className="text-[11px] text-secondary-700 ml-1">
                    {
                      ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][
                        reviewRating
                      ]
                    }
                  </span>
                )}
              </div>
              {/* Title */}
              <input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Review title (optional)"
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-secondary-600 mb-2"
              />
              {/* Comment */}
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Write your review (optional)"
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-secondary-600 resize-none mb-2.5"
              />
              {/* Image Picker */}
              <input
                ref={reviewFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleReviewImageSelect}
                className="hidden"
              />
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => reviewFileRef.current?.click()}
                  disabled={reviewImages.length >= 5}
                  className="flex items-center gap-1.5 text-xs text-primary border rounded px-3 py-2 hover:bg-secondary transition-colors disabled:opacity-40"
                >
                  <ImagePlus strokeWidth={1.5} className="h-4 w-4" />
                  Add Photos ({reviewImages.length}/5)
                </button>
              </div>
              {reviewPreviews.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {reviewPreviews.map((url, i) => (
                    <div
                      key={i}
                      className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-secondary-200"
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeReviewImage(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleSubmitReview}
                disabled={reviewSubmitting || reviewRating === 0}
                className="w-full bg-primary text-white py-2.5 rounded-lg text-xs disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          )}

          {/* Reviews preview */}
          {reviewData?.reviews?.length > 0 && (
            <div className="bg-white px-4 py-3 pt-0">
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide">
                {reviewData.reviews.slice(0, 3).map((r) => (
                  <div key={r.id} className="bg-white pt-3">
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide">
                      {reviewData.reviews.slice(0, 6).map((r) => (
                        <div key={r.id} className="w-24 aspect-square shrink-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="bg-green-600 text-white text-[10px] px-1 py-0.5 rounded font-bold whitespace-nowrap">
                              {r.rating} ★
                            </span>

                            <div className="flex items-start justify-between gap-2 w-full">
                              {/* <span className="flex-1 text-sm text-secondary-950 font-medium line-clamp-1 leading-3">
                                {r.title}
                              </span> */}

                              {r.is_verified === 0 && (
                                <span className="shrink-0 text-primary text-[10px] font-medium whitespace-nowrap">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                          </div>

                          {r.images?.length > 0 && (
                            <button
                              onClick={() => {
                                setDrawerReview(r);
                                setDrawerImgIdx(0);
                              }}
                              className="relative mt-1.5 border"
                            >
                              <img
                                src={r.images[0]}
                                alt="review"
                                className="h-32 w-24 rounded-md object-contain "
                              />
                              {r.images.length > 1 && (
                                <span className="absolute z-20 bottom-1 right-2 p-1 text-xs font-medium text-secondary-800">
                                  +{r.images.length - 1}
                                </span>
                              )}
                            </button>
                          )}

                          {/* <p className="mt-2 text-xs text-secondary-900 line-clamp-2">
                        {r.comment}
                      </p> */}

                          {/* <p className="mt-auto pt-2 text-[9px] text-secondary-700">
                      {r.reviewer_name?.split(" ")[0]} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p> */}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="bg-white px-3 pt-4">
            <h3 className="text-sm font-medium text-secondary-900 mb-3">
              Similar Products
            </h3>
            <Swiper
              modules={[FreeMode]}
              freeMode
              spaceBetween={10}
              slidesPerView={2}
            >
              {related.map((p) => (
                <SwiperSlide key={p.id}>
                  <ProductCard product={p} />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}
      </div>

      {/* DESKTOP LAYOUT (>= md) */}
      <div className="hidden md:block">
        <div className="max-w-[1920px] mx-auto min-h-[calc(100vh-120px)] px-8 py-8 lg:px-12">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-secondary-700 mb-8">
            <a href="/" className="hover:text-primary">
              Home
            </a>
            <ChevronRight className="h-3 w-3" />
            {product.category_name && (
              <>
                <a
                  href={`/products?category=${product.category_slug}`}
                  className="hover:text-primary"
                >
                  {product.category_name}
                </a>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            <span className="text-secondary-950 line-clamp-1">
              {product.name}
            </span>
          </nav>

          <div className="grid grid-cols-2 lg:grid-cols-[0.7fr_1fr_240px] xl:grid-cols-[0.75fr_1fr_320px] gap-8">
            {/* Image Gallery */}
            <div className="">
              <div className="bg-white sticky top-20">
                <div className="relative aspect-square mb-3 flex items-center justify-center bg-secondary rounded overflow-hidden">
                  <img
                    src={activeImageUrl}
                    alt={product.name}
                    className="max-w-full max-h-full object-contain rounded hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                    style={{ maxHeight: "450px" }}
                  />
                  <button
                    onClick={handleWishlist}
                    title={
                      isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"
                    }
                    className={`absolute top-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-all duration-300 hover:scale-110 ${
                      isWishlisted
                        ? "text-red-500"
                        : "text-secondary-900 hover:text-red-500"
                    }`}
                  >
                    <div className="relative h-5 w-5">
                      {/* Thumbs Up */}
                      <ThumbsUp
                        strokeWidth={1.5}
                        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                          isWishlisted
                            ? "scale-50 rotate-90 opacity-0"
                            : "scale-100 rotate-0 opacity-100"
                        }`}
                      />

                      {/* Heart */}
                      <Heart
                        strokeWidth={1.5}
                        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-in-out ${
                          isWishlisted
                            ? "scale-100 rotate-0 opacity-100 fill-current"
                            : "scale-50 -rotate-90 opacity-0"
                        }`}
                      />
                    </div>
                  </button>
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImage(i)}
                        className={`flex-shrink-0 w-20 h-20 border rounded overflow-hidden ${activeImage === i && "border-secondary-600"}`}
                      >
                        <img
                          src={img.url}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="bg-white p-2">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h1 className="flex-1 text-xl font-medium leading-tight line-clamp-2 md:text-2xl">
                  {product.name}
                </h1>

                <button
                  onClick={handleShare}
                  title="Share"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-secondary-900 shadow-sm transition-all hover:scale-105 hover:text-green-600"
                >
                  <Send strokeWidth={1.5} className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {product.brand_name && (
                  <span className="text-sm text-secondary-800">
                    by{" "}
                    <span className="text-primary font-medium">
                      {product.brand_name}
                    </span>
                  </span>
                )}
                {product.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      {parseFloat(product.rating).toFixed(1)}{" "}
                      <Star className="h-3 w-3 fill-white" />
                    </div>
                    <span className="text-secondary-800 text-xs">
                      {product.total_reviews?.toLocaleString("en-IN")} reviews
                    </span>
                  </div>
                )}
              </div>

              <hr className="mb-4 border-dashed" />

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-semibold text-secondary-950">
                    ₹{parseFloat(currentPrice).toLocaleString("en-IN")}
                  </span>
                  {currentMrp &&
                    parseFloat(currentMrp) > parseFloat(currentPrice) && (
                      <>
                        <span className="text-secondary-700 line-through text-lg">
                          ₹{parseFloat(currentMrp).toLocaleString("en-IN")}
                        </span>
                        <span className="text-green-600 font-semibold text-lg">
                          {discount}% off
                        </span>
                      </>
                    )}
                </div>
                <p className="text-green-600 text-sm mt-1">
                  Inclusive of all taxes
                </p>
              </div>

              {/* Delivery Check */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin strokeWidth={1.5} className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-secondary-950">
                    Check Delivery
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.slice(0, 6))}
                    placeholder="Enter 6-digit pincode"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                  />
                  <button
                    onClick={checkPincode}
                    className="text-white text-sm font-medium px-8 border bg-primary rounded-lg hover:bg-opacity-90 transition-colors"
                  >
                    Check
                  </button>
                </div>
                {pincodechk && (
                  <p
                    className={`mt-2 text-xs font-medium flex items-center gap-1 ${pincodechk.deliverable ? "text-green-600" : "text-red-500"}`}
                  >
                    {pincodechk.deliverable ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5" /> Delivery in{" "}
                        {pincodechk.days} days
                      </>
                    ) : (
                      "❌ Not deliverable to this pincode"
                    )}
                  </p>
                )}
              </div>

              {/* Offers */}
              <div className="bg-secondary rounded-lg p-3 mb-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-secondary-900">
                  <Tag strokeWidth={1.5} className="h-4 w-4 text-primary" />
                  <span>Available Offers</span>
                </h3>

                <div className="space-y-2 text-xs">
                  {discount && savings && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                      <span className="text-secondary-800">
                        {discount}% off on this product — Save ₹
                        {savings.toLocaleString("en-IN")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span className="text-secondary-800">
                      100% Genuine & Quality Assured Products
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span className="text-secondary-800">
                      Secure Online Payments
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span className="text-secondary-800">
                      Fast Shipping Across India
                    </span>
                  </div>

                  {product.is_cod_available && (
                    <div className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                      <span className="text-secondary-800">
                        Cash on Delivery Available
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                    <span className="text-secondary-800">
                      Dedicated Customer Support
                    </span>
                  </div>
                </div>
              </div>

              {/* Variants */}
              {product.variants?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-sm text-secondary-950 mb-2">
                    Available Options
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() =>
                          setSelectedVariant(
                            selectedVariant?.id === v.id ? null : v,
                          )
                        }
                        disabled={!v.stock}
                        className={`px-3 py-1.5 text-xs border rounded transition-all ${
                          selectedVariant?.id === v.id
                            ? "border-primary text-primary bg-blue-50 font-semibold"
                            : "border-secondary-200 text-secondary-900 hover:border-primary"
                        } ${!v.stock ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        {v.name}{" "}
                        {v.price &&
                          `- ₹${parseFloat(v.price).toLocaleString("en-IN")}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center gap-4 mb-5">
                <span className="text-sm font-semibold text-secondary-950">
                  Quantity:
                </span>
                <div className="flex items-center gap-2 border rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Minus strokeWidth={1.5} className="h-4 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-secondary transition-colors"
                  >
                    <Plus strokeWidth={1.5} className="h-4 w-4" />
                  </button>
                </div>
                {product.stock < 10 && product.stock > 0 && (
                  <span className="text-red-500 text-xs font-medium">
                    Only {product.stock} left!
                  </span>
                )}
              </div>

              {/* CTAs */}
              <div className="flex gap-3 mb-5">
                <button
                  onClick={handleAddToCart}
                  disabled={adding || !product.stock}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 disabled:opacity-60 text-white py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  <ShoppingCart className="h-4 w-4" />{" "}
                  {adding ? "Adding..." : "Add to Cart"}
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={!product.stock}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-opacity-90 disabled:opacity-60 text-white py-3 rounded-lg text-sm font-medium transition-colors"
                >
                  <CreditCard strokeWidth={1.8} className="h-4 w-4" /> Buy Now
                </button>
              </div>
            </div>

            {/* Seller & Policy */}
            <div className="col-span-1 md:col-span-full lg:col-span-1 w-full gap-10 flex flex-row lg:flex-col items-start">
              <div className="flex flex-col gap-6 w-full">
                {product.store_name && (
                  <div className="bg-white ">
                    <h3 className="font-semibold text-sm text-gray-800 mb-3">
                      Sold by
                    </h3>
                    <div className="flex items-center gap-2.5">
                      {product.store_logo ? (
                        <img
                          src={product.store_logo}
                          alt={product.store_name}
                          className="w-9 h-9 rounded-full object-cover border border-secondary-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {product.store_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <Link
                          to={`/products?vendor_id=${product.vendor_id}&store_name=${encodeURIComponent(product.store_name)}`}
                          className="text-primary font-medium text-sm hover:underline transition-colors"
                        >
                          {product.store_name}
                        </Link>
                        {product.vendor_owner_name && (
                          <p className="text-[10px] text-secondary-700">
                            by {product.vendor_owner_name}
                          </p>
                        )}
                      </div>
                    </div>
                    {product.vendor_rating && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                          {parseFloat(product.vendor_rating).toFixed(1)} ★
                        </span>
                        <span className="text-secondary-700 text-xs">
                          {product.vendor_reviews?.toLocaleString("en-IN") || 0}{" "}
                          reviews
                        </span>
                      </div>
                    )}
                    {/* {product.store_description && (
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3">
                      {product.store_description}
                    </p>
                  )} */}
                    <Link
                      to={`/store/${product.vendor_id}`}
                      className="mt-3 block text-center text-sm font-medium text-white bg-primary rounded-lg py-2.5 hover:bg-opacity-90 transition-colors"
                    >
                      View Store
                    </Link>
                  </div>
                )}

                <div className="bg-white border border-secondary-200 rounded-lg shadow-sm p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Truck
                      strokeWidth={1.5}
                      className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-secondary-950">
                        Free Delivery
                      </p>
                      <p className="text-xs text-secondary-800">
                        On orders above ₹499
                      </p>
                    </div>
                  </div>
                  {product.is_returnable && (
                    <div className="flex items-start gap-2.5">
                      <RotateCcw
                        strokeWidth={1.5}
                        className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-secondary-950">
                          {product.return_window}-day Returns
                        </p>
                        <p className="text-xs text-secondary-800">
                          {product.return_type?.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2.5">
                    <Shield
                      strokeWidth={1.5}
                      className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-secondary-950">
                        100% Authentic
                      </p>
                      <p className="text-xs text-secondary-800">
                        All products verified
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {product.short_description && (
                <div className="bg-white border border-secondary-200 rounded-lg shadow-sm p-4">
                  <h3 className="font-medium text-sm text-secondary-950 mb-2">
                    About this product
                  </h3>
                  <p className="text-sm text-secondary-800 leading-relaxed">
                    {product.short_description}
                  </p>
                </div>
              )}
            </div>

            {product.description && (
              <div className="col-span-3 min-h-[200px] bg-white px-4">
                <h2 className="font-semibold text-lg text-secondary-950 mb-3">
                  Product Description
                </h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {product.description}
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-white mt-4 px-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-secondary-950">
                Ratings & Reviews
              </h2>

              {reviewOpen ? (
                <button
                  onClick={() => {
                    setReviewOpen(false);
                    setReviewRating(0);
                    setReviewTitle("");
                    setReviewComment("");
                    setReviewImages([]);
                    setReviewPreviews([]);
                  }}
                  className="flex h-9 items-center justify-center rounded-full text-secondary-800 transition-colors hover:text-secondary-900"
                  aria-label="Close"
                >
                  <X strokeWidth={1.5} className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate("/login");
                      return;
                    }
                    setReviewOpen(true);
                  }}
                  className="h-9 inline-flex items-center gap-2 px-2 py-2 text-xs font-medium text-secondary-800 hover:text-secondary-900"
                >
                  <PenLine strokeWidth={1.5} className="h-4 w-4" />
                  Write Review
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-8 mt-4 mb-10">
              {/* Write Review Form - Desktop */}
              {reviewOpen && (
                <div>
                  <h3 className="font-semibold text-sm text-secondary-950 mb-3">
                    Your Review
                  </h3>
                  {/* Star selector */}
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-0.5"
                      >
                        <Star
                          strokeWidth={1.5}
                          className={`h-6 w-6 transition-colors ${
                            star <= (reviewHover || reviewRating)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-secondary-700"
                          }`}
                        />
                      </button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="text-xs text-secondary-700 ml-1">
                        {
                          [
                            "",
                            "Poor",
                            "Fair",
                            "Good",
                            "Very Good",
                            "Excellent",
                          ][reviewRating]
                        }
                      </span>
                    )}
                  </div>
                  <input
                    value={reviewTitle}
                    onChange={(e) => setReviewTitle(e.target.value)}
                    placeholder="Review title (optional)"
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-secondary-600 mb-2"
                  />
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Write your review (optional)"
                    rows={3}
                    className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-secondary-600 resize-none mb-2"
                  />
                  {/* Image Picker - Desktop */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => reviewFileRef.current?.click()}
                      disabled={reviewImages.length >= 5}
                      className="flex items-center gap-1.5 text-xs text-primary border rounded px-3 py-2 hover:bg-secondary transition-colors disabled:opacity-40"
                    >
                      <ImagePlus strokeWidth={1.5} className="h-4 w-4" />
                      Add Photos ({reviewImages.length}/5)
                    </button>
                  </div>
                  {reviewPreviews.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {reviewPreviews.map((url, i) => (
                        <div
                          key={i}
                          className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border"
                        >
                          <img
                            src={url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeReviewImage(i)}
                            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={handleSubmitReview}
                    disabled={reviewSubmitting || reviewRating === 0}
                    className="w-full bg-primary text-white  py-2.5 rounded text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {reviewSubmitting ? "Submitting..." : "Submit Review"}
                  </button>
                </div>
              )}

              {reviewData ? (
                <div className="flex gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-semibold text-secondary-950">
                      {parseFloat(reviewData.stats?.avg_rating || 0).toFixed(1)}
                    </div>
                    <div className="text-yellow-400 text-lg">
                      {"★".repeat(
                        Math.round(reviewData.stats?.avg_rating || 0),
                      )}
                    </div>
                    <div className="text-secondary-800 text-xs mt-1">
                      {reviewData.total?.toLocaleString("en-IN")} ratings
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const count =
                        reviewData.stats?.[
                          `${["", "one", "two", "three", "four", "five"][s]}_star`
                        ] || 0;
                      const pct = reviewData.total
                        ? Math.round((count / reviewData.total) * 100)
                        : 0;
                      return <RatingBar key={s} stars={s} percent={pct} />;
                    })}
                  </div>
                </div>
              ) : (
                <p className="col-span-2 text-center text-secondary-800 text-sm p-12">
                  No reviews yet. Be the first to review!
                </p>
              )}
            </div>

            {/* Reviews preview */}
            {reviewData?.reviews?.length > 0 && (
              <div className="bg-white py-3 pt-0">
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide">
                  {reviewData.reviews.slice(0, 6).map((r) => (
                    <div key={r.id} className="w-56 aspect-square shrink-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="bg-green-600 text-white text-[10px] px-1 py-0.5 rounded font-bold whitespace-nowrap">
                          {r.rating} ★
                        </span>

                        <div className="flex items-start justify-between gap-2 w-full">
                          <span className="flex-1 text-sm text-secondary-950 font-medium line-clamp-1 leading-3">
                            {r.title}
                          </span>

                          {r.is_verified === 1 && (
                            <span className="shrink-0 text-primary text-[10px] font-medium whitespace-nowrap">
                              ✓ Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {r.images?.length > 0 && (
                        <button
                          onClick={() => {
                            setDrawerReview(r);
                            setDrawerImgIdx(0);
                          }}
                          className="relative mt-2.5 border"
                        >
                          <img
                            src={r.images[0]}
                            alt="review"
                            className="h-72 w-56 rounded-md object-contain "
                          />
                          {r.images.length > 1 && (
                            <span className="absolute z-20 bottom-1 right-2 p-1 text-xs font-medium text-secondary-800">
                              +{r.images.length - 1}
                            </span>
                          )}
                        </button>
                      )}

                      {/* <p className="mt-2 text-xs text-secondary-900 line-clamp-2">
                        {r.comment}
                      </p> */}

                      {/* <p className="mt-auto pt-2 text-[9px] text-secondary-700">
                      {r.reviewer_name?.split(" ")[0]} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </p> */}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Related Products */}
          {related.length > 0 && (
            <div className="my-8 px-4 bg-white">
              <h2 className="font-semibold text-lg text-secondary-950 mb-4">
                Similar Products
              </h2>
              <Swiper
                modules={[FreeMode]}
                freeMode
                spaceBetween={12}
                slidesPerView={2}
                breakpoints={{
                  640: { slidesPerView: 3 },
                  768: { slidesPerView: 4 },
                  1024: { slidesPerView: 5 },
                  1280: { slidesPerView: 6 },
                }}
              >
                {related.map((p) => (
                  <SwiperSlide key={p.id}>
                    <ProductCard product={p} />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex gap-2 p-3">
          <button
            onClick={handleAddToCart}
            disabled={adding || !product.stock}
            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-opacity-90 disabled:opacity-60 text-white py-3 rounded-lg text-xs transition-colors"
          >
            <ShoppingCart strokeWidth={1.8} className="h-4 w-4" />{" "}
            {adding ? "Adding..." : "Add to Cart"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!product.stock}
            className="flex-1 flex items-center justify-center gap-2 bg-green-700 hover:bg-opacity-90 disabled:opacity-60 text-white py-3 rounded-lg text-xs transition-colors"
          >
            <CreditCard strokeWidth={1.8} className="h-4 w-4" /> Buy Now
          </button>
        </div>
      </div>

      {/* Review Image Popup */}
      {drawerReview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setDrawerReview(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-sm overflow-hidden rounded-xl bg-white animate-[popup_300ms_ease-out_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setDrawerReview(null)}
              className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition hover:bg-black/70"
            >
              <X className="h-4 w-4 text-white" />
            </button>

            {/* Image Slider */}
            <div className="relative bg-black">
              <div
                ref={drawerImgRef}
                className="flex h-full overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x scrollbar-hide"
                style={{
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
                onScroll={(e) => {
                  const width = e.currentTarget.clientWidth;
                  const index = Math.round(e.currentTarget.scrollLeft / width);
                  setDrawerImgIdx(index);
                }}
              >
                {drawerReview.images.map((img, i) => (
                  <div
                    key={i}
                    className="min-w-full h-full shrink-0 snap-center"
                  >
                    <img
                      src={img}
                      alt={`Review ${i + 1}`}
                      draggable={false}
                      className="w-full h-full object-cover select-none"
                    />
                  </div>
                ))}
              </div>

              {/* Close */}
              <button
                onClick={() => setDrawerReview(null)}
                className="absolute top-3 right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition hover:bg-black/70"
              >
                <X className="h-4 w-4 text-white" />
              </button>

              {/* Counter */}
              {drawerReview.images.length > 1 && (
                <div className="absolute top-3 left-3 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur">
                  {drawerImgIdx + 1}/{drawerReview.images.length}
                </div>
              )}

              {/* Pagination Dots */}
              {drawerReview.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1">
                  {drawerReview.images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        drawerImgRef.current?.scrollTo({
                          left: i * drawerImgRef.current.clientWidth,
                          behavior: "smooth",
                        })
                      }
                      className={`transition-all duration-300 rounded-full ${
                        i === drawerImgIdx
                          ? "w-4 h-1.5 bg-white"
                          : "w-2 h-1.5 bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Review Details */}
            <div className="bg-white w-full p-4 flex justify-between items-center gap-2 ">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white">
                    {drawerReview.rating}
                    <Star className="h-3 w-3 fill-white" />
                  </span>

                  {drawerReview.is_verified === 1 && (
                    <span className="text-xs font-medium text-primary">
                      ✓ Verified Purchase
                    </span>
                  )}
                </div>

                {/* {drawerReview.title && (
                  <h3 className="mb-0.5 text-xs font-semibold text-secondary-950 line-clamp-1">
                    {drawerReview.title}
                  </h3>
                )} */}

                {drawerReview.comment && (
                  <p className="text-xs leading-4 line-clamp-2 text-secondary-900">
                    {drawerReview.comment}
                  </p>
                )}
              </div>

              <div className="text-nowrap self-end">
                <p className="text-[11px] font-medium text-secondary-900">
                  {drawerReview.reviewer_name}
                </p>

                <p className="text-[11px] text-secondary-700">
                  {new Date(drawerReview.created_at).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
