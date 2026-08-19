import { ThumbsUp, ShoppingCart, Star, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

function RatingStars({ rating, size = "sm" }) {
  const stars = Math.round(rating * 2) / 2;
  const cls = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${cls} ${s <= stars ? "text-yellow-400 fill-yellow-400" : "text-secondary-500"}`}
        />
      ))}
    </div>
  );
}

export default function ProductCard({ product, onWishlistChange }) {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const {
    fetchWishlist,
    removeItem: removeWishlistItem,
    toggleWishlist,
  } = useWishlistStore();
  const queryClient = useQueryClient();
  const [addingToCart, setAddingToCart] = useState(false);

  // Query cached wishlist items to reflect state reactively
  const { data: wishlist = [] } = useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      if (!isAuthenticated) return [];
      return fetchWishlist();
    },
    enabled: isAuthenticated,
  });

  const isWishlisted = wishlist.some((item) => item.product_id === product.id);

  const discountPercent =
    product.mrp && product.price < product.mrp
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : null;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to add to cart");
      return;
    }
    setAddingToCart(true);
    try {
      await addItem(product.id, null, 1);
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error("Please login to save to wishlist");
      return;
    }
    try {
      if (isWishlisted) {
        const result = await removeWishlistItem(product.id);
        toast.success(
          result.success ? "Removed from wishlist" : "Failed to remove",
        );
      } else {
        const result = await toggleWishlist(product.id);
        toast.success(result.added ? "Added to wishlist!" : "Failed to add");
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      onWishlistChange?.();
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  return (
    <Link
      to={`/products/${product.slug}`}
      className="group bg-white rounded-sm border border-secondary-200 transition-all duration-300 overflow-hidden flex flex-col relative"
    >
      {/* Discount Badge */}
      {discountPercent >= 5 && (
        <div className="absolute top-2 left-2 z-10 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {discountPercent}% off
        </div>
      )}

      {/* Sponsored Badge */}
      {product.isSponsored && (
        <div className="absolute top-2 right-2 z-10 bg-secondary-200 text-secondary-600 text-[9px] px-1.5 py-0.5 rounded-sm">
          Sponsored
        </div>
      )}

      {/* Wishlist Button - Responsive: always visible on mobile, hover on desktop */}
      <button
        onClick={handleWishlist}
        className={`absolute top-2 right-2 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 hover:scale-110  ${
          isWishlisted
            ? "text-red-500"
            : "text-secondary-900 hover:text-red-500"
        }`}
        aria-label="Toggle wishlist"
      >
        <div className="relative h-4 w-4">
          {/* Thumbs Up */}
          <ThumbsUp
            strokeWidth={1.5}
            className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out ${
              isWishlisted
                ? "scale-50 rotate-90 opacity-0"
                : "scale-100 rotate-0 opacity-100"
            }`}
          />

          {/* Heart */}
          <Heart
            strokeWidth={1.5}
            className={`absolute inset-0 h-4 w-4 transition-all duration-300 ease-in-out ${
              isWishlisted
                ? "scale-100 rotate-0 opacity-100 fill-current"
                : "scale-50 -rotate-90 opacity-0"
            }`}
          />
        </div>
      </button>

      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-secondary-50 flex items-center justify-center">
        <img
          src={
            product.primary_image ||
            `https://picsum.photos/seed/${product.id}/300/300`
          }
          alt={product.name}
          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>

      {/* Product Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm text-secondary-950 line-clamp-2 mb-1 leading-tight hover:shadow-sm">
          {product.name}
        </p>

        {/* Brand */}
        {/* {product.brand_name && (
          <p className="text-xs text-secondary-600 mb-1">{product.brand_name}</p>
        )} */}

        {/* Rating */}
        {/* {product.rating && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1 bg-green-600 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">
              {parseFloat(product.rating).toFixed(1)} <Star className="h-2.5 w-2.5 fill-white" />
            </div>
            {product.total_reviews && (
              <span className="text-secondary-600 text-[11px]">({product.total_reviews?.toLocaleString('en-IN')})</span>
            )}
          </div>
        )} */}

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-secondary-950 font-medium text-sm sm:text-base">
            ₹{parseFloat(product.price).toLocaleString("en-IN")}
          </span>
          {product.mrp &&
            parseFloat(product.mrp) > parseFloat(product.price) && (
              <span className="text-secondary-700 text-[11px] sm:text-xs line-through">
                ₹{parseFloat(product.mrp).toLocaleString("en-IN")}
              </span>
            )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {product.is_cod_available === 1 && (
            <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded font-semibold">
              COD
            </span>
          )}
          {product.is_featured === 1 && (
            <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
              ✦ Assured
            </span>
          )}
        </div>

        {/* Add to Cart */}
        {/* <button
          onClick={handleAddToCart}
          disabled={addingToCart}
          className="mt-auto w-full bg-[#FF9F00] hover:bg-[#f59b00] disabled:opacity-60 text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-1.5"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          {addingToCart ? 'Adding...' : 'Add to Cart'}
        </button> */}
      </div>
    </Link>
  );
}
