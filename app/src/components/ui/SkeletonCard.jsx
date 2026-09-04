export function SkeletonCard() {
  return (
    <div className="bg-white rounded-sm border border-gray-100 overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        {/* <div className="h-3 bg-gray-200 rounded w-1/3" /> */}
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        {/* <div className="h-7 bg-gray-200 rounded w-full mt-2" /> */}
      </div>
    </div>
  );
}

export function SkeletonProductGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonText({ width = "w-full", height = "h-4" }) {
  return (
    <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`} />
  );
}

export function SkeletonBanner() {
  return (
    <div className="w-full h-48 md:h-80 bg-gray-200 rounded-lg animate-pulse" />
  );
}

export default SkeletonCard;
