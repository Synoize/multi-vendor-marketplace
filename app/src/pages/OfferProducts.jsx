import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useOfferStore } from "@/store/offerStore";
import ProductCard from "@/components/product/ProductCard";
import { SkeletonProductGrid } from "@/components/ui/SkeletonCard";
import { Gift, ChevronLeft, ChevronRight, ShoppingBasket } from "lucide-react";

const PAGE_SIZE = 20;

function offerTagline(offer) {
  switch (offer.type) {
    case "bogo":
      return `Buy ${offer.buy_quantity} Get ${offer.get_quantity} ${
        offer.discount_percent < 100 ? `${offer.discount_percent}% Off` : "Free"
      }`;
    case "percentage":
      return `${offer.discount_value}% Off${
        offer.max_discount ? ` (max ₹${offer.max_discount})` : ""
      }`;
    case "fixed":
      return `₹${offer.discount_value} Off`;
    case "free_shipping":
      return "Free Shipping";
    default:
      return "";
  }
}

export default function OfferProducts() {
  const { id } = useParams();
  const [count, setCount] = useState(PAGE_SIZE);

  const { data, isLoading } = useQuery({
    queryKey: ["offer-products", id, count],
    queryFn: async () => {
      const data = await useOfferStore
        .getState()
        .fetchOfferProducts(id, `limit=${count}`);
      return data;
    },
    placeholderData: (prev) => prev,
  });

  const offer = data?.offer;
  const products = data?.products || [];

  const handleLoadMore = () => {
    setCount((c) => c + PAGE_SIZE);
  };

  const isActive =
    offer &&
    offer.is_active === 1 &&
    new Date(offer.valid_from) <= new Date() &&
    new Date(offer.valid_to) >= new Date();

  return (
    <>
      <Helmet>
        <title>
          {(offer ? `${offer.title} - ` : "Offer Products - ") +
            "The Damini Edit"}
        </title>
        <meta
          name="description"
          content={
            offer
              ? `Shop all products in the ${offer.title} offer on The Damini Edit.`
              : "Offer products on The Damini Edit."
          }
        />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-secondary-700 hover:text-secondary-950 mb-4 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        {isLoading && !offer ? (
          <>
            <div className="h-40 bg-secondary-200 rounded-2xl animate-pulse" />
            <div className="mt-6">
              <SkeletonProductGrid count={8} />
            </div>
          </>
        ) : !offer ? (
          <div className="text-center py-24">
            <Gift className="h-10 w-10 text-secondary-400 mx-auto mb-3" />
            <p className="text-secondary-800 text-sm">
              This offer could not be found.
            </p>
            <Link
              to="/"
              className="inline-block mt-4 text-xs text-primary font-semibold hover:underline"
            >
              Continue shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-accent text-white mb-6 sm:mb-8">
              {offer.image && (
                <img
                  src={offer.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
              )}
              <div className="relative z-10 flex items-center justify-between gap-6 px-5 py-6 sm:px-8 sm:py-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {offer.badge_text && (
                      <span className="text-[10px] font-bold bg-white/20 backdrop-blur px-2 py-0.5 rounded">
                        {offer.badge_text}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold bg-white/15 backdrop-blur px-2 py-0.5 rounded">
                      {offerTagline(offer)}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-3xl font-semibold">
                    {offer.title}
                  </h1>
                  {offer.description && (
                    <p className="text-secondary text-xs sm:text-sm mt-1 max-w-xl">
                      {offer.description}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {isActive && (
                      <span className="text-[10px] font-semibold bg-green-500/90 px-2 py-0.5 rounded">
                        ● Live Now
                      </span>
                    )}
                    <span className="text-[10px] text-white/80">
                      Valid{" "}
                      {new Date(offer.valid_from).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      –{" "}
                      {new Date(offer.valid_to).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center flex-shrink-0">
                  <Gift className="w-7 h-7" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-medium text-black">
                {offer.title} Products
              </h2>
              <span className="text-xs text-secondary-700">
                {data?.total ?? products.length} item
                {(data?.total ?? products.length) === 1 ? "" : "s"}
              </span>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24">
                <ShoppingBasket
                  strokeWidth={1}
                  className="mb-3 h-10 w-10 text-secondary-700"
                />
                <p className="text-center text-sm text-secondary-700">
                  No products under this offer right now.
                </p>
              </div>
            )}

            {data?.hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  className="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-6 py-2.5 text-sm font-medium text-secondary-900 hover:border-primary hover:text-primary transition-colors"
                >
                  Load More <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}