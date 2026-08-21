import { useState, useEffect } from "react";
import { Play, X, Clapperboard } from "lucide-react";
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

export default function FloatingVideoPlayer({ onClick }) {
  const [videos, setVideos] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    useBannerStore
      .getState()
      .fetchVideosPaginated(1, 10)
      .then((res) => {
        const list = res.data || [];
        setVideos(list);
        if (list.length > 0) {
          setCurrent(list[Math.floor(Math.random() * list.length)]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !current || videos.length === 0) return null;

  const vid = getYouTubeId(current.url);

  if (collapsed) {
    return (
      <div className="fixed bottom-[72px] md:bottom-4 right-4 z-50 animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-xl hover:bg-primary-600 transition-all duration-300 hover:scale-110"
        >
          <Clapperboard strokeWidth={1.5} className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-[72px] md:bottom-4 right-4 z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-700 ease-out"
      style={{ maxWidth: "200px" }}
    >
      <button
        onClick={onClick}
        className="bg-white w-32 md:w-48 h-44 md:h-72 group relative overflow-hidden rounded-xl shadow-2xl border transition-transform duration-300"
      >
        <img
          src={
            current.thumbnail ||
            (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "")
          }
          alt={current.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
            <Play className="h-4 w-4 text-primary fill-primary translate-x-0.5" />
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-[10px] font-medium line-clamp-2 leading-tight">
            {current.title}
          </p>
        </div>
        <div className="absolute top-1.5 right-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
            <Clapperboard className="h-3 w-3" />
          </span>
        </div>
        <div
          className="absolute top-1.5 left-1.5 z-10"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(true);
          }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
            <X className="h-3 w-3" />
          </span>
        </div>
      </button>
    </div>
  );
}
