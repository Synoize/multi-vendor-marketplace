import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  Zap,
  Clock,
  ShieldCheck,
  Truck,
  BadgeDollarSign,
  RefreshCw,
  ArrowRight,
  Play,
  X,
  Clapperboard,
  ShoppingBasket,
} from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { useBannerStore } from "@/store/bannerStore";
import { useOfferStore } from "@/store/offerStore";
import ProductCard from "@/components/product/ProductCard";
import {
  SkeletonProductGrid,
  SkeletonBanner,
} from "@/components/ui/SkeletonCard";
import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import WelcomePopup from "@/components/ui/WelcomePopup";
import { useAuthStore } from "@/store/authStore";
import "swiper/css";
import "swiper/css/pagination";

// Countdown Timer
function CountdownTimer({ targetDate }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 });
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor((new Date(targetDate) - Date.now()) / 1000),
      );
      setTime({
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {[
        ["d", "Days"],
        ["h", "Hrs"],
        ["m", "Min"],
        ["s", "Sec"],
      ].map(([k, label]) => (
        <div key={k} className="flex flex-col items-center">
          <div className="flex h-6 w-6 sm:w-8 sm:h-8 md:h-12 md:w-12 items-center justify-center rounded-lg bg-primary-600 text-[8px] sm:text-sm md:text-lg font-semibold text-white tabular-nums shadow-sm">
            {pad(time[k])}
          </div>

          <span className="mt-1 text-[6px] sm:text-[8px] md:text-[11px] font-medium uppercase tracking-wide text-white/80">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// Hero Banner Carousel (manual, no lib required)
function HeroBanner({ banners }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!banners.length) return;
    const interval = setInterval(
      () => setActive((i) => (i + 1) % banners.length),
      4000,
    );
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return <SkeletonBanner />;
  return (
    <div className="relative overflow-hidden rounded-xl bg-secondary-200 aspect-[6/3] md:aspect-[5/2]">
      {banners.map((b, i) => (
        <div
          key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === active ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          <Link to={b.link || "#"}>
            <img
              src={b.image || `https://picsum.photos/seed/${b.id}/1200/400`}
              alt={b.title}
              className="w-full h-full object-cover"
            />
          </Link>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-4 bg-secondary" : "w-2 bg-black/30"}`}
          />
        ))}
      </div>
    </div>
  );
}

// Section Header
function SectionHeader({ title, subtitle, link, linkText = "View All", icon }) {
  return (
    <div className="flex items-center justify-between mb-4 md:mb-8 px-4 sm:px-10 lg:px-14">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="sm:text-lg md:text-xl font-medium text-black">
            {title}
          </h2>
        </div>
        {subtitle && (
          <p className="text-secondary-800 font-light text-xs md:text-sm mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {link && (
        <Link
          to={link}
          className="flex items-center gap-1 text-secondary-800 hover:text-secondary-900 text-xs transition-colors"
        >
          {linkText} <ChevronRight strokeWidth={1.5} className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function CategoryPill({ cat }) {
  return (
    <Link
      to={`/products?category=${cat.slug}`}
      className="group flex min-w-[72px] flex-col items-center gap-2 sm:min-w-[90px] sm:gap-3 lg:min-w-0"
    >
      <div className="flex items-center justify-center rounded-full bg-secondary-200 transition-all duration-300 group-hover:bg-secondary-300 h-20 w-20 sm:h-24 sm:w-24 p-4">
        <img
          src={cat.icon || cat.image}
          alt={cat.name}
          className="object-contain transition-all duration-300 group-hover:scale-110 h-full w-full"
        />
      </div>

      <span className="text-center text-[11px] leading-tight text-secondary-800 line-clamp-1 transition-colors group-hover:text-secondary-950 sm:text-xs md:line-clamp-2 lg:text-sm">
        {cat.name}
      </span>
    </Link>
  );
}

function getYouTubeId(url = "") {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]+)/,
    /(?:youtu\.be\/)([\w-]+)/,
    /(?:youtube\.com\/embed\/)([\w-]+)/,
    /(?:youtube\.com\/shorts\/)([\w-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return url.includes("youtube") ? null : url;
}

export default function Home() {
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ["banners", "hero"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchHero();
      return data || [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const data = await useProductStore.getState().fetchCategories();
      return data?.filter((c) => !c.parent_id) || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: featuredProducts = [], isLoading: featuredLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const data = await useProductStore.getState().fetchFeatured(10);
      return data || [];
    },
  });

  const { data: trendingProducts = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["products", "trending"],
    queryFn: async () => {
      const data = await useProductStore.getState().fetchTrending(10);
      return data || [];
    },
  });

  const { data: topDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["products", "deals"],
    queryFn: async () => {
      const data = await useProductStore.getState().fetchDeals(10);
      return data?.products || [];
    },
  });

  const { data: activeSales = [] } = useQuery({
    queryKey: ["active-festival-sales"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchActiveSales();
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: midBanners = [] } = useQuery({
    queryKey: ["banners", "mid"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchMid();
      return data || [];
    },
  });

  const { data: offerBanners = [] } = useQuery({
    queryKey: ["banners", "offer"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchOffer();
      return data || [];
    },
  });

  const { data: activeOffers = [] } = useQuery({
    queryKey: ["active-offers"],
    queryFn: async () => {
      const data = await useOfferStore.getState().fetchActiveOffers();
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: sidebarBanners = [] } = useQuery({
    queryKey: ["banners", "sidebar"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchSidebar();
      return data || [];
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => {
      const data = await useBannerStore.getState().fetchVideos();
      return data || [];
    },
  });

  const [activeVideo, setActiveVideo] = useState(null);

  const { user, isAuthenticated } = useAuthStore();
  const [showWelcome, setShowWelcome] = useState(false);

  const { data: recentlyViewed = [], isLoading: recentlyLoading } = useQuery({
    queryKey: ["products", "recently-viewed"],
    queryFn: async () => {
      const data = await useProductStore.getState().fetchRecentlyViewed(10);
      return data || [];
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (isAuthenticated && localStorage.getItem("show_welcome") === "true") {
      setShowWelcome(true);
    }
  }, [isAuthenticated]);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.removeItem("show_welcome");
  };

  return (
    <>
      {showWelcome && <WelcomePopup user={user} onDismiss={dismissWelcome} />}

      <Helmet>
        <title>
          The Damini Edit - India's Favourite Marketplace | Best Deals Online
        </title>
        <meta
          name="description"
          content="Shop the best products at unbeatable prices on The Damini Edit. Electronics, Fashion, Home & Kitchen, Beauty, and more. Free shipping on orders above ₹499."
        />
      </Helmet>

      <div className="max-w-[1920px] mx-auto py-4 sm:py-8 lg:py-10 space-y-6 md:space-y-12">
        {/* Hero Banner */}
        <div className="px-4 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch">
            <div className="md:col-span-3">
              {bannersLoading ? (
                <SkeletonBanner />
              ) : (
                <HeroBanner banners={banners} />
              )}
            </div>
            <div className="hidden md:flex md:flex-col gap-3">
              {offerBanners.slice(0, 2).map((b) => {
                return (
                  <div
                    key={b.id}
                    className="relative overflow-hidden rounded-xl flex-1 min-h-0"
                    style={{
                      backgroundImage: `url(${b.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="relative z-10 flex flex-col justify-between p-4 md:p-5 text-white h-full">
                      <h3 className="text-xs lg:text-sm leading-tight">
                        {b.subtitle}
                      </h3>
                      <Link
                        to={b.link || "/products"}
                        className="group mt-4 hidden lg:flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-secondary-950 transition-all duration-300 hover:bg-accent-500"
                      >
                        {b.title}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Sidebar Banners */}
        {sidebarBanners.length > 0 && (
          <section className="mx-3 sm:mx-8 lg:mx-12">
            <Swiper
              modules={[Autoplay, Pagination]}
              spaceBetween={16}
              slidesPerView={1.2}
              loop={sidebarBanners.length > 1}
              autoplay={{ delay: 4000, disableOnInteraction: false }}
              // pagination={{ clickable: true }}
              breakpoints={{
                0: {
                  slidesPerView: 1.6,
                },
                320: {
                  slidesPerView: 1.8,
                },
                375: {
                  slidesPerView: 2,
                },
                480: {
                  slidesPerView: 2.2,
                },
                640: { slidesPerView: 2.4 },
                768: { slidesPerView: 3.4 },
                1024: { slidesPerView: 4.4 },
                1540: { slidesPerView: 5.4 },
              }}
            >
              {sidebarBanners.map((b) => (
                <SwiperSlide key={b.id}>
                  <Link
                    to={b.link || "/products"}
                    className="group relative block h-28 sm:h-36 md:h-40 xl:h-44 overflow-hidden rounded-xl bg-secondary-200"
                  >
                    <img
                      src={b.image}
                      alt={b.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    <div className="relative z-10 flex flex-col justify-end p-3 sm:p-4 h-full">
                      <h3 className="text-sm font-medium text-white line-clamp-2">
                        {b.title}
                      </h3>
                      {b.subtitle && (
                        <p className="mt-0.5 text-[10px] sm:text-xs text-secondary-200 line-clamp-1">
                          {b.subtitle}
                        </p>
                      )}
                    </div>
                  </Link>
                </SwiperSlide>
              ))}
            </Swiper>
          </section>
        )}
        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-white">
            <SectionHeader title="Shop by Category" link="/products" />
            <div className="flex gap-5 overflow-x-auto scrollbar-hide px-4 py-2 sm:px-8 lg:grid lg:grid-cols-8 lg:gap-6 lg:overflow-visible lg:px-12 xl:grid-cols-10">
              {categories
                .flatMap((cat) => {
                  const subs = cat.children || [];
                  return subs.length ? subs : [cat];
                })
                .map((t) => (
                  <CategoryPill key={t.id} cat={t} />
                ))}
            </div>
          </section>
        )}
        {/* Active Sale */}
        {activeSales.length > 0 && (
          <section className="mx-3 sm:mx-8 lg:mx-12">
            <Swiper
              modules={[Autoplay, Pagination]}
              spaceBetween={16}
              slidesPerView={1}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              // pagination={{ clickable: true }}
            >
              {activeSales.map((sale) => (
                <SwiperSlide key={sale.id}>
                  <div
                    className="relative h-[160px] sm:h-[220px] md:h-[300px] overflow-hidden rounded-2xl bg-cover bg-center shadow-lg"
                    style={{
                      backgroundImage: `url(${sale.banner})`,
                    }}
                  >
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/45 to-black/20" />

                    {/* Content */}
                    <div className="relative z-10 flex h-full justify-between px-5 sm:px-8 lg:px-12 sm:py-8 py-5">
                      {/* Left */}
                      <div className="h-full flex-1 max-w-2xl flex flex-col justify-between items-start">
                        {sale.name && sale.description && (
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-accent fill-accent" />
                            <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] md:text-xs text-white backdrop-blur">
                              {sale.name} {sale.description}
                            </span>
                          </div>
                        )}

                        <Link
                          to="/products?sort=sale_count&order=desc"
                          className="group inline-flex items-center mt-6 rounded-full bg-accent px-4 md:px-6 py-2 md:py-3.5 text-[10px] md:text-sm font-medium text-secondary-950 transition-all duration-300 hover:bg-accent-500 hover:shadow-lg"
                        >
                          Shop Now
                          <ArrowRight className="ml-2 h-3 w-3 md:h-4 md:w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </Link>
                      </div>

                      {/* Right */}
                      <div className="ml-3 sm:ml-5 lg:ml-8 flex shrink-0 flex-col items-end">
                        <div className="sm:mb-2 flex items-center gap-1 sm:gap-2 text-white">
                          <Clock
                            strokeWidth={1.5}
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5"
                          />
                          <span className="text-[10px] sm:text-xs lg:text-sm">
                            Offer Ends In
                          </span>
                        </div>

                        <div className="py-2">
                          <CountdownTimer targetDate={sale.ends_at} />
                        </div>

                        <span className="sm:mt-2 text-[8px] sm:text-xs lg:text-sm font-medium text-accent">
                          ⚡ Limited Time Offer
                        </span>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </section>
        )}
        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <section className="bg-white">
            <SectionHeader
              title="Featured Products"
              subtitle="Handpicked just for you"
              link="/products?is_featured=true"
            />
            {featuredLoading ? (
              <div className="px-3 sm:px-8 lg:px-12">
                <SkeletonProductGrid count={5} />
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 px-3 sm:px-8 lg:px-12">
                {featuredProducts.map((p) => (
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
                  No featured products available
                </p>
              </div>
            )}
          </section>
        )}
        {/* Best Sellers */}
        {topDeals.length > 0 && (
          <section className="bg-white">
            <SectionHeader
              title="Best Sellers"
              subtitle="Most popular products"
              link="/products?sort=sale_count&order=desc"
            />
            {dealsLoading ? (
              <div className="px-3 sm:px-8 lg:px-12">
                <SkeletonProductGrid count={5} />
              </div>
            ) : topDeals.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 px-3 sm:px-8 lg:px-12">
                {topDeals.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : null}
          </section>
        )}
        {/* Recently Viewed (logged-in users only, max 10) */}
        {isAuthenticated && recentlyViewed.length > 4 && (
          <section className="bg-white">
            <SectionHeader
              title="Recently Viewed"
              subtitle="Pick up where you left off"
              link="/products"
            />
            {recentlyLoading ? (
              <div className="px-3 sm:px-8 lg:px-12">
                <SkeletonProductGrid count={5} />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 px-3 sm:px-8 lg:px-12">
                {recentlyViewed.slice(0, 10).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        )}
        {/* Active Offers / Promotions */}
        {activeOffers.length > 0 && (
          <section className="bg-white">
            <SectionHeader
              title="Hot Offers & Promotions"
              subtitle="Grab these exclusive deals"
            />
            <div className="px-3 sm:px-8 lg:px-12">
              <Swiper
                modules={[Autoplay, Pagination]}
                slidesPerView={2}
                spaceBetween={12}
                loop={activeOffers.length > 1}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                breakpoints={{
                  640: { slidesPerView: 3, spaceBetween: 12 },
                  1024: { slidesPerView: 4, spaceBetween: 16 },
                  1280: { slidesPerView: 5, spaceBetween: 16 },
                }}
              >
                {activeOffers.map((offer) => (
                  <SwiperSlide key={offer.id}>
                    <Link
                      to="/products"
                      className="group block h-full overflow-hidden rounded-2xl bg-white border border-secondary-200 shadow-sm transition-all duration-300"
                    >
                      {offer.image ? (
                        <div className="h-28 sm:h-44 xl:h-60 overflow-hidden">
                          <img
                            src={offer.image}
                            alt={offer.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-16" />
                      )}
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center gap-1 sm:gap-2 mb-1">
                          {offer.badge_text && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-white bg-[#2874F0] px-1.5 sm:px-2 py-0.5 rounded">
                              {offer.badge_text}
                            </span>
                          )}
                          <span className="text-[9px] sm:text-[10px] font-semibold text-green-600 bg-green-50 px-1 sm:px-1.5 py-0.5 rounded">
                            {offer.type === "bogo"
                              ? `Buy ${offer.buy_quantity} Get ${offer.get_quantity}`
                              : offer.type === "percentage"
                                ? `${offer.discount_value}% Off`
                                : offer.type === "fixed"
                                  ? `₹${offer.discount_value} Off`
                                  : "Free Shipping"}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-semibold text-secondary-950 line-clamp-1">
                          {offer.title}
                        </h3>
                        {offer.description && (
                          <p className="text-[10px] sm:text-xs text-secondary-700 mt-0.5 line-clamp-1">
                            {offer.description}
                          </p>
                        )}
                        <p className="text-[10px] text-secondary-900 mt-1.5">
                          Until{" "}
                          {new Date(offer.valid_to).toLocaleDateString(
                            "en-IN",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    </Link>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </section>
        )}
        {midBanners.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-3 sm:px-8 lg:px-12">
            {midBanners.map((b, i) => {
              const gradients = [
                "from-blue-600 to-indigo-700",
                "from-pink-500 to-rose-600",
                "from-amber-500 to-orange-600",
              ];
              return (
                <div
                  key={b.id}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${
                    gradients[i % gradients.length]
                  } p-4 sm:p-6 shadow-lg transition-all duration-300 hover:shadow-xl`}
                >
                  <div className="relative flex items-center justify-between gap-5">
                    {/* Content */}
                    <div className="flex-1">
                      <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-[9px] sm:text-[11px] font-medium tracking-wide backdrop-blur">
                        Limited Offer
                      </span>

                      <h3 className="mt-3 text-sm sm:text-xl font-medium leading-tight">
                        {b.title}
                      </h3>

                      {b.subtitle && (
                        <p className="mt-1 max-w-[220px] text-xs sm:text-sm text-secondary-200">
                          {b.subtitle}
                        </p>
                      )}

                      <Link
                        key={b.id}
                        to={b.link || "/products"}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-[9px] sm:text-xs font-medium text-slate-900 transition-all group-hover:gap-3"
                      >
                        Shop Now
                        <span>→</span>
                      </Link>
                    </div>

                    {/* Product Image */}
                    <div className="relative shrink-0">
                      <div className="absolute inset-0 rounded-2xl bg-white/20 blur-xl" />

                      <img
                        src={b.image}
                        alt={b.title}
                        className="relative h-20 w-20 sm:h-28 sm:w-28 object-cover rounded-md transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Trending Products */}
        <section className="bg-white">
          <SectionHeader
            title="Trending Now"
            subtitle="What's hot this week"
            link="/products?sort=view_count&order=desc"
          />
          {trendingLoading ? (
            <div className="px-3 sm:px-8 lg:px-12">
              <SkeletonProductGrid count={5} />
            </div>
          ) : trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 px-3 sm:px-8 lg:px-12">
              {trendingProducts.map((p) => (
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
                No trending products available
              </p>
            </div>
          )}
        </section>
        {/* Featured Videos */}
        {videos.length > 0 && (
          <section className="bg-white">
            <SectionHeader
              title="Featured Videos"
              subtitle="Watch and shop with our video guides"
              icon={<Clapperboard className="h-5 w-5 text-primary" />}
            />
            <div className="px-3 sm:px-8 lg:px-12">
              <Swiper
                modules={[Autoplay]}
                spaceBetween={16}
                slidesPerView={1.15}
                loop={videos.length > 1}
                autoplay={{ delay: 4000, disableOnInteraction: false }}
                breakpoints={{
                  0: {
                    slidesPerView: 1.4,
                    spaceBetween: 12,
                  },

                  346: {
                    slidesPerView: 1.6,
                    spaceBetween: 12,
                  },
                  480: {
                    slidesPerView: 2,
                    spaceBetween: 14,
                  },
                  640: {
                    slidesPerView: 2.4,
                    spaceBetween: 16,
                  },
                  768: {
                    slidesPerView: 3,
                    spaceBetween: 18,
                  },
                  1024: {
                    slidesPerView: 4,
                    spaceBetween: 20,
                  },
                  1280: {
                    slidesPerView: 4.4,
                    spaceBetween: 22,
                  },
                  1540: {
                    slidesPerView: 6,
                    spaceBetween: 24,
                  },
                }}
              >
                {videos.map((v) => {
                  const vid = getYouTubeId(v.url);
                  return (
                    <SwiperSlide key={v.id}>
                      <button
                        onClick={() => vid && setActiveVideo(v)}
                        className="group relative block w-full overflow-hidden rounded-xl bg-secondary-200 aspect-[4/6]"
                      >
                        <img
                          src={
                            v.thumbnail ||
                            `https://i.ytimg.com/vi/${vid || ""}/hqdefault.jpg`
                          }
                          alt={v.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
                            <Play className="h-5 w-5 sm:h-6 sm:w-6 text-primary fill-primary translate-x-0.5" />
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-left">
                          <h3 className="text-sm sm:text-base font-normal text-white line-clamp-1">
                            {v.title}
                          </h3>
                          {v.description && (
                            <p className="mt-0.5 text-[10px] sm:text-xs text-secondary line-clamp-1">
                              {v.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          </section>
        )}
        {/* Video Modal */}
        {activeVideo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
            <div
              className="absolute inset-0 bg-black/80"
              onClick={() => setActiveVideo(null)}
            />
            <div className="relative w-full max-w-md">
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-secondary-200 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="overflow-hidden rounded-xl bg-black aspect-video shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(activeVideo.url)}?autoplay=1`}
                  title={activeVideo.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <p className="mt-3 text-white font-normal text-center sm:text-left">
                {activeVideo.title}
              </p>
            </div>
          </div>
        )}
        {/* Trust Section */}
        <section className="bg-white pt-4 p-8 sm:pt-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              {
                icon: ShieldCheck,
                title: "100% Authentic",
                desc: "Verified sellers & genuine products",
              },
              {
                icon: Truck,
                title: "Fast Delivery",
                desc: "Same day & next day delivery",
              },
              {
                icon: BadgeDollarSign,
                title: "Best Prices",
                desc: "Guaranteed lowest prices",
              },
              {
                icon: RefreshCw,
                title: "Easy Returns",
                desc: "7-day hassle-free returns",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-200">
                  <Icon
                    className="h-6 w-6 text-secondary-800"
                    strokeWidth={1}
                  />
                </div>

                <h3 className="text-sm font-medium text-secondary-950">
                  {title}
                </h3>
                <p className="mt-1 text-center text-xs text-secondary-700">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
