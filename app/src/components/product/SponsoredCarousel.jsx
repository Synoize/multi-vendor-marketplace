import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import { useAdStore } from "@/store/adStore";
import ProductCard from "@/components/product/ProductCard";
import { SkeletonProductGrid } from "@/components/ui/SkeletonCard";
import "swiper/css";
import { useEffect, useRef } from "react";

function SectionHeader({ title, subtitle, link, linkText = "View All" }) {
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

export default function SponsoredCarousel({ limit = 8 }) {
  const impressed = useRef(new Set());

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["ads", "active"],
    queryFn: () => useAdStore.getState().fetchActiveAds(),
    staleTime: 60 * 1000,
  });

  const sponsored = ads.slice(0, limit).map((ad) => ({
    ...ad,
    isSponsored: true,
  }));

  useEffect(() => {
    const active = sponsored.length ? sponsored : [];
    active.forEach((ad) => {
      if (!ad.id || !ad.product_id) return;
      if (impressed.current.has(ad.id)) return;
      impressed.current.add(ad.id);
      useAdStore
        .getState()
        .trackImpression(ad.id, ad.product_id)
        .catch(() => {});
    });
  }, [sponsored]);

  const handleClick = (ad) => {
    if (!ad.id || !ad.product_id) return;
    useAdStore
      .getState()
      .trackClick(ad.id, ad.product_id)
      .catch(() => {});
  };

  if (isLoading) {
    return (
      <section className="bg-white py-6">
        <div className="px-3 sm:px-8 lg:px-12">
          <SkeletonProductGrid count={5} />
        </div>
      </section>
    );
  }

  if (sponsored.length === 0) return null;

  return (
    <section className="bg-white">
      <SectionHeader
        title="Sponsored Products"
        subtitle="Handpicked by our partners to elevate your shopping"
        link="/products"
      />
      <div className="px-3 sm:px-8 lg:px-12">
        <Swiper
          modules={[Autoplay]}
          slidesPerView={2}
          spaceBetween={12}
          loop={sponsored.length > 1}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 3, spaceBetween: 12 },
            1024: { slidesPerView: 4, spaceBetween: 16 },
            1280: { slidesPerView: 5, spaceBetween: 16 },
          }}
        >
          {sponsored.map((ad) => (
            <SwiperSlide key={ad.id}>
              <ProductCard
                product={ad}
                onClick={() => handleClick(ad)}
              />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
