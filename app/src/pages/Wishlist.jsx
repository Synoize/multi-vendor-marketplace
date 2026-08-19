import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Heart, ShoppingCart, Trash2, Package, ArrowRight } from "lucide-react";
import { useWishlistStore } from "@/store/wishlistStore";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";

export default function Wishlist() {
  const { addItem, fetchCart } = useCartStore();
  const { removeItem, moveToCart } = useWishlistStore();
  const {
    data: wishlist = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => useWishlistStore.getState().fetchWishlist(),
  });

  const handleRemove = async (productId) => {
    const result = await removeItem(productId);
    if (result.success) {
      refetch();
      toast.success("Removed from wishlist");
    } else {
      toast.error("Failed to remove");
    }
  };

  const handleMoveToCart = async (productId) => {
    const result = await moveToCart(productId);
    if (result.success) {
      refetch();
      fetchCart();
      toast.success("Moved to cart!");
    } else {
      toast.error("Failed to move to cart");
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <>
      <Helmet>
        <title>My Wishlist - The Damini Edit</title>
      </Helmet>
      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:py-8 sm:px-8 lg:px-12">
        <PageHeader
          className="mb-2 sm:mb-4"
          title="My Wishlist"
          right={
            <p className="mt-0.5 text-xs sm:text-sm text-secondary-900">
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"} in
              your cart
            </p>
          }
        />
        {wishlist.length === 0 ? (
          <div className="flex items-center justify-center py-28">
            <div className="w-full max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
                <Heart strokeWidth={1} className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-lg sm:text-2xl font-medium text-secondary-950">
                Your wishlist is empty
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-secondary-700">
                Save items you love and shop them anytime
              </p>
              <Link
                to="/products"
                className="group mt-8 inline-flex h-10 sm:h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-xs sm:text-sm text-white shadow-sm"
              >
                Explore Products
                <ArrowRight
                  strokeWidth={1.8}
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {wishlist.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden group relative"
              >
                <button
                  onClick={() => handleRemove(item.product_id)}
                  className="absolute top-2 right-2 z-10 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-secondary-700 hover:text-red-500 transition-colors"
                >
                  <Trash2 strokeWidth={1.5} className="h-3.5 w-3.5" />
                </button>
                <Link to={`/products/${item.product_slug || item.product_id}`}>
                  <div className="aspect-square bg-secondary flex items-center justify-center overflow-hidden">
                    <img
                      src={
                        item.product_image ||
                        item.primary_image ||
                        `https://picsum.photos/seed/${item.product_id}/300`
                      }
                      alt={item.product_name}
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-secondary-950 line-clamp-1 mb-1">
                      {item.product_name}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-secondary-950">
                        ₹{parseFloat(item.price).toLocaleString("en-IN")}
                      </span>
                      {item.mrp && item.mrp > item.price && (
                        <span className="text-secondary-700 text-xs line-through">
                          ₹{parseFloat(item.mrp).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => handleMoveToCart(item.product_id)}
                  className="w-full bg-primary hover:bg-opacity-90 text-white text-xs font-medium py-2 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ShoppingCart className="h-3.5 w-3.5" /> Move to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
