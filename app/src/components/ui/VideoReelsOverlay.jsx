import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  VideoOff,
  Smartphone,
} from "lucide-react";
import { useBannerStore } from "@/store/bannerStore";

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

function ReelCard({ video, isActive }) {
  const [muted, setMuted] = useState(true);
  const vid = getYouTubeId(video.url);

  if (!vid) return null;

  return (
    <div className="relative max-w-sm mx-auto h-full snap-start snap-always flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <iframe
        src={`https://www.youtube.com/embed/${vid}?autoplay=${isActive ? 1 : 0}&mute=${muted ? 1 : 0}&loop=1&playlist=${vid}&controls=0&modestbranding=1&rel=0&playsinline=1`}
        title={video.title}
        className="absolute inset-0 w-full h-full md:rounded-3xl"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ pointerEvents: "none" }}
      />

      <div className="absolute bottom-4 left-0 right-0 z-10 px-5 py-4">
        <h3 className="text-white text-sm leading-tight line-clamp-1">
          {video.title}
        </h3>

        {!video.description && (
          <p className="text-secondary-400 text-xs line-clamp-2">
            {video.description}
          </p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute bottom-5 right-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        {muted ? (
          <VolumeX strokeWidth={1.5} className="h-5 w-5" />
        ) : (
          <Volume2 strokeWidth={1.5} className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}

export default function VideoReelsOverlay({
  isOpen,
  onClose,
  initialIndex = 0,
}) {
  const [videos, setVideos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const containerRef = useRef(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const loadVideos = useCallback(
    async (pageNum) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await useBannerStore
          .getState()
          .fetchVideosPaginated(pageNum, 10);
        const newVideos = res.data || [];
        const pagination = res.pagination || {};

        if (pageNum === 1) {
          setVideos(newVideos);
        } else {
          setVideos((prev) => [...prev, ...newVideos]);
        }

        setHasMore(pagination.hasNextPage ?? newVideos.length === 10);
        setPage(pageNum + 1);
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [loading],
  );

  useEffect(() => {
    if (isOpen) {
      setVideos([]);
      setPage(1);
      setHasMore(true);
      setActiveIndex(initialIndex);
      loadVideos(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadVideos(page);
        }
      },
      { threshold: 0.5 },
    );

    observerRef.current = observer;
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [isOpen, hasMore, loading, page, loadVideos]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const handleScroll = () => {
      const { scrollTop, clientHeight } = container;
      const newIndex = Math.round(scrollTop / clientHeight);
      if (
        newIndex !== activeIndex &&
        newIndex >= 0 &&
        newIndex < videos.length
      ) {
        setActiveIndex(newIndex);
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activeIndex, videos.length]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        ref={containerRef}
        className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {videos.map((video, i) => (
          <div
            key={`${video.id}-${i}`}
            className="h-full w-full snap-start md:p-2"
          >
            <ReelCard video={video} isActive={i === activeIndex} />
          </div>
        ))}

        {hasMore && (
          <div
            ref={loadMoreRef}
            className="h-full w-full snap-start flex items-center justify-center"
          >
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-secondary text-sm">Loading more videos...</p>
              </div>
            )}
          </div>
        )}

        {!hasMore && videos.length > 0 && (
          <div className="flex flex-col items-center gap-3 p-8">
            <VideoOff strokeWidth={1} className="w-6 h-6 text-secondary" />
            <p className="text-secondary text-xs">No more videos</p>
          </div>
        )}

        {videos.length === 0 && !loading && (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-8">
            <Smartphone
              strokeWidth={1}
              className="w-10 h-10 sm:h-14 sm:w-14 text-secondary"
            />
            <p className="text-secondary text-xs sm:text-sm">
              No videos available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
