import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Package,
  IndianRupee,
  Store,
  Truck,
  RotateCcw,
  Shield,
} from "lucide-react";
import { useVendorStore } from "@/store/vendorStore";
import ProductCard from "@/components/product/ProductCard";

export default function VendorStore() {
  const { vendorId } = useParams();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-store", vendorId, page],
    queryFn: async () => {
      return useVendorStore.getState().fetchVendorStore(vendorId, page, 12);
    },
  });

  if (isLoading)
    return (
      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-6 sm:px-8 lg:px-12">
        {/* Banner skeleton */}
        <div className="h-40 sm:h-52 rounded-xl bg-secondary animate-pulse mb-6" />
        {/* Info skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-secondary animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-secondary animate-pulse" />
            <div className="h-3 w-28 rounded bg-secondary animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-lg bg-secondary animate-pulse"
            />
          ))}
        </div>
        {/* Products skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-64 rounded-lg bg-secondary animate-pulse"
            />
          ))}
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-6 sm:px-8 lg:px-12 text-center flex flex-col items-center justify-center">
        <Store className="h-16 w-16 text-secondary-300 mb-4" />
        <h2 className="text-xl font-semibold text-secondary-950">
          Store not found
        </h2>
        <Link
          to="/products"
          className="mt-4 text-primary text-sm font-medium hover:underline"
        >
          Browse Products
        </Link>
      </div>
    );

  const totalPages = Math.ceil((data.totalProducts || 0) / data.limit);

  return (
    <>
      <Helmet>
        <title>{`${data.store_name} - The Damini Edit Marketplace`}</title>
        <meta
          name="description"
          content={
            data.store_description ||
            `Shop from ${data.store_name} on The Damini Edit Marketplace`
          }
        />
      </Helmet>

      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 lg:px-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-secondary-700 mb-4">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-secondary-950">{data.store_name}</span>
        </nav>

        {/* Banner */}
        <div className="relative rounded-xl overflow-hidden mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
          {data.store_banner ? (
            <img
              src={data.store_banner}
              alt={data.store_name}
              className="w-full h-40 sm:h-52 object-cover"
            />
          ) : (
            <div className="w-full h-40 sm:h-52 flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
              <Store className="h-16 w-16 text-primary/20" />
            </div>
          )}
        </div>

        {/* Store Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            {data.store_logo ? (
              <img
                src={data.store_logo}
                alt={data.store_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl shadow-md">
                {data.store_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-secondary-950">
                {data.store_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {data.rating > 0 && (
                  <div className="flex items-center gap-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                    {parseFloat(data.rating).toFixed(1)}{" "}
                    <Star className="h-3 w-3 fill-white" />
                  </div>
                )}
                <span className="text-secondary-500 text-xs">
                  {data.total_reviews?.toLocaleString("en-IN") || 0} reviews
                </span>
                <span className="text-secondary-400 text-xs">·</span>
                <span className="text-secondary-500 text-xs">
                  Since {new Date(data.created_at).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {data.store_description && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <p className="text-sm text-secondary-700 leading-relaxed">
              {data.store_description}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <Package className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <p className="font-bold text-secondary-950 text-base">
              {data.totalProducts?.toLocaleString("en-IN") || 0}
            </p>
            <p className="text-[11px] text-secondary-500">Products</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <IndianRupee className="h-5 w-5 text-green-600 mx-auto mb-1.5" />
            <p className="font-bold text-secondary-950 text-base">
              {data.total_sales
                ? `₹${parseFloat(data.total_sales).toLocaleString("en-IN")}`
                : "₹0"}
            </p>
            <p className="text-[11px] text-secondary-500">Total Sales</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 text-center">
            <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1.5" />
            <p className="font-bold text-secondary-950 text-base">
              {data.rating > 0 ? parseFloat(data.rating).toFixed(1) : "New"}
            </p>
            <p className="text-[11px] text-secondary-500">Rating</p>
          </div>
        </div>

        {/* Trust */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-secondary-900">
                  Free Delivery
                </p>
                <p className="text-[10px] text-secondary-500">Above ₹499</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-secondary-900">
                  Easy Returns
                </p>
                <p className="text-[10px] text-secondary-500">If eligible</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-orange-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-secondary-900">
                  Genuine
                </p>
                <p className="text-[10px] text-secondary-500">100% verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-secondary-950 mb-4">
            Products by {data.store_name}
          </h2>
          {data.products?.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {data.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-secondary-200 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-secondary-700 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-secondary-200 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
              <p className="text-secondary-500 text-sm">
                No products available yet
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
