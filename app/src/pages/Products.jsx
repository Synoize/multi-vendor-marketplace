import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  SearchX,
  Star,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { useProductStore } from "@/store/productStore";
import ProductCard from "@/components/product/ProductCard";
import { SkeletonProductGrid } from "@/components/ui/SkeletonCard";

const SORT_OPTIONS = [
  { label: "Relevance", value: "created_at:desc" },
  { label: "Price: Low to High", value: "price:asc" },
  { label: "Price: High to Low", value: "price:desc" },
  { label: "Highest Rated", value: "rating:desc" },
  { label: "Most Popular", value: "sale_count:desc" },
  { label: "Newest First", value: "created_at:desc" },
];

const filterOpenState = {};

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(
    filterOpenState[title] !== undefined ? filterOpenState[title] : defaultOpen,
  );
  return (
    <div className="border-b pb-4 mb-4 last:border-0">
      <button
        onClick={() => {
          const next = !open;
          filterOpenState[title] = next;
          setOpen(next);
        }}
        className="flex items-center justify-between w-full text-xs font-semibold text-secondary-800 mb-3"
      >
        {title}{" "}
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {open && children}
    </div>
  );
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [page, setPage] = useState(1);
  const [bannerOpen, setBannerOpen] = useState(true);

  const filters = {
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    vendor_id: searchParams.get("vendor_id") || "",
    store_name: searchParams.get("store_name") || "",
    min_price: searchParams.get("min_price") || "",
    max_price: searchParams.get("max_price") || "",
    min_rating: searchParams.get("min_rating") || "",
    in_stock: searchParams.get("in_stock") || "",
    sort: searchParams.get("sort") || "created_at",
    order: searchParams.get("order") || "desc",
  };

  const [priceRange, setPriceRange] = useState({
    min: filters.min_price,
    max: filters.max_price,
  });

  const [catParentSlug, setCatParentSlug] = useState("");

  useEffect(() => {
    // The filter panel renders twice (desktop sidebar + mobile drawer), so a
    // shared ref would only point at the last-mounted instance. Detect clicks
    // via data attributes instead so either instance stays open.
    const handler = (e) => {
      if (!e.target.closest("[data-sort-dropdown]")) {
        setShowSortDropdown(false);
      }
      const inCat = e.target.closest && e.target.closest("[data-cat-dropdown]");
      if (!inCat) {
        setShowCatDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    setPage(1);
    setSearchParams(params);
  };

  const clearFilter = (key) => {
    if (key === "store_name") {
      const params = new URLSearchParams(searchParams);
      params.delete("store_name");
      params.delete("vendor_id");
      setSearchParams(params);
      setPage(1);
    } else {
      updateFilter(key, "");
    }
  };

  const applySort = (sortValue) => {
    const [sort, order] = sortValue.split(":");
    const params = new URLSearchParams(searchParams);
    params.set("sort", sort);
    params.set("order", order);
    setSearchParams(params);
  };

  const currentSort = `${filters.sort}:${filters.order}`;

  const queryParams = new URLSearchParams({
    ...filters,
    page,
    limit: 20,
  }).toString();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["products", queryParams],
    queryFn: async () => {
      const r = await useProductStore.getState().fetchProducts(queryParams);
      return r.data;
    },
    keepPreviousData: true,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 20);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => useProductStore.getState().fetchCategories(),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const parent = categories.find(
      (c) =>
        !c.parent_id &&
        (c.slug === filters.category ||
          (c.children || []).some((s) => s.slug === filters.category)),
    );
    setCatParentSlug(parent?.slug || "");
    setBannerOpen(true);
  }, [filters.category, categories]);

  const activeCategoryBanner = useMemo(() => {
    if (!filters.category || !categories.length) return null;
    const parent = categories.find(
      (c) =>
        !c.parent_id &&
        (c.slug === filters.category ||
          (c.children || []).some((s) => s.slug === filters.category)),
    );
    if (parent?.banner) return parent.banner;
    if (parent?.children) {
      const sub = parent.children.find((s) => s.slug === filters.category);
      if (sub?.banner) return sub.banner;
    }
    return null;
  }, [filters.category, categories]);

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => useProductStore.getState().fetchBrands(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: priceStats } = useQuery({
    queryKey: ["price-stats"],
    queryFn: () => useProductStore.getState().fetchPriceStats(),
    staleTime: 10 * 60 * 1000,
  });

  const priceRanges = (() => {
    const max = Math.ceil((priceStats?.max_price || 5000) / 1000) * 1000;
    const step = Math.max(500, Math.round(max / 5 / 500) * 500);
    const ranges = [];
    let start = 0;
    while (start < max) {
      const end = start + step;
      if (start === 0) {
        ranges.push({
          label: `Under ₹${end.toLocaleString("en-IN")}`,
          min: "",
          max: end,
        });
      } else {
        ranges.push({
          label: `₹${start.toLocaleString("en-IN")} - ₹${end.toLocaleString("en-IN")}`,
          min: start,
          max: end,
        });
      }
      start = end;
    }
    ranges.push({
      label: `Above ₹${max.toLocaleString("en-IN")}`,
      min: max,
      max: "",
    });
    return ranges;
  })();

  const activeFiltersCount = [
    "category",
    "brand",
    "min_price",
    "max_price",
    "min_rating",
    "in_stock",
    "store_name",
  ].filter((k) => filters[k]).length;

  const activeCategoryName = (() => {
    if (!filters.category) return "";
    const top = categories.find((c) => c.slug === filters.category);
    if (top) return top.name;
    const parent = categories.find((c) =>
      (c.children || []).some((s) => s.slug === filters.category),
    );
    if (parent) {
      return parent.children.find((s) => s.slug === filters.category)?.name;
    }
    return filters.category;
  })();

  const FilterPanel = () => (
    <div>
      <div className="flex items-center justify-end mb-4">
        {activeFiltersCount > 0 && (
          <button
            onClick={() => {
              setSearchParams(
                new URLSearchParams(
                  filters.search ? { search: filters.search } : {},
                ),
              );
              setPage(1);
            }}
            className="text-red-500 text-xs font-medium hover:underline"
          >
            Clear All ({activeFiltersCount})
          </button>
        )}
      </div>

      <FilterSection title="Category" defaultOpen={false}>
        <div className="flex flex-col gap-3">
          <div className="relative" data-cat-dropdown>
            <button
              onClick={() => setShowCatDropdown(!showCatDropdown)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs outline-none transition-colors ${
                showCatDropdown
                  ? "border-secondary-600 bg-white"
                  : "border-secondary-200 bg-white hover:border-secondary-400"
              }`}
            >
              <span
                className={`truncate ${
                  catParentSlug
                    ? "font-medium text-secondary-900"
                    : "text-secondary-700"
                }`}
              >
                {categories.find((c) => c.slug === catParentSlug)?.name ||
                  "All Categories"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-secondary-800 transition-transform ${
                  showCatDropdown ? "rotate-180" : ""
                }`}
              />
            </button>
            {showCatDropdown && (
              <div className="absolute left-0 right-0 mt-1 z-20 max-h-60 overflow-y-auto rounded-lg border bg-white py-1 shadow-sm scrollbar-thin">
                <button
                  onClick={() => {
                    updateFilter("category", "");
                    setShowCatDropdown(false);
                  }}
                  className={`w-full truncate px-3 py-1.5 text-left text-xs transition-colors ${
                    !catParentSlug
                      ? "bg-secondary font-medium text-primary"
                      : "text-secondary-900 hover:bg-secondary"
                  }`}
                >
                  All Categories
                </button>
                {categories
                  .filter((c) => !c.parent_id)
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        updateFilter("category", cat.slug);
                        setShowCatDropdown(false);
                      }}
                      className={`w-full truncate px-3 py-1.5 text-left text-xs transition-colors ${
                        catParentSlug === cat.slug
                          ? "bg-secondary font-medium text-primary"
                          : "text-secondary-900 hover:bg-secondary"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {(() => {
            const parent = categories.find((c) => c.slug === catParentSlug);
            const subs = parent?.children || [];
            if (!parent || subs.length === 0) return null;
            return (
              <div className="flex flex-col gap-1">
                {subs.map((sub) => {
                  const subActive = filters.category === sub.slug;
                  return (
                    <button
                      key={sub.id}
                      onClick={() =>
                        updateFilter(
                          "category",
                          subActive ? parent.slug : sub.slug,
                        )
                      }
                      className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-1.5 text-left text-xs transition ${
                        subActive
                          ? "bg-primary text-white"
                          : "text-secondary-800 hover:bg-secondary"
                      }`}
                    >
                      {sub.image || sub.icon ? (
                        <img
                          src={sub.image || sub.icon}
                          alt=""
                          className="h-7 w-7 shrink-0 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                      <span className="truncate">{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="space-y-3">
          {priceRanges.map((price) => (
            <button
              key={price.label}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                if (price.min) params.set("min_price", price.min);
                else params.delete("min_price");
                if (price.max) params.set("max_price", price.max);
                else params.delete("max_price");
                params.delete("page");
                setPage(1);
                setSearchParams(params);
              }}
              className="w-full flex items-center justify-between rounded-lg border border-secondary-200 px-4 py-2 text-xs hover:bg-secondary transition"
            >
              <span>{price.label}</span>
              <span className="text-secondary-800">›</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Customer Ratings" defaultOpen={false}>
        {[4, 3, 2, 1].map((rating) => (
          <label
            key={rating}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-secondary"
          >
            <input
              type="radio"
              name="rating"
              checked={filters.min_rating === String(rating)}
              onChange={() =>
                updateFilter(
                  "min_rating",
                  filters.min_rating === String(rating) ? "" : rating,
                )
              }
              className="sr-only"
            />

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                {rating}
                <Star className="h-3 w-3 fill-white text-white" />
              </span>

              <span>&amp; above</span>
            </div>
          </label>
        ))}
      </FilterSection>

      {/* <FilterSection title="Availability">
        <label className="flex items-center gap-2 py-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.in_stock === "true"}
            onChange={(e) =>
              updateFilter("in_stock", e.target.checked ? "true" : "")
            }
            className="accent-primary"
          />
          <span className="text-sm text-gray-700">In Stock Only</span>
        </label>
      </FilterSection> */}

      <FilterSection title="Brand" defaultOpen={false}>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-2 ">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={filters.brand === brand.slug}
                  onChange={() =>
                    updateFilter(
                      "brand",
                      filters.brand === brand.slug ? "" : brand.slug,
                    )
                  }
                  className="accent-primary"
                />

                <span className="truncate text-xs">{brand.name}</span>
              </label>
            ))}
          </div>
        </div>
      </FilterSection>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>
          {filters.search
            ? `Search: "${filters.search}" -  The Damini Edit`
            : "All Products -  The Damini Edit Marketplace"}
        </title>
      </Helmet>

      <div className="max-w-[1920px] mx-auto min-h-[calc(100vh-100px)] px-3 sm:px-8 lg:px-12 py-4 sm:py-8 lg:py-10 ">
        <div className="flex gap-5">
          {/* Sidebar Filters (desktop) */}
          <aside className="hidden lg:block w-64 border-r flex-shrink-0">
            <div className="sticky top-24 pr-6">
              <FilterPanel />
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1 h-full flex flex-col">
            {/* Results Header */}
            <div
              className={`mb-2 lg:mb-0 ${filters.category || filters.store_name || filters.min_rating ? "" : "mb-4 sm:mb-8"} flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between`}
            >
              {/* Left */}
              <div className="flex-1 min-w-0">
                {filters.store_name ? (
                  <>
                    <p className="text-xs sm:text-sm text-secondary-900">
                      Showing products from{" "}
                      <span className="font-medium text-primary">
                        {filters.store_name}
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-secondary-700">
                      {total.toLocaleString("en-IN")} Products
                    </p>
                  </>
                ) : filters.search ? (
                  <p className="text-xs sm:text-sm text-secondary-900">
                    <span className="font-medium text-secondary-950">
                      {total.toLocaleString("en-IN")}
                    </span>{" "}
                    results for{" "}
                    <span className="font-medium text-primary max-w-[200px] line-clamp-1 truncate">
                      "{filters.search}"
                    </span>
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-secondary-900">
                    <span className="font-medium text-secondary-950">
                      {total.toLocaleString("en-IN")}
                    </span>{" "}
                    Products
                  </p>
                )}
              </div>

              {/* Right */}
              <div className="flex items-center justify-between gap-2">
                {/* Sort Dropdown */}
                <div className="relative" data-sort-dropdown>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex justify-between h-8 sm:h-10 w-40 items-center gap-2 rounded-lg border bg-white px-3 text-[11px] sm:text-xs outline-none transition-colors"
                  >
                    <span className="font-medium text-secondary-900">
                      {SORT_OPTIONS.find((o) => o.value === currentSort)
                        ?.label || "Sort"}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-secondary-800 transition-transform ${showSortDropdown ? "rotate-180" : ""}`}
                    />
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 mt-1 w-40 z-20 rounded-lg bg-white shadow-sm border py-1">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            applySort(opt.value);
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[11px] sm:text-xs transition-colors ${currentSort === opt.value ? "bg-secondary text-primary font-medium" : "text-secondary-900 hover:bg-secondary"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(true)}
                  className="flex lg:hidden h-8 sm:h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs sm:text-sm text-white"
                >
                  <span className="relative">
                    <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />

                    {activeFiltersCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-secondary-900 leading-none">
                        {activeFiltersCount > 9 ? "9+" : activeFiltersCount}
                      </span>
                    )}
                  </span>

                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Category Banner */}
            {activeCategoryBanner && (
              <div className={`relative ${bannerOpen && "sm:mt-4"}`}>
                <div
                  className={`flex justify-between gap-3 absolute z-20 ${bannerOpen && "p-2"}`}
                >
                  {/* Active Filters */}
                  {(filters.category ||
                    filters.store_name ||
                    filters.min_rating) && (
                    <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
                      {filters.category && (
                        <button
                          onClick={() => clearFilter("category")}
                          className="flex items-center gap-1 rounded-full bg-secondary px-1.5 py-1.5 text-[10px] sm:text-xs font-medium text-secondary-800 transition"
                        >
                          <p className="pl-1 pr-0.5">{activeCategoryName}</p>
                          <X className="h-3 w-3 text-secondary-600 hover:text-red-500" />
                        </button>
                      )}

                      {filters.store_name && (
                        <button
                          onClick={() => clearFilter("store_name")}
                          className="flex items-center gap-1 rounded-full bg-secondary px-1.5 py-1.5 text-[10px] sm:text-xs font-medium text-secondary-800 transition"
                        >
                          <p className="pl-1 pr-0.5">{filters.store_name}</p>

                          <X className="h-3 w-3 text-secondary-600 hover:text-red-500" />
                        </button>
                      )}

                      {filters.min_rating && (
                        <button
                          onClick={() => clearFilter("min_rating")}
                          className="flex items-center gap-1 rounded-full bg-secondary px-1.5 py-1.5 transition"
                        >
                          <div className="flex items-center pl-1 pr-0.5">
                            {Array.from({
                              length: Number(filters.min_rating),
                            }).map((_, index) => (
                              <Star
                                key={index}
                                className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                              />
                            ))}
                          </div>

                          <X className="h-3 w-3 text-secondary-600 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  )}
                  {!bannerOpen && (
                    <button
                      onClick={() => setBannerOpen(true)}
                      className="group flex h-7 w-8 items-center justify-center rounded-full bg-secondary text-secondary-800 transition-all duration-200 hover:bg-secondary-300"
                    >
                      <ChevronUp
                        strokeWidth={1.8}
                        className={`h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90`}
                      />
                    </button>
                  )}
                </div>
                {bannerOpen && (
                  <div className="relative mb-4 rounded-xl overflow-hidden">
                    <img
                      src={activeCategoryBanner}
                      alt="Category Banner"
                      className="w-full h-auto max-h-48 sm:max-h-80 object-cover"
                    />
                    <button
                      onClick={() => setBannerOpen(false)}
                      className="group absolute top-2 right-2 flex items-center rounded-full bg-black/50 backdrop-blur-sm px-1 py-1 text-[11px] font-medium text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronDown className="transition-transform duration-300 h-3 w-3 group-hover:rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Products Grid */}
            {isLoading || isFetching ? (
              <SkeletonProductGrid count={12} />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-2 bg-secondary-300 hover:bg-opacity-80 rounded text-xs font-medium disabled:opacity-60 transition-colors"
                    >
                      <ChevronLeft strokeWidth={1.5} className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, page - 2) + i;
                      return p <= totalPages ? (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 rounded text-xs sm:text-sm font-medium transition-colors ${page === p ? "bg-primary text-white" : "border border-gray-200 hover:text-primary"}`}
                        >
                          {p}
                        </button>
                      ) : null;
                    })}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-2 bg-secondary-300 hover:bg-opacity-80 rounded text-xs font-medium disabled:opacity-60 transition-colors"
                    >
                      <ChevronRight strokeWidth={1.5} className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full py-16 text-center">
                <SearchX
                  strokeWidth={1}
                  className="mx-auto h-12 w-12 text-secondary-800"
                />

                <h3 className="mt-4 text-lg font-medium text-secondary-950">
                  No products found
                </h3>

                <p className="mt-1 text-xs text-secondary-800">
                  Please check the applied filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Drawer (mobile) */}
      <div
        className={`fixed lg:hidden inset-0 z-[55] transition-opacity duration-300 ${
          showFilters
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50"
          onClick={() => setShowFilters(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 h-full w-72 sm:w-80 md:w-96 bg-white md:rounded-l-2xl shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
            showFilters ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4 sm:px-6 flex-shrink-0">
            <h3 className="text-lg font-medium text-secondary-950">Filters</h3>

            <button
              onClick={() => setShowFilters(false)}
              className="rounded-lg p-1 hover:bg-gray-100"
            >
              <X strokeWidth={1.5} className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:px-6 scrollbar-thin">
            <FilterPanel />
          </div>
        </div>
      </div>
    </>
  );
}
